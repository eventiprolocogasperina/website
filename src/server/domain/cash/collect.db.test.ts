// Ordini "Paga in loco" su un Postgres vero: al varco escono "Da pagare" e non entrano; si incassano
// al varco solo con checkin.collect_payment e in cassa con pos.sell; l'importo è quello del server;
// l'incasso finisce nel turno (Z) con la riga di cassa; il reinvio non incassa due volte.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deviceCtx, type Ctx } from '@/server/auth/context-shared';
import type { Permission } from '@/server/auth/permissions';
import { auditLog, cashSales, checkins, devices, ordersV2, payments, ticketsV2 } from '@/server/db/schema';
import { checkinGroup, collectAtGate, scan, scannerSetup } from '@/server/domain/checkin';
import { DomainError } from '@/server/domain/errors';
import { confirmDraftOrder, createDraftOrder } from '@/server/domain/orders/drafts';
import { buyer, createEdition, key, owner, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { collectPayOnSite, collectQuote, searchPayOnSite } from './collect';
import { saveRegister } from './registers';
import { openSession, sessionSummary } from './sessions';

const enabled = !!process.env.TEST_DATABASE_URL;

async function errorOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    throw e;
  }
  return 'nessun errore';
}

describe.skipIf(!enabled)('paga in loco: incasso in cassa e al varco', () => {
  let f: Fixture;
  let registerId: string;
  let shiftId: string;
  let till: Ctx;

  async function device(kind: 'pos' | 'scanner', permissions: Permission[], registerId: string | null = null): Promise<Ctx> {
    const name = `${kind}-${randomUUID().slice(0, 6)}`;
    const [d] = await getDb().insert(devices).values({ name, tokenHash: randomUUID(), editionSlug: f.slug, kind, permissions }).returning();
    return deviceCtx({ id: d.id, name, edition: f.slug, kind, registerId, permissions }, null);
  }
  /** Bozza da 2 ingressi (10 €) confermata "Paga in loco": in attesa, senza scadenza, con i biglietti. */
  async function onSiteOrder() {
    const d = await createDraftOrder(owner, { editionId: f.edition.id, lines: [{ productId: f.ticket.id, quantity: 2, sessionId: f.day2.id }], customer: buyer, idempotencyKey: key() });
    const c = await confirmDraftOrder(owner, { orderId: d.id, mode: 'on_site' });
    expect(c.status).toBe('pending');
    const tickets = await getDb().select().from(ticketsV2).where(eq(ticketsV2.orderId, d.id));
    expect(tickets).toHaveLength(2);
    return { id: d.id, code: c.code, ticketId: tickets[0].id };
  }
  const gateScan = (ctx: Ctx, ticketId: string) => scan(ctx, { ticketId, checkinListId: f.entrance.id, sessionId: f.day2.id });
  const atGate = (ctx: Ctx, ticketId: string, over: Record<string, unknown> = {}) =>
    collectAtGate(ctx, { ticketId, checkinListId: f.entrance.id, sessionId: f.day2.id, method: 'cash', idempotencyKey: key(), expectedDueCents: 1000, ...over });

  beforeAll(async () => {
    f = await createEdition();
    ({ id: registerId } = await saveRegister(owner, f.slug, null, { name: 'Cassa ingresso', issuesNumbers: true, active: true, productIds: null }));
    till = await device('pos', ['pos.sell', 'pos.open_close_session'], registerId);
    ({ sessionId: shiftId } = await openSession(till, { registerId, openingFloatCents: 5000 }));
  });
  afterAll(async () => {
    await closeTestDb();
  });

  it('al varco un ordine Paga in loco non entra: esce "Da pagare" con l’importo del server', async () => {
    const o = await onSiteOrder();
    const gate = await device('scanner', ['checkin.scan']);
    const r = await gateScan(gate, o.ticketId);
    expect(r).toMatchObject({ result: 'to_pay', dueCents: 1000 });
    expect(await getDb().select().from(checkins).where(eq(checkins.ticketId, o.ticketId))).toHaveLength(0);
    expect((await scannerSetup(gate, f.slug)).permissions.collect).toBe(false);
  });

  it('varco senza checkin.collect_payment: "Da pagare in cassa", l’incasso si rifiuta', async () => {
    const o = await onSiteOrder();
    // Anche con «Vendere all'ingresso» (pos.sell) serve il permesso apposta.
    const gate = await device('scanner', ['checkin.scan', 'pos.sell']);
    expect((await collectQuote(gate, o.id, 'varco')).problem).toBe('Da pagare in cassa: questo dispositivo non può incassare.');
    expect(await errorOf(atGate(gate, o.ticketId))).toBe('FORBIDDEN');
    expect((await getDb().select().from(ordersV2).where(eq(ordersV2.id, o.id)))[0].status).toBe('pending');
    expect(await getDb().select().from(payments).where(eq(payments.orderId, o.id))).toHaveLength(0);
  });

  it('varco con il permesso: incassa sul turno aperto, l’ordine è pagato e si apre per la conferma di gruppo; il reinvio non incassa due volte', async () => {
    const o = await onSiteOrder();
    const gate = await device('scanner', ['checkin.scan', 'checkin.collect_payment']);
    expect((await scannerSetup(gate, f.slug)).permissions.collect).toBe(true);
    const quote = await collectQuote(gate, o.id, 'varco');
    expect(quote).toMatchObject({ dueCents: 1000, problem: null, shifts: [{ cashSessionId: shiftId, register: 'Cassa ingresso' }] });

    // Importo vecchio sul telefono: PRICE_CHANGED, niente incasso.
    expect(await errorOf(atGate(gate, o.ticketId, { expectedDueCents: 900 }))).toBe('PRICE_CHANGED');

    const idempotencyKey = key();
    const r = await atGate(gate, o.ticketId, { idempotencyKey, method: 'card_pos' });
    expect(r.collected).toMatchObject({ amountCents: 1000, method: 'card_pos', register: 'Cassa ingresso', duplicate: false });
    // Dopo l'incasso nessuno entra ancora: l'ordine si apre con i due biglietti da confermare.
    if (r.scan.result !== 'order') throw new Error(r.scan.result);
    expect(r.scan.tickets.map((t) => t.state)).toEqual(['ready', 'ready']);
    expect(await getDb().select().from(checkins).where(eq(checkins.ticketId, o.ticketId))).toHaveLength(0);
    const [order] = await getDb().select().from(ordersV2).where(eq(ordersV2.id, o.id));
    expect(order.status).toBe('paid');
    const pays = await getDb().select().from(payments).where(eq(payments.orderId, o.id));
    expect(pays).toEqual([expect.objectContaining({ method: 'card_pos', amountCents: 1000, status: 'succeeded', cashSessionId: shiftId })]);
    const actions = (await getDb().select({ a: auditLog.action }).from(auditLog).where(eq(auditLog.entityId, o.id))).map((x) => x.a);
    expect(actions).toEqual(expect.arrayContaining(['payment.recorded', 'order.collected_on_site']));

    // Stesso tocco reinviato: nessun secondo pagamento, torna l'ordine da confermare.
    const again = await atGate(gate, o.ticketId, { idempotencyKey, method: 'card_pos' });
    expect(again.collected).toBeNull();
    expect(again.scan.result).toBe('order');
    const entered = await checkinGroup(gate, { checkinListId: f.entrance.id, sessionId: f.day2.id, items: r.scan.tickets.map((t) => ({ ticketId: t.id })) });
    expect(entered.entered).toHaveLength(2);
    expect((await atGate(gate, o.ticketId, { idempotencyKey, method: 'card_pos' })).scan.result).toBe('already_used');
    expect(await errorOf(collectPayOnSite(gate, { orderId: o.id, method: 'cash', idempotencyKey: key(), expectedDueCents: 1000 }, { via: 'varco' }))).toBe('CONFLICT');
    expect(await getDb().select().from(payments).where(eq(payments.orderId, o.id))).toHaveLength(1);
  });

  it('in cassa: cerca per codice o nome, incassa nel turno (Z), importo sempre dal server', async () => {
    const o = await onSiteOrder();
    const found = await searchPayOnSite(till, f.slug, 'mario');
    expect(found.find((x) => x.orderId === o.id)).toMatchObject({ code: o.code, name: 'Mario Rossi', dueCents: 1000, summary: '2× Ingresso' });
    expect((await searchPayOnSite(till, f.slug, o.code.slice(-4))).some((x) => x.orderId === o.id)).toBe(true);
    // Uno scanner non cerca tra gli ordini da incassare della cassa.
    expect(await errorOf(searchPayOnSite(await device('scanner', ['checkin.scan', 'checkin.collect_payment']), f.slug, ''))).toBe('FORBIDDEN');

    const before = await sessionSummary(owner, shiftId);
    // Il telefono dice 1 €: il server non si fida e rifiuta.
    expect(await errorOf(collectPayOnSite(till, { orderId: o.id, cashSessionId: shiftId, method: 'cash', idempotencyKey: key(), expectedDueCents: 100 }, { via: 'cassa' }))).toBe('PRICE_CHANGED');
    const r = await collectPayOnSite(till, { orderId: o.id, cashSessionId: shiftId, method: 'cash', cashReceivedCents: 2000, idempotencyKey: key(), expectedDueCents: 1000 }, { via: 'cassa' });
    expect(r).toMatchObject({ amountCents: 1000, changeCents: 1000, duplicate: false });
    expect((await getDb().select().from(cashSales).where(eq(cashSales.orderId, o.id)))[0]).toMatchObject({ cashSessionId: shiftId, registerId, cashReceivedCents: 2000, changeCents: 1000 });

    const after = await sessionSummary(owner, shiftId);
    const cash = (s: typeof after) => s.totals.byMethod.find((m) => m.method === 'cash')!.amountCents;
    expect(cash(after) - cash(before)).toBe(1000);
    expect(after.expectedCashCents - before.expectedCashCents).toBe(1000);
    expect(after.totals.sales - before.totals.sales).toBe(1);
    expect((await searchPayOnSite(till, f.slug, o.code)).length).toBe(0);
    expect((await gateScan(await device('scanner', ['checkin.scan']), o.ticketId)).result).toBe('valid');
  });

  it('una bozza o un ordine non "Paga in loco" non si incassano da qui', async () => {
    const d = await createDraftOrder(owner, { editionId: f.edition.id, lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }], customer: buyer, idempotencyKey: key() });
    expect(await errorOf(collectPayOnSite(till, { orderId: d.id, cashSessionId: shiftId, method: 'cash', idempotencyKey: key(), expectedDueCents: 500 }, { via: 'cassa' }))).toBe('CONFLICT');
  });
});
