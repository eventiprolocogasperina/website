// Ordini in bozza dall'admin su un Postgres vero: non tengono posti, si modificano, si confermano nei
// quattro modi (pay-link, in loco, contanti, omaggio) e la conferma ricontrolla i posti.
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditLog, discountsV2, emailLog, orderNotes, ordersV2, payments, products, sessions, ticketsV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { cancelOrder, createOrder } from '@/server/domain/orders';
import { buyer, createDiscount, createEdition, key, owner, roleOn, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { markOrderPaid } from './admin';
import { confirmDraftOrder, createDraftOrder, updateDraftOrder } from './drafts';
import { soldCounts } from './shared';
import { soldKey } from '@/server/domain/quotas/availability';

const enabled = !!process.env.TEST_DATABASE_URL;

async function errorOf(p: Promise<unknown>): Promise<{ code: string; message?: string }> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return { code: e.code, message: e.message };
    if ((e as { name?: string }).name === 'ZodError') return { code: 'ZOD' };
    throw e;
  }
  return { code: 'nessun errore' };
}

describe.skipIf(!enabled)('ordini in bozza', () => {
  let f: Fixture;
  const db = () => getDb();
  const draft = (quantity = 2, over: Partial<Parameters<typeof createDraftOrder>[1]> = {}) =>
    createDraftOrder(owner, { editionId: f.edition.id, lines: [{ productId: f.ticket.id, quantity, sessionId: f.day1.id }], customer: buyer, idempotencyKey: key(), ...over });
  const row = async (id: string) => (await db().select().from(ordersV2).where(eq(ordersV2.id, id)))[0];
  const actions = async (id: string) => (await db().select({ action: auditLog.action }).from(auditLog).where(eq(auditLog.entityId, id))).map((r) => r.action);

  beforeAll(async () => {
    f = await createEdition();
    // Il pay-link vende solo i prodotti con quel canale.
    await db().update(products).set({ channels: ['online', 'pos', 'invite', 'paylink'] }).where(eq(products.id, f.ticket.id));
  });
  afterAll(async () => {
    await closeTestDb();
  });

  it('una bozza non tiene posti, non ha biglietti né pagamenti, non consuma lo sconto, ha la nota', async () => {
    const promo = await createDiscount({ code: `B${Date.now()}`.slice(0, 12), editionId: f.edition.id });
    const d = await draft(2, { discountCode: promo.code, note: 'Prenotazione al telefono' });
    expect(d.status).toBe('draft');
    expect(d.totalCents).toBe(900);
    const o = await row(d.id);
    expect(o.expiresAt).toBeNull();
    expect(await db().select().from(ticketsV2).where(eq(ticketsV2.orderId, d.id))).toHaveLength(0);
    expect(await db().select().from(payments).where(eq(payments.orderId, d.id))).toHaveLength(0);
    expect((await db().select().from(discountsV2).where(eq(discountsV2.id, promo.id)))[0].usedCount).toBe(0);
    expect((await db().select().from(orderNotes).where(eq(orderNotes.orderId, d.id)))[0].body).toBe('Prenotazione al telefono');
    expect((await soldCounts(db() as never, f.edition.id, { now: new Date() })).get(soldKey(f.ticket.id, f.day1.id)) ?? 0).toBe(0);
    // La data da 2 posti resta vendibile per intero.
    const other = await createOrder(owner, { editionId: f.edition.id, channel: 'admin', lines: [{ productId: f.ticket.id, quantity: 2, sessionId: f.day1.id }], idempotencyKey: key(), payNow: 'cash' });
    expect(other.status).toBe('paid');
    expect(await actions(d.id)).toContain('order.draft_created');

    // Data esaurita: la conferma fallisce con un messaggio chiaro e la bozza resta bozza.
    const err = await errorOf(confirmDraftOrder(owner, { orderId: d.id, mode: 'cash' }));
    expect(err.code).toBe('SOLD_OUT');
    expect(err.message).toMatch(/più abbastanza posti/);
    expect((await row(d.id)).status).toBe('draft');

    // Annullata (mai cancellata): niente posti né sconti da restituire.
    await cancelOrder(owner, { orderId: d.id, reason: 'Non serve più' });
    expect((await row(d.id)).status).toBe('cancelled');
    expect((await db().select().from(discountsV2).where(eq(discountsV2.id, promo.id)))[0].usedCount).toBe(0);
  });

  it('si modifica, poi “Contanti”: prezzi ricalcolati, pagato, biglietti emessi, registro', async () => {
    const d = await draft(1, { lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }] });
    await updateDraftOrder(owner, { orderId: d.id, lines: [{ productId: f.ticket.id, quantity: 3, sessionId: f.day2.id }], customer: buyer, sessionId: f.day2.id });
    expect((await row(d.id)).totalCents).toBe(1500);
    // Il listino cambia dopo la bozza: vale il prezzo al momento della conferma.
    await db().update(products).set({ priceCents: 600 }).where(eq(products.id, f.ticket.id));
    try {
      const r = await confirmDraftOrder(owner, { orderId: d.id, mode: 'cash', note: 'Pagato al banco' });
      expect(r).toMatchObject({ status: 'paid', totalCents: 1800, emailSent: true });
    } finally {
      await db().update(products).set({ priceCents: 500 }).where(eq(products.id, f.ticket.id));
    }
    expect((await db().select().from(ticketsV2).where(eq(ticketsV2.orderId, d.id))).filter((t) => t.status === 'valid')).toHaveLength(3);
    expect((await db().select().from(payments).where(eq(payments.orderId, d.id)))[0]).toMatchObject({ method: 'cash', amountCents: 1800, status: 'succeeded' });
    expect(await actions(d.id)).toEqual(expect.arrayContaining(['order.draft_created', 'order.draft_updated', 'order.draft_confirmed']));
    expect(await errorOf(confirmDraftOrder(owner, { orderId: d.id, mode: 'cash' }))).toMatchObject({ code: 'CONFLICT' });
    expect(await errorOf(updateDraftOrder(owner, { orderId: d.id, lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }] }))).toMatchObject({ code: 'CONFLICT' });
  });

  it('“Paga in loco”: in attesa senza scadenza, tiene i posti, poi si segna pagato', async () => {
    const d = await draft(1, { lines: [{ productId: f.ticket.id, quantity: 4, sessionId: f.day2.id }] });
    const before = (await soldCounts(db() as never, f.edition.id, { now: new Date() })).get(soldKey(f.ticket.id, f.day2.id)) ?? 0;
    const r = await confirmDraftOrder(owner, { orderId: d.id, mode: 'on_site' });
    expect(r).toMatchObject({ status: 'pending', emailSent: null });
    const o = await row(d.id);
    expect(o).toMatchObject({ expiresAt: null, payOnSite: true, channel: 'admin' });
    expect((await soldCounts(db() as never, f.edition.id, { now: new Date('2030-01-01') })).get(soldKey(f.ticket.id, f.day2.id))).toBe(before + 4);
    expect((await markOrderPaid(owner, { orderId: d.id, method: 'card_pos' })).orderStatus).toBe('paid');
  });

  it('“Link di pagamento”: canale pay-link con scadenza ed email con il link; senza email no', async () => {
    const d = await draft(1, { lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }] });
    const r = await confirmDraftOrder(owner, { orderId: d.id, mode: 'paylink' });
    expect(r).toMatchObject({ status: 'pending', emailSent: true });
    const o = await row(d.id);
    expect(o.channel).toBe('paylink');
    expect(o.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 60 * 60_000);
    expect(await db().select().from(emailLog).where(and(eq(emailLog.orderId, d.id), eq(emailLog.templateKey, 'paylink')))).toHaveLength(1);

    const anonymous = await draft(1, { customer: null, lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }] });
    expect(await errorOf(confirmDraftOrder(owner, { orderId: anonymous.id, mode: 'paylink' }))).toMatchObject({ code: 'VALIDATION' });
  });

  it('“Omaggio”: motivo obbligatorio, pagamento complimentary; permessi come la creazione admin', async () => {
    const d = await draft(1, { lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }] });
    expect((await errorOf(confirmDraftOrder(owner, { orderId: d.id, mode: 'complimentary' }))).code).toBe('ZOD');
    expect((await errorOf(confirmDraftOrder(roleOn('cashier', f.slug), { orderId: d.id, mode: 'complimentary', reason: 'Sponsor' }))).code).toBe('FORBIDDEN');
    expect((await errorOf(createDraftOrder(roleOn('gate', f.slug), { editionId: f.edition.id, lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }], idempotencyKey: key() }))).code).toBe('FORBIDDEN');
    const r = await confirmDraftOrder(roleOn('event_manager', f.slug), { orderId: d.id, mode: 'complimentary', reason: 'Sponsor' });
    expect(r.status).toBe('paid');
    expect((await db().select().from(payments).where(eq(payments.orderId, d.id)))[0]).toMatchObject({ method: 'complimentary', raw: { reason: 'Sponsor' } });
    expect((await db().select().from(auditLog).where(and(eq(auditLog.entityId, d.id), eq(auditLog.action, 'order.draft_confirmed'))))[0].reason).toBe('Sponsor');

    // Omaggio anche da "Nuovo ordine" admin (prima solo in cassa).
    const gift = await createOrder(owner, { editionId: f.edition.id, channel: 'admin', lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }], idempotencyKey: key(), payNow: 'complimentary', complimentaryReason: 'Volontario' });
    expect(gift.status).toBe('paid');
  });
  it('su una data esaurita l’admin va oltre i posti solo se lo chiede, e resta nel registro', async () => {
    const full = { editionId: f.edition.id, channel: 'admin' as const, lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day1.id }], payNow: 'cash' as const };
    expect((await errorOf(createOrder(owner, { ...full, idempotencyKey: key() }))).code).toBe('SOLD_OUT');
    const over = await createOrder(owner, { ...full, idempotencyKey: key(), overCapacity: true });
    expect(over.status).toBe('paid');
    // Solo il canale admin: online no.
    expect((await errorOf(createOrder(owner, { ...full, channel: 'online', payNow: null, customer: buyer, idempotencyKey: key(), overCapacity: true }))).code).toBe('ZOD');

    const d = await draft(1);
    expect((await errorOf(confirmDraftOrder(owner, { orderId: d.id, mode: 'cash' }))).code).toBe('SOLD_OUT');
    expect((await confirmDraftOrder(owner, { orderId: d.id, mode: 'cash', overCapacity: true })).status).toBe('paid');
    const [log] = await db().select({ after: auditLog.after }).from(auditLog).where(and(eq(auditLog.entityId, d.id), eq(auditLog.action, 'order.draft_confirmed')));
    expect(log.after).toMatchObject({ oversold: true });
  });
  it('anche il link di pagamento va oltre i posti se lo si chiede, pure su una data segnata esaurita', async () => {
    const { createPaylinkOrder } = await import('@/modules/paylink/server');
    const link = { editionId: f.edition.id, lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day1.id }], customer: buyer };
    expect((await errorOf(createPaylinkOrder(owner, { ...link, idempotencyKey: key() }))).code).toBe('SOLD_OUT');
    await db().update(sessions).set({ status: 'sold_out' }).where(eq(sessions.id, f.day1.id));
    const r = await createPaylinkOrder(owner, { ...link, idempotencyKey: key(), overCapacity: true });
    expect(r.status).toBe('pending');
    await db().update(sessions).set({ status: 'closed' }).where(eq(sessions.id, f.day1.id));
    expect((await errorOf(createPaylinkOrder(owner, { ...link, idempotencyKey: key(), overCapacity: true }))).code).toBe('SALES_CLOSED');
    await db().update(sessions).set({ status: 'open' }).where(eq(sessions.id, f.day1.id));
  });
});
