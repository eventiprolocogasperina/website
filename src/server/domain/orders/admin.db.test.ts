// Servizi delle pagine ordini dell'admin (prompt 12) su un Postgres vero: elenco con filtri e
// permessi, dettaglio, note, blacklist, cliente, pagamento a mano, rimborso dal dettaglio, azioni di massa.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, type OrderFilters } from '@/lib/admin/order-filters';
import { auditLog, customers, editions, ordersV2, products, refundsV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { createOrder, type CreateOrderInput } from '@/server/domain/orders';
import { createPaylinkFromOrder } from '@/modules/paylink/admin';
import { buyer, createEdition, key, owner, roleOn, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { addOrderNote, markOrderPaid, moveSessionBulk, refundOrder, resendTicketsBulk, setOrderBlacklist, updateOrderCustomer } from './admin';
import { getOrderDetail } from './admin-detail';
import { listOrders, orderViewCounts } from './admin-list';

const enabled = !!process.env.TEST_DATABASE_URL;

async function errorCode(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof DomainError) return e.code;
    if ((e as { name?: string }).name === 'ZodError') return 'ZOD';
    throw e;
  }
  return 'nessun errore';
}

const filters = (over: Partial<OrderFilters> = {}): OrderFilters => ({ ...EMPTY_FILTERS, ...over });

