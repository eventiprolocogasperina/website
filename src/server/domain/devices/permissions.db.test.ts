// Permessi dei dispositivi su un Postgres vero (npm run test:db): scelti con il QR e copiati sul
// dispositivo, modificabili dopo con effetto alla richiesta successiva, rifiutati dal server.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deviceCtx, type Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { auditLog, devicePairings, devices, ticketsV2 } from '@/server/db/schema';
import { saveRegister } from '@/server/domain/cash/registers';
import { sell } from '@/server/domain/cash/sales';
import { openSession } from '@/server/domain/cash/sessions';
import { voidSale } from '@/server/domain/cash/void';
import { revertCheckin, scan, searchTickets } from '@/server/domain/checkin';
import { DomainError } from '@/server/domain/errors';
import { createOrder } from '@/server/domain/orders';
import { buyer, createEdition, key, owner, roleOn, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { completePairing, createPairing, listDevices, updateDevice } from '.';

const enabled = !!process.env.TEST_DATABASE_URL;

async function errorOf(p: Promise<unknown>): Promise<{ code: string; message: string }> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return { code: e.code, message: e.message };
    throw e;
  }
  return { code: 'nessun errore', message: '' };
}

/** Come getFieldCtx: il dispositivo si rilegge dal database a ogni richiesta. */
async function ctxOf(deviceId: string): Promise<Ctx> {
  const [d] = await getDb().select().from(devices).where(eq(devices.id, deviceId));
  return deviceCtx({ id: d.id, name: d.name, edition: d.editionSlug, kind: d.kind, registerId: d.registerId, permissions: d.permissions as Permission[] | null }, null);
}

async function pair(input: Parameters<typeof createPairing>[1]) {
  const { token, pin } = await createPairing(owner, input);
  const { device } = await completePairing(token, pin, null);
  return device.id;
}

