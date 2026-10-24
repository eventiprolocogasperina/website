// Pulsanti dello scanner a pagamento (es. "+1 Bambino" con l'ingresso bambino) su un Postgres vero:
// prezzo dal server, vendita pos sul turno di cassa, conteggio nella stessa transazione, reinvio
// idempotente, turno mancante, profilo senza cassa, prodotto gratuito. Più la blacklist che vince.
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Ctx } from '@/server/auth/context-shared';
import { attendeeAnswers, auditLog, cashSales, devices, ordersV2, payments, products, ticketsV2 } from '@/server/db/schema';
import { saveRegister } from '@/server/domain/cash/registers';
import { openSession } from '@/server/domain/cash/sessions';
import { saveModuleSettings } from '@/server/domain/editions/modules';
import { DomainError } from '@/server/domain/errors';
import { createOrder } from '@/server/domain/orders';
import { buyer, createEdition, key, owner, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { payScannerAction, scan, scannerActionQuote, scannerSetup } from './index';

const enabled = !!process.env.TEST_DATABASE_URL;

async function errorOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return `${e.code}: ${e.message}`;
    throw e;
  }
  return 'nessun errore';
}

describe.skipIf(!enabled)('scanner: pulsanti a pagamento', () => {
  let f: Fixture;
  let child: typeof products.$inferSelect;
  let registerId: string;
  let gateOnly: Ctx;
  let gateCashier: Ctx;

  async function phone(name: string, roles: Array<'gate' | 'cashier'>): Promise<Ctx> {
    const [d] = await getDb().insert(devices).values({ name, tokenHash: randomUUID(), editionSlug: f.slug, kind: 'scanner' }).returning();
    return { user: null, device: { id: d.id, name, edition: f.slug, kind: 'scanner' }, legacy: false, grants: roles.map((role) => ({ role, edition: f.slug })), ip: null };
  }
  async function order() {
    const r = await createOrder(owner, { editionId: f.edition.id, channel: 'admin', payNow: 'cash', customer: buyer, idempotencyKey: key(), lines: [{ productId: f.ticket.id, quantity: 2, sessionId: f.day2.id }] });
    return r.id;
  }
  const counters = (over: Record<string, unknown>) =>
    saveModuleSettings(owner, f.slug, { module: 'activities', settings: { scannerCounters: [{ label: '+1 Bambino', questionKey: 'bambini', increment: 1, ...over }] } });
  const pay = (ctx: Ctx, orderId: string, over: Record<string, unknown> = {}) =>
    payScannerAction(ctx, { orderId, actionKey: 'counter-0', method: 'cash', idempotencyKey: key(), expectedTotalCents: 400, ...over });
  const children = async (orderId: string) => {
    const [a] = await getDb().select().from(attendeeAnswers).where(and(eq(attendeeAnswers.orderId, orderId), eq(attendeeAnswers.questionKey, 'bambini')));
    return a?.value ?? null;
  };

  beforeAll(async () => {
    f = await createEdition();
    [child] = await getDb()
      .insert(products)
      .values({ editionId: f.edition.id, kind: 'ticket', name: 'Ingresso bambino', priceCents: 400, channels: ['pos'], requiresSession: true, issuesTicket: true })
      .returning();
    ({ id: registerId } = await saveRegister(owner, f.slug, null, { name: 'Cassa ingresso', issuesNumbers: true, active: true, productIds: null }));
    gateOnly = await phone('Varco 1', ['gate']);
    gateCashier = await phone('Varco 2', ['gate', 'cashier']);
  });
  afterAll(async () => {
    await closeTestDb();
  });

  it('senza prodotto il pulsante conta e basta, come prima', async () => {
    await counters({});
    const id = await order();
    expect(await scannerActionQuote(gateOnly, { orderId: id, actionKey: 'counter-0' })).toEqual({ paid: false });
    expect(await pay(gateOnly, id)).toMatchObject({ after: 1, sale: null });
  });

  it('prodotto gratuito: solo conteggio, nessuna vendita', async () => {
    const [free] = await getDb().insert(products).values({ editionId: f.edition.id, kind: 'addon', name: 'Gadget', priceCents: 0, channels: ['pos'] }).returning();
    await counters({ productId: free.id, registerId });
    const id = await order();
    expect((await scannerSetup(gateOnly, f.slug)).actions[0].paid).toBeNull();
    expect(await pay(gateOnly, id)).toMatchObject({ after: 1, sale: null });
  });

  it('a pagamento: il popup mostra prezzo dal server; senza ruolo cassa o senza turno aperto non incassa e non conta', async () => {
    await counters({ productId: child.id, registerId });
    const id = await order();
    expect((await scannerSetup(gateOnly, f.slug)).actions[0].paid).toEqual({ name: 'Ingresso bambino', priceCents: 400 });

    const q1 = await scannerActionQuote(gateOnly, { orderId: id, actionKey: 'counter-0' });
    expect(q1).toMatchObject({ paid: true, product: { name: 'Ingresso bambino', priceCents: 400 }, cashSessionId: null });
    expect(q1.paid && q1.problem).toMatch(/ruolo Cassa/);
    expect(await errorOf(pay(gateOnly, id))).toMatch(/^FORBIDDEN/);

    const q2 = await scannerActionQuote(gateCashier, { orderId: id, actionKey: 'counter-0' });
    expect(q2.paid && q2.problem).toMatch(/Nessun turno aperto sulla cassa «Cassa ingresso»/);
    expect(await errorOf(pay(gateCashier, id))).toMatch(/^CONFLICT: Nessun turno aperto/);
    expect(await children(id)).toBeNull();
  });

  it('incassa in contanti: vendita pos legata all’ordine e al turno, conteggio +1, registro; reinvio non duplica', async () => {
    await counters({ productId: child.id, registerId });
    const { sessionId } = await openSession(owner, { registerId, openingFloatCents: 2000 });
    const id = await order();
    expect(await scannerActionQuote(gateCashier, { orderId: id, actionKey: 'counter-0' })).toMatchObject({ register: 'Cassa ingresso', cashSessionId: sessionId, problem: null });

    // Prezzo vecchio sul telefono: il server decide, PRICE_CHANGED e niente conteggio.
    expect(await errorOf(pay(gateCashier, id, { expectedTotalCents: 300 }))).toMatch(/^PRICE_CHANGED/);
    expect(await children(id)).toBeNull();

    const idempotencyKey = key();
    const r = await pay(gateCashier, id, { idempotencyKey });
    expect(r).toMatchObject({ questionKey: 'bambini', before: 0, after: 1, sale: { totalCents: 400, method: 'cash', register: 'Cassa ingresso' } });
    const [sale] = await getDb().select().from(ordersV2).where(eq(ordersV2.code, r.sale!.code));
    expect(sale).toMatchObject({ channel: 'pos', status: 'paid', parentOrderId: id, cashSessionId: sessionId, sessionId: f.day2.id, totalCents: 400 });
    expect(await getDb().select().from(cashSales).where(eq(cashSales.orderId, sale.id))).toHaveLength(1);
    const [p] = await getDb().select().from(payments).where(eq(payments.orderId, sale.id));
    expect(p).toMatchObject({ method: 'cash', amountCents: 400, cashSessionId: sessionId });
    expect(await getDb().select().from(ticketsV2).where(eq(ticketsV2.orderId, sale.id))).toHaveLength(1);
    const [log] = await getDb().select().from(auditLog).where(and(eq(auditLog.entityId, id), eq(auditLog.action, 'order.scanner_action')));
    expect(log.after).toMatchObject({ bambini: 1, vendita: sale.code, importo: 400 });

    // Rete ballerina: stessa chiave → stessa vendita, conteggio invariato.
    expect(await pay(gateCashier, id, { idempotencyKey })).toMatchObject({ after: 1, sale: { code: sale.code } });
    expect(await children(id)).toBe(1);

    // Carta POS: seconda vendita, conteggio 2.
    expect(await pay(gateCashier, id, { method: 'card_pos' })).toMatchObject({ after: 2, sale: { method: 'card_pos' } });
  });

  it('senza cassa indicata usa il turno aperto da questo telefono', async () => {
    await counters({ productId: child.id, registerId: null });
    const id = await order();
    const q = await scannerActionQuote(gateCashier, { orderId: id, actionKey: 'counter-0' });
    expect(q.paid && q.problem).toMatch(/Questo telefono non ha un turno di cassa aperto/);
    const { id: reg2 } = await saveRegister(owner, f.slug, null, { name: 'Cassa varco 2', issuesNumbers: false, active: true, productIds: null });
    await openSession(gateCashier, { registerId: reg2, openingFloatCents: 0 });
    expect(await pay(gateCashier, id)).toMatchObject({ after: 1, sale: { register: 'Cassa varco 2', number: null } });
  });

  it('ordine in blacklist: bloccato anche se è stato annullato (la blacklist vince)', async () => {
    const id = await order();
    await getDb().update(ordersV2).set({ isBlacklisted: true, status: 'cancelled' }).where(eq(ordersV2.id, id));
    const [t] = await getDb().select().from(ticketsV2).where(eq(ticketsV2.orderId, id));
    expect((await scan(gateOnly, { qrToken: t.qrToken, checkinListId: f.entrance.id })).result).toBe('blocked');
  });
});