describe.skipIf(!enabled)('admin ordini sul database', () => {
  let f: Fixture;
  let other: Fixture;
  const order = (over: Partial<CreateOrderInput> = {}, fx = f) =>
    createOrder(owner, {
      editionId: fx.edition.id,
      channel: 'admin',
      customer: buyer,
      lines: [{ productId: fx.ticket.id, quantity: 1, sessionId: fx.day2.id }],
      idempotencyKey: key(),
      payNow: 'cash',
      ...over,
    });

  beforeAll(async () => {
    f = await createEdition();
    other = await createEdition();
  });
  afterAll(async () => {
    await closeTestDb();
  });

  describe('listOrders', () => {
    it('filtra per edizione, stato, canale, data, ricerca e blacklist; rispetta i permessi', async () => {
      const paid = await order();
      const pending = await order({ payNow: null, customer: { email: 'lucia.bianchi@example.com', name: 'Lucia Bianchi', phone: '+39 347 0000000' } });
      const elsewhere = await order({}, other);
      await setOrderBlacklist(owner, { orderId: pending.id, blacklisted: true, reason: 'Chargeback' });

      const all = await listOrders(owner, f.slug, filters());
      expect(all.rows.map((r) => r.code)).toEqual(expect.arrayContaining([paid.code, pending.code]));
      expect(all.rows.some((r) => r.code === elsewhere.code)).toBe(false);
      expect(all.rows.find((r) => r.code === paid.code)).toMatchObject({ tickets: 1, checkedIn: 0, sessionLabel: 'Dom 25 ott', editionSlug: f.slug });

      expect((await listOrders(owner, f.slug, filters({ status: ['pending'] }))).rows.map((r) => r.code)).toEqual([pending.code]);
      expect((await listOrders(owner, f.slug, filters({ q: 'BIANCHI' }))).rows.map((r) => r.code)).toEqual([pending.code]);
      expect((await listOrders(owner, f.slug, filters({ q: '347 0000' }))).total).toBe(1);
      expect((await listOrders(owner, f.slug, filters({ q: '%' }))).total).toBe(0);
      expect((await listOrders(owner, f.slug, filters({ blacklist: 'si' }))).rows.map((r) => r.code)).toEqual([pending.code]);
      expect((await listOrders(owner, f.slug, filters({ channel: ['online'] }))).total).toBe(0);
      expect((await listOrders(owner, f.slug, filters({ from: '2000-01-01', to: '2000-01-02' }))).total).toBe(0);
      expect((await orderViewCounts(owner, f.slug)).blacklist).toBe(1);

      // Vista globale: tutte le edizioni per l'owner, solo la propria per un event_manager.
      const global = await listOrders(owner, null, filters({ edition: other.slug }));
      expect(global.rows.map((r) => r.code)).toEqual([elsewhere.code]);
      const manager = roleOn('event_manager', other.slug);
      expect((await listOrders(manager, null, filters())).rows.every((r) => r.editionSlug === other.slug)).toBe(true);
      expect(await errorCode(listOrders(manager, f.slug, filters()))).toBe('FORBIDDEN');
      expect(await errorCode(listOrders(roleOn('cashier', null), null, filters()))).toBe('FORBIDDEN');
    });

    it('pagina da 50 righe con il totale', async () => {
      const fx = await createEdition();
      for (let i = 0; i < 52; i++) await order({}, fx);
      const first = await listOrders(owner, fx.slug, filters());
      const second = await listOrders(owner, fx.slug, filters({ page: 1 }));
      expect(first).toMatchObject({ total: 52, pageSize: 50 });
      expect(first.rows).toHaveLength(50);
      expect(second.rows).toHaveLength(2);
      expect(new Set([...first.rows, ...second.rows].map((r) => r.id)).size).toBe(52);
    });
  });

  describe('dettaglio e azioni', () => {
    it('legge righe, biglietti, pagamenti, riquadri dei moduli e cronologia', async () => {
      const r = await order({ answers: [{ questionKey: 'bambini', value: 1 }] });
      await addOrderNote(owner, { orderId: r.id, body: 'Chiamato per conferma' });
      const d = await getOrderDetail(owner, r.code.toLowerCase(), f.slug);
      expect(d.order.code).toBe(r.code);
      expect(d.lines).toHaveLength(1);
      expect(d.tickets).toHaveLength(1);
      expect(d.payments[0]).toMatchObject({ method: 'cash', amountCents: 500 });
      expect(d.summary).toMatchObject({ paidCents: 500, refundableCents: 500 });
      expect(d.notes[0]).toMatchObject({ body: 'Chiamato per conferma' });
      expect(d.panels.map((p) => p.key)).toEqual(['activities', 'postponement']);
      expect(d.panels.find((p) => p.key === 'activities')!.data).toMatchObject({ children: 1 });
      expect(d.moduleActions.map((a) => a.key)).toEqual(expect.arrayContaining(['move-session', 'paylink']));
      expect(d.history.map((h) => h.action)).toEqual(expect.arrayContaining(['order.created', 'order.note_added']));
      expect(await errorCode(getOrderDetail(owner, r.code, other.slug))).toBe('NOT_FOUND');
      expect(await errorCode(getOrderDetail(roleOn('event_manager', other.slug), r.code, null))).toBe('FORBIDDEN');
    });

    it('note e blacklist chiedono orders.edit e finiscono nel registro', async () => {
      const r = await order();
      expect(await errorCode(addOrderNote(roleOn('cashier', f.slug), { orderId: r.id, body: 'ciao' }))).toBe('FORBIDDEN');
      expect(await errorCode(setOrderBlacklist(owner, { orderId: r.id, blacklisted: true }))).toBe('ZOD');
      await setOrderBlacklist(owner, { orderId: r.id, blacklisted: true, reason: 'Rivendita' });
      expect(await errorCode(setOrderBlacklist(owner, { orderId: r.id, blacklisted: true, reason: 'Ancora' }))).toBe('CONFLICT');
      await setOrderBlacklist(owner, { orderId: r.id, blacklisted: false });
      const [row] = await getDb().select().from(ordersV2).where(eq(ordersV2.id, r.id));
      expect(row).toMatchObject({ isBlacklisted: false, blacklistReason: null });
      const log = await getDb().select().from(auditLog).where(eq(auditLog.entityId, r.id));
      expect(log.map((l) => l.action)).toEqual(expect.arrayContaining(['order.blacklisted', 'order.unblacklisted']));
    });

    it('modifica cliente: con un’email nuova l’ordine passa a un altro cliente', async () => {
      const r = await order({ customer: { email: 'anna@example.com', name: 'Anna' } });
      await updateOrderCustomer(owner, { orderId: r.id, customer: { email: 'Anna.Verdi@Example.com', name: 'Anna Verdi', phone: '+39 333 1111111' } });
      const [o] = await getDb().select().from(ordersV2).where(eq(ordersV2.id, r.id));
      const [c] = await getDb().select().from(customers).where(eq(customers.id, o.customerId!));
      expect(c).toMatchObject({ email: 'anna.verdi@example.com', name: 'Anna Verdi', phone: '+39 333 1111111' });
    });

    it('segna come pagato un ordine in attesa con l’importo calcolato dal server', async () => {
      const r = await order({ payNow: null });
      expect(r.status).toBe('pending');
      expect(await markOrderPaid(owner, { orderId: r.id, method: 'bank_transfer' })).toEqual({ orderStatus: 'paid' });
      expect(await errorCode(markOrderPaid(owner, { orderId: r.id, method: 'cash' }))).toBe('CONFLICT');
    });

    it('rimborso: sopra i 100 € serve il codice; "già eseguito" aggiorna lo stato', async () => {
      const big = await order({ lines: [{ productId: f.ticket.id, quantity: 21, sessionId: f.day2.id }] });
      expect(await errorCode(refundOrder(owner, { orderId: big.id, amountCents: 10_500, method: 'cash', reason: 'Annullato' }))).toBe('VALIDATION');
      expect(await errorCode(refundOrder(owner, { orderId: big.id, amountCents: 10_500, method: 'cash', reason: 'Annullato', confirmCode: 'XX' }))).toBe('VALIDATION');
      const res = await refundOrder(owner, { orderId: big.id, amountCents: 10_500, method: 'cash', reason: 'Annullato', confirmCode: big.code.toLowerCase(), paidNow: true });
      expect(res.orderStatus).toBe('refunded');

      const small = await order();
      const partial = await refundOrder(owner, { orderId: small.id, amountCents: 200, method: 'nexi', reason: 'Sconto dimenticato' });
      expect(partial.orderStatus).toBeNull();
      const [refund] = await getDb().select().from(refundsV2).where(eq(refundsV2.id, partial.refundId));
      expect(refund.status).toBe('approved');
      expect(await errorCode(refundOrder(roleOn('cashier', f.slug), { orderId: small.id, amountCents: 100, method: 'cash', reason: 'Prova' }))).toBe('FORBIDDEN');
    });

    it('due rimborsi insieme non superano il pagato', async () => {
      const r = await order();
      const results = await Promise.allSettled([1, 2].map(() => refundOrder(owner, { orderId: r.id, amountCents: 400, method: 'cash', reason: 'Doppio clic' })));
      expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    });

    it('azioni di massa: un ordine che non va non ferma gli altri', async () => {
      const a = await order();
      const b = await order({ payNow: null });
      const resend = await resendTicketsBulk(owner, [a.id, b.id]);
      expect(resend.done).toEqual([a.id]);
      expect(resend.failed.map((x) => x.id)).toEqual([b.id]);
      const moved = await moveSessionBulk(owner, [a.id], f.day1.id, 'Prova');
      expect(moved.done).toEqual([a.id]);
      expect((await getDb().select().from(ordersV2).where(eq(ordersV2.id, a.id)))[0].sessionId).toBe(f.day1.id);
    });

    it('crea link di pagamento: integrazione per un ordine pagato, ordine nuovo altrimenti', async () => {
      const paid = await order();
      // Il canale paylink va acceso sul prodotto, come per gli altri canali.
      await getDb().update(products).set({ channels: ['online', 'paylink'] }).where(eq(products.id, f.lab.id));
      const linked = await createPaylinkFromOrder(owner, { orderId: paid.id, lines: [{ productId: f.lab.id, quantity: 1 }], idempotencyKey: key() });
      expect(linked).toMatchObject({ status: 'pending', totalCents: 300 });
      const [row] = await getDb().select().from(ordersV2).where(eq(ordersV2.id, linked.id));
      expect(row).toMatchObject({ channel: 'paylink', parentOrderId: paid.id });
      const noModule = await createEdition({ modules: ['time-slots'] });
      const o = await order({}, noModule);
      expect(await errorCode(createPaylinkFromOrder(owner, { orderId: o.id, lines: [{ productId: noModule.ticket.id, quantity: 1 }], idempotencyKey: key() }))).toBe('CONFLICT');
    });

    it('edizione archiviata: si legge ma non si modifica', async () => {
      const fx = await createEdition();
      const r = await order({}, fx);
      await getDb().update(editions).set({ status: 'archived' }).where(eq(editions.id, fx.edition.id));
      const d = await getOrderDetail(owner, r.code, fx.slug);
      expect(d.can.edit).toBe(false);
      expect(d.moduleActions).toEqual([]);
      expect(await errorCode(addOrderNote(owner, { orderId: r.id, body: 'nota' }))).toBe('EDITION_ARCHIVED');
    });
  });
});