describe.skipIf(!enabled)('permessi dei dispositivi sul database', () => {
  let f: Fixture;
  let cassa1: string;
  let cassa2: string;
  let senzaAltro: string;

  beforeAll(async () => {
    f = await createEdition();
    ({ id: cassa1 } = await saveRegister(owner, f.slug, null, { name: 'Cassa 1', issuesNumbers: true, active: true, allowOpenAmount: true, productIds: null }));
    ({ id: cassa2 } = await saveRegister(owner, f.slug, null, { name: 'Cassa 2', issuesNumbers: false, active: true, allowOpenAmount: true, productIds: null }));
    ({ id: senzaAltro } = await saveRegister(owner, f.slug, null, { name: 'Bar', issuesNumbers: false, active: true, productIds: null }));
  });
  afterAll(async () => {
    await closeTestDb();
  });

  it('nome, persona, cassa e permessi del QR passano al dispositivo; il telefono non va nel registro', async () => {
    const { token, pin } = await createPairing(owner, {
      name: 'Cassa Anna',
      edition: f.slug,
      kind: 'pos',
      holderName: 'Anna',
      holderPhone: '333 1234567',
      registerId: cassa1,
      permissions: ['pos.reprint', 'pos.sell'],
    });
    const [pairing] = await getDb().select().from(devicePairings).where(eq(devicePairings.name, 'Cassa Anna'));
    expect(pairing).toMatchObject({ registerId: cassa1, holderName: 'Anna', permissions: ['pos.sell', 'pos.reprint'] });
    const { device } = await completePairing(token, pin, null);
    const [row] = await getDb().select().from(devices).where(eq(devices.id, device.id));
    expect(row).toMatchObject({ registerId: cassa1, holderName: 'Anna', holderPhone: '333 1234567', permissions: ['pos.sell', 'pos.reprint'] });
    const listed = (await listDevices(owner)).find((d) => d.id === device.id)!;
    expect(listed).toMatchObject({ registerName: 'Cassa 1', customPermissions: true });
    const logged = JSON.stringify(await getDb().select().from(auditLog).where(eq(auditLog.entityId, pairing.id)));
    expect(logged).toContain('pos.reprint');
    expect(logged).not.toContain('1234567');
  });

  it('rifiuta cassa mancante o di un’altra edizione, permessi di un altro ruolo, «Altro» su una cassa che non lo ha', async () => {
    const g = await createEdition();
    const { id: altrove } = await saveRegister(owner, g.slug, null, { name: 'Cassa G', issuesNumbers: true, active: true, productIds: null });
    const base = { name: 'Prova', edition: f.slug };
    expect((await errorOf(createPairing(owner, { ...base, kind: 'pos' }))).message).toMatch(/Scegli la cassa/);
    expect((await errorOf(createPairing(owner, { ...base, kind: 'pos', registerId: altrove }))).message).toMatch(/non è di questa edizione/);
    expect((await errorOf(createPairing(owner, { ...base, kind: 'scanner', permissions: ['pos.void'] }))).code).toBe('VALIDATION');
    expect((await errorOf(createPairing(owner, { ...base, kind: 'pos', registerId: cassa1, permissions: ['users.manage'] }))).code).toBe('VALIDATION');
    expect((await errorOf(createPairing(owner, { ...base, kind: 'pos', registerId: senzaAltro, permissions: ['pos.sell', 'pos.open_amount'] }))).message).toMatch(/«Altro» è spento su Bar/);
    expect((await errorOf(createPairing(roleOn('event_manager', f.slug), { ...base, kind: 'scanner' }))).code).toBe('FORBIDDEN');
  });

  it('cassa assegnata: turno e vendite solo su quella', async () => {
    const id = await pair({ name: 'Telefono 1', edition: f.slug, kind: 'pos', registerId: cassa1, permissions: ['pos.sell', 'pos.open_close_session'] });
    const phone = await ctxOf(id);
    expect((await errorOf(openSession(phone, { registerId: cassa2, openingFloatCents: 0 }))).message).toMatch(/un’altra cassa/);
    await openSession(phone, { registerId: cassa1, openingFloatCents: 0 });
    const other = await openSession(owner, { registerId: cassa2, openingFloatCents: 0 });
    expect((await errorOf(sell(phone, { cashSessionId: other.sessionId, lines: [{ productId: f.drink.id, quantity: 1 }], method: 'cash', idempotencyKey: key() }))).message).toMatch(/un’altra cassa/);
  });

  it('la modifica vale alla richiesta successiva: annullo senza permesso → PIN di un responsabile, con il permesso → subito', async () => {
    const id = await pair({ name: 'Telefono 2', edition: f.slug, kind: 'pos', registerId: cassa1, permissions: ['pos.sell'] });
    let phone = await ctxOf(id);
    const { sessionId } = await openSession(owner, { registerId: cassa1, openingFloatCents: 0 });
    const sold = await sell(phone, { cashSessionId: sessionId, lines: [{ productId: f.drink.id, quantity: 1 }], method: 'cash', idempotencyKey: key() });
    expect((await errorOf(voidSale(phone, { orderId: sold.orderId, reason: 'Prova annullo' }))).message).toMatch(/PIN di un responsabile/);
    expect((await errorOf(sell(phone, { cashSessionId: sessionId, lines: [{ productId: f.drink.id, quantity: 1 }], method: 'complimentary', complimentaryReason: 'Sponsor', idempotencyKey: key() }))).message).toMatch(/omaggi/);
    expect((await errorOf(sell(phone, { cashSessionId: sessionId, lines: [{ openAmountCents: 250, quantity: 1 }], method: 'cash', idempotencyKey: key() }))).message).toMatch(/«Altro»/);

    await updateDevice(owner, id, { name: 'Telefono 2', holderName: 'Bruno', registerId: cassa1, permissions: ['pos.sell', 'pos.void', 'pos.complimentary'] });
    phone = await ctxOf(id);
    expect(can(phone, 'pos.void', { edition: f.slug })).toBe(true);
    expect(await voidSale(phone, { orderId: sold.orderId, reason: 'Prova annullo' })).toEqual({ refundedCents: f.drink.priceCents });
    await sell(phone, { cashSessionId: sessionId, lines: [{ productId: f.drink.id, quantity: 1 }], method: 'complimentary', complimentaryReason: 'Sponsor', idempotencyKey: key() });

    const actions = (await getDb().select().from(auditLog).where(eq(auditLog.entityId, id))).map((a) => a.action);
    expect(actions).toContain('device.permissions_changed');
    // Dall'edizione sbagliata non si modifica.
    expect((await errorOf(updateDevice(owner, id, { name: 'X1', registerId: cassa1 }, { edition: 'altra' }))).code).toBe('NOT_FOUND');
  });

  it('varco senza «annullare un ingresso» né «cercare per nome»: il server rifiuta', async () => {
    const id = await pair({ name: 'Varco 1', edition: f.slug, kind: 'scanner', permissions: ['checkin.scan'] });
    const gate = await ctxOf(id);
    const r = await createOrder(owner, { editionId: f.edition.id, channel: 'admin', payNow: 'cash', customer: buyer, idempotencyKey: key(), lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }] });
    const [ticket] = await getDb().select().from(ticketsV2).where(eq(ticketsV2.orderId, r.id));
    const res = await scan(gate, { qrToken: ticket.qrToken, checkinListId: f.entrance.id });
    expect(res.result).toBe('valid');
    if (res.result !== 'valid') return;
    expect((await errorOf(revertCheckin(gate, { checkinId: res.checkinId }))).code).toBe('FORBIDDEN');
    expect((await errorOf(searchTickets(gate, { checkinListId: f.entrance.id, q: 'Rossi' }))).code).toBe('FORBIDDEN');

    await updateDevice(owner, id, { name: 'Varco 1', permissions: ['checkin.scan', 'checkin.revert'] });
    await revertCheckin(await ctxOf(id), { checkinId: res.checkinId });
  });

  it('un dispositivo abbinato prima dei permessi vale ancora come il ruolo', async () => {
    const [d] = await getDb().insert(devices).values({ name: 'Vecchio', tokenHash: key(), editionSlug: f.slug, kind: 'scanner' }).returning();
    const ctx = await ctxOf(d.id);
    expect(ctx.grants).toEqual([{ role: 'gate', edition: f.slug }]);
    expect(can(ctx, 'checkin.revert', { edition: f.slug })).toBe(true);
    expect((await listDevices(owner)).find((x) => x.id === d.id)).toMatchObject({ customPermissions: false, permissions: ['checkin.scan', 'checkin.revert', 'checkin.search', 'checkin.stats'] });
  });
});
