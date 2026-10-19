// Test del nucleo ordini su un Postgres vero (npm run test:db): concorrenza, scadenze, pagamenti
// doppi, rimborsi, check-in, edizioni archiviate e permessi.
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditLog, customers, discountsV2, editions, ordersV2, payments, refundsV2, ticketsV2, attendeeAnswers } from '@/server/db/schema';
import { revertCheckin, saveCheckinList, scan } from '@/server/domain/checkin';
import { DomainError } from '@/server/domain/errors';
import { on, type DomainEvent } from '@/server/domain/events';
import { addLines, cancelOrder, createOrder, expirePendingOrders, moveSession, resendTickets, type CreateOrderInput } from '@/server/domain/orders';
import { recordPayment } from '@/server/domain/payments';
import { approveRefund, createRefund, markRefundPaid, rejectRefund, requestRefund, revealIban } from '@/server/domain/refunds';
import { anon, buyer, createDiscount, createEdition, key, owner, roleOn, system, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';

const enabled = !!process.env.TEST_DATABASE_URL;
const IBAN = 'IT60X0542811101000000123456';

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

const events: DomainEvent[] = [];

describe.skipIf(!enabled)('nucleo ordini sul database', () => {
  let f: Fixture;
  const online = (over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
    editionId: f.edition.id,
    channel: 'online',
    customer: buyer,
    lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }],
    idempotencyKey: key(),
    ...over,
  });
  const ticketsOf = (orderId: string) => getDb().select().from(ticketsV2).where(eq(ticketsV2.orderId, orderId));
  const orderRow = async (id: string) => (await getDb().select().from(ordersV2).where(eq(ordersV2.id, id)))[0];

  beforeAll(async () => {
    on('*', (e) => void events.push(e));
    f = await createEdition();
  });
  afterAll(async () => {
    await closeTestDb();
  });

  describe('createOrder', () => {
    it('crea un ordine online in attesa, con prezzi del server, biglietti, cliente e risposte', async () => {
      const now = new Date();
      const r = await createOrder(anon, online({ lines: [{ productId: f.ticket.id, quantity: 2, sessionId: f.day2.id }], answers: [{ questionKey: 'eta', value: 7, ticket: 1 }, { questionKey: 'note', value: 'ciao' }] }), { now });
      expect(r).toMatchObject({ status: 'pending', totalCents: 1000, created: true });
      expect(r.code).toMatch(/^[A-Z][A-Z0-9]26-[2-9A-Z]{4}$/);
      expect(r.expiresAt!.getTime() - now.getTime()).toBe(15 * 60_000);
      const tickets = await ticketsOf(r.id);
      expect(tickets).toHaveLength(2);
      expect(new Set(tickets.map((t) => t.qrToken)).size).toBe(2);
      const [customer] = await getDb().select().from(customers).where(eq(customers.email, 'mario.rossi@example.com'));
      expect(customer.name).toBe('Mario Rossi');
      const answers = await getDb().select().from(attendeeAnswers).where(eq(attendeeAnswers.orderId, r.id));
      expect(answers.find((a) => a.questionKey === 'eta')?.ticketId).toBe(tickets[1].id);
      expect(events.some((e) => e.type === 'order.created' && e.orderId === r.id)).toBe(true);
      const audits = await getDb().select().from(auditLog).where(and(eq(auditLog.action, 'order.created'), eq(auditLog.entityId, r.id)));
      expect(audits).toHaveLength(1);
      expect(JSON.stringify(audits[0].after)).not.toContain('example.com');
    });

    it('è idempotente sulla chiave, anche con due invii nello stesso istante', async () => {
      const input = online();
      const [a, b] = await Promise.all([createOrder(anon, input), createOrder(anon, input)]);
      expect(a.id).toBe(b.id);
      expect([a.created, b.created].sort()).toEqual([false, true]);
      const again = await createOrder(anon, input);
      expect(again).toMatchObject({ id: a.id, created: false });
    });

    it('due ordini concorrenti sull’ultimo posto: ne passa uno solo', async () => {
      const g = await createEdition();
      const buy = () => createOrder(anon, { ...online(), editionId: g.edition.id, lines: [{ productId: g.lab.id, quantity: 1, sessionId: g.day2.id }] });
      const results = await Promise.allSettled([buy(), buy(), buy()]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected.map((r) => (r.reason as DomainError).code)).toEqual(['SOLD_OUT', 'SOLD_OUT']);
    });

    it('rispetta la capienza della data, contando anche gli ordini in attesa', async () => {
      const g = await createEdition();
      const day1 = (q: number) => createOrder(anon, { ...online(), editionId: g.edition.id, lines: [{ productId: g.ticket.id, quantity: q, sessionId: g.day1.id }] });
      await day1(1);
      expect(await errorCode(day1(2))).toBe('SOLD_OUT');
      await day1(1);
      expect(await errorCode(day1(1))).toBe('SOLD_OUT');
    });

    it('un ordine in attesa scaduto libera il posto', async () => {
      const g = await createEdition();
      const line = [{ productId: g.lab.id, quantity: 1, sessionId: g.day2.id }];
      const old = await createOrder(anon, { ...online(), editionId: g.edition.id, lines: line }, { now: new Date(Date.now() - 20 * 60_000) });
      const fresh = await createOrder(anon, { ...online(), editionId: g.edition.id, lines: line });
      expect(fresh.status).toBe('pending');
      expect((await orderRow(old.id)).status).toBe('pending');
      const { expired } = await expirePendingOrders(system);
      expect(expired).toBeGreaterThanOrEqual(1);
      expect((await orderRow(old.id)).status).toBe('expired');
      expect((await ticketsOf(old.id)).every((t) => t.status === 'void')).toBe(true);
      expect((await orderRow(fresh.id)).status).toBe('pending');
    });

    it('applica il codice sconto, conta gli utilizzi e lo restituisce allo scadere', async () => {
      const d = await createDiscount({ code: `PROVA${Date.now()}`, value: 20, maxUses: 1, editionId: f.edition.id });
      const r = await createOrder(anon, online({ discountCode: d.code.toLowerCase() }), { now: new Date(Date.now() - 20 * 60_000) });
      expect(r.totalCents).toBe(400);
      expect(await errorCode(createOrder(anon, online({ discountCode: d.code })))).toBe('DISCOUNT_INVALID');
      await expirePendingOrders(system);
      const [after] = await getDb().select().from(discountsV2).where(eq(discountsV2.id, d.id));
      expect(after.usedCount).toBe(0);
      expect(await errorCode(createOrder(anon, online({ discountCode: 'NONESISTE' })))).toBe('DISCOUNT_INVALID');
    });

    it('PRICE_CHANGED se il totale mostrato al cliente non è quello del server', async () => {
      expect(await errorCode(createOrder(anon, online({ expectedTotalCents: 450 })))).toBe('PRICE_CHANGED');
      expect((await createOrder(anon, online({ expectedTotalCents: 500 }))).totalCents).toBe(500);
    });

    it('in cassa l’ordine è pagato subito, con il pagamento registrato', async () => {
      const cashier = roleOn('cashier', f.slug);
      const r = await createOrder(cashier, { editionId: f.edition.id, channel: 'pos', lines: [{ productId: f.drink.id, quantity: 3 }], idempotencyKey: key() });
      expect(r).toMatchObject({ status: 'paid', totalCents: 300, expiresAt: null });
      const pay = await getDb().select().from(payments).where(eq(payments.orderId, r.id));
      expect(pay).toMatchObject([{ method: 'cash', amountCents: 300, status: 'succeeded' }]);
      expect(await ticketsOf(r.id)).toHaveLength(0);
      expect(events.some((e) => e.type === 'order.paid' && e.orderId === r.id)).toBe(true);
    });

    it('gli inviti sono a 0 € e pagati, con un pagamento "complimentary"', async () => {
      const r = await createOrder(owner, online({ channel: 'invite' }));
      expect(r).toMatchObject({ status: 'paid', totalCents: 0 });
      expect((await getDb().select().from(payments).where(eq(payments.orderId, r.id)))[0].method).toBe('complimentary');
    });

    it('rifiuta canali, stati dell’edizione e dati non validi', async () => {
      expect(await errorCode(createOrder(anon, online({ lines: [{ productId: f.drink.id, quantity: 1 }] })))).toBe('SALES_CLOSED');
      expect(await errorCode(createOrder(anon, online({ customer: null })))).toBe('ZOD');
      expect(await errorCode(createOrder(anon, online({ payNow: 'cash' })))).toBe('ZOD');
      expect(await errorCode(createOrder(anon, online({ sessionId: f.labQuota.id })))).toBe('VALIDATION');
      const draft = await createEdition({ status: 'draft' });
      expect(await errorCode(createOrder(anon, { ...online(), editionId: draft.edition.id, lines: [{ productId: draft.ticket.id, quantity: 1, sessionId: draft.day2.id }] }))).toBe('SALES_CLOSED');
      const soldOut = await createEdition({ status: 'sold_out' });
      expect(await errorCode(createOrder(anon, { ...online(), editionId: soldOut.edition.id, lines: [{ productId: soldOut.ticket.id, quantity: 1, sessionId: soldOut.day2.id }] }))).toBe('SOLD_OUT');
      expect(await errorCode(createOrder(anon, { ...online(), editionId: '00000000-0000-0000-0000-000000000000' }))).toBe('NOT_FOUND');
      // Stessa chiave su un'altra edizione: non restituisce l'ordine di qualcun altro.
      const input = online();
      await createOrder(anon, input);
      expect(await errorCode(createOrder(anon, { ...input, editionId: soldOut.edition.id }))).toBe('CONFLICT');
    });
  });

  describe('pagamenti', () => {
    it('un callback ricevuto due volte crea un solo pagamento', async () => {
      const r = await createOrder(anon, online());
      const callback = { orderId: r.id, method: 'nexi' as const, amountCents: 500, status: 'succeeded' as const, providerRef: `NEXI-${r.code}`, raw: { esito: 'OK' } };
      const [a, b] = await Promise.all([recordPayment(system, callback), recordPayment(system, callback)]);
      expect([a.duplicate, b.duplicate].sort()).toEqual([false, true]);
      expect(await getDb().select().from(payments).where(eq(payments.orderId, r.id))).toHaveLength(1);
      const o = await orderRow(r.id);
      expect(o.status).toBe('paid');
      expect(o.paidAt).not.toBeNull();
      expect(o.expiresAt).toBeNull();
      expect(events.filter((e) => e.type === 'order.paid' && e.orderId === r.id)).toHaveLength(1);
    });

    it('un pagamento in attesa diventa riuscito con lo stesso riferimento; un pagamento parziale non basta', async () => {
      const r = await createOrder(anon, online());
      const ref = `NEXI-P-${r.code}`;
      await recordPayment(system, { orderId: r.id, method: 'nexi', amountCents: 500, status: 'pending', providerRef: ref });
      expect((await orderRow(r.id)).status).toBe('pending');
      const done = await recordPayment(system, { orderId: r.id, method: 'nexi', amountCents: 500, status: 'succeeded', providerRef: ref });
      expect(done).toMatchObject({ duplicate: false, orderStatus: 'paid' });
      const partial = await createOrder(anon, online());
      expect((await recordPayment(owner, { orderId: partial.id, method: 'bank_transfer', amountCents: 200, status: 'succeeded' })).orderStatus).toBe('pending');
      expect(await errorCode(recordPayment(system, { orderId: partial.id, method: 'nexi', amountCents: 1, status: 'succeeded', providerRef: ref }))).toBe('CONFLICT');
    });

    it('solo il sistema registra pagamenti Nexi; la cassa registra contanti', async () => {
      const r = await createOrder(anon, online());
      expect(await errorCode(recordPayment(anon, { orderId: r.id, method: 'nexi', amountCents: 500, status: 'succeeded', providerRef: `x-${r.id}` }))).toBe('FORBIDDEN');
      expect(await errorCode(recordPayment(owner, { orderId: r.id, method: 'nexi', amountCents: 500, status: 'succeeded', providerRef: `y-${r.id}` }))).toBe('FORBIDDEN');
      expect(await errorCode(recordPayment(roleOn('gate', f.slug), { orderId: r.id, method: 'cash', amountCents: 500, status: 'succeeded' }))).toBe('FORBIDDEN');
      expect((await recordPayment(roleOn('cashier', f.slug), { orderId: r.id, method: 'cash', amountCents: 500, status: 'succeeded' })).orderStatus).toBe('paid');
    });

    it('pagamento arrivato dopo la scadenza: torna pagato se il posto c’è, altrimenti resta scaduto', async () => {
      const g = await createEdition();
      const line = [{ productId: g.lab.id, quantity: 1, sessionId: g.day2.id }];
      const late = await createOrder(anon, { ...online(), editionId: g.edition.id, lines: line }, { now: new Date(Date.now() - 20 * 60_000) });
      await expirePendingOrders(system);
      const ok = await recordPayment(system, { orderId: late.id, method: 'nexi', amountCents: 300, status: 'succeeded', providerRef: `late-${late.id}` });
      expect(ok.orderStatus).toBe('paid');
      expect((await ticketsOf(late.id)).every((t) => t.status === 'valid')).toBe(true);

      const h = await createEdition();
      const lineH = [{ productId: h.lab.id, quantity: 1, sessionId: h.day2.id }];
      const lost = await createOrder(anon, { ...online(), editionId: h.edition.id, lines: lineH }, { now: new Date(Date.now() - 20 * 60_000) });
      await expirePendingOrders(system);
      await createOrder(anon, { ...online(), editionId: h.edition.id, lines: lineH });
      const ko = await recordPayment(system, { orderId: lost.id, method: 'nexi', amountCents: 300, status: 'succeeded', providerRef: `late-${lost.id}` });
      expect(ko.orderStatus).toBe('expired');
      expect(events.some((e) => e.type === 'order.paid_after_expiry' && e.orderId === lost.id)).toBe(true);
    });
  });

  describe('rimborsi', () => {
    async function paidOrder(quantity = 2) {
      const r = await createOrder(anon, online({ lines: [{ productId: f.ticket.id, quantity, sessionId: f.day2.id }] }));
      await recordPayment(system, { orderId: r.id, method: 'nexi', amountCents: r.totalCents, status: 'succeeded', providerRef: `pay-${r.id}` });
      return r;
    }

    it('rimborso maggiore del pagato: errore', async () => {
      const r = await paidOrder();
      expect(await errorCode(requestRefund(anon, { orderCode: r.code, accessToken: r.accessToken, amountCents: 1001, reason: 'Non vengo', iban: IBAN, holderName: 'Mario Rossi' }))).toBe('VALIDATION');
      expect(await errorCode(createRefund(owner, { orderId: r.id, amountCents: 1001, method: 'cash', reason: 'Prova' }))).toBe('VALIDATION');
      await createRefund(owner, { orderId: r.id, amountCents: 600, method: 'cash', reason: 'Prova' });
      expect(await errorCode(createRefund(owner, { orderId: r.id, amountCents: 401, method: 'cash', reason: 'Prova' }))).toBe('VALIDATION');
    });

    it('serve il token dell’ordine; l’IBAN si salva solo cifrato', async () => {
      const r = await paidOrder();
      expect(await errorCode(requestRefund(anon, { orderCode: r.code, accessToken: 'x'.repeat(32), reason: 'Non vengo', iban: IBAN, holderName: 'Mario Rossi' }))).toBe('NOT_FOUND');
      expect(await errorCode(requestRefund(anon, { orderCode: r.code, accessToken: r.accessToken, reason: 'Non vengo', iban: 'IT00X123', holderName: 'Mario Rossi' }))).toBe('ZOD');
      const { refundId, amountCents } = await requestRefund(anon, { orderCode: r.code, accessToken: r.accessToken, reason: 'Non vengo', iban: IBAN, holderName: 'Mario Rossi' });
      expect(amountCents).toBe(1000);
      const [row] = await getDb().select().from(refundsV2).where(eq(refundsV2.id, refundId));
      expect(row.ibanEncrypted).toMatch(/^v1:/);
      expect(row.ibanEncrypted).not.toContain('IT60');
      const audits = await getDb().select().from(auditLog).where(eq(auditLog.entityId, refundId));
      expect(JSON.stringify(audits)).not.toContain('X0542811101');
      expect(await errorCode(revealIban(roleOn('event_manager', f.slug), refundId))).toBe('FORBIDDEN');
      expect((await revealIban(owner, refundId)).iban).toBe(IBAN);
    });

    it('richiesta → approvazione → esecuzione: rimborso parziale e poi totale', async () => {
      const r = await paidOrder();
      const first = await requestRefund(anon, { orderCode: r.code, accessToken: r.accessToken, amountCents: 300, reason: 'Un bambino non viene', iban: IBAN, holderName: 'Mario Rossi' });
      expect(await errorCode(markRefundPaid(owner, first))).toBe('CONFLICT');
      expect(await errorCode(approveRefund(roleOn('cashier', f.slug), first))).toBe('FORBIDDEN');
      await approveRefund(owner, first);
      expect(await errorCode(approveRefund(owner, first))).toBe('CONFLICT');
      expect(await markRefundPaid(owner, first)).toEqual({ orderStatus: 'partially_refunded' });
      expect((await ticketsOf(r.id)).every((t) => t.status === 'valid')).toBe(true);

      const second = await requestRefund(anon, { orderCode: r.code, accessToken: r.accessToken, reason: 'Non veniamo più', iban: IBAN, holderName: 'Mario Rossi' });
      await approveRefund(owner, second);
      expect(await markRefundPaid(owner, second)).toEqual({ orderStatus: 'refunded' });
      expect((await ticketsOf(r.id)).every((t) => t.status === 'void')).toBe(true);
      expect(events.some((e) => e.type === 'order.refunded' && e.orderId === r.id && e.fully)).toBe(true);
      expect(await errorCode(requestRefund(anon, { orderCode: r.code, accessToken: r.accessToken, reason: 'Ancora', iban: IBAN, holderName: 'Mario Rossi' }))).toBe('CONFLICT');
    });

    it('una richiesta rifiutata libera l’importo', async () => {
      const r = await paidOrder(1);
      const req = await requestRefund(anon, { orderCode: r.code, accessToken: r.accessToken, reason: 'Non vengo', iban: IBAN, holderName: 'Mario Rossi' });
      expect(await errorCode(requestRefund(anon, { orderCode: r.code, accessToken: r.accessToken, amountCents: 100, reason: 'Ancora', iban: IBAN, holderName: 'Mario Rossi' }))).toBe('VALIDATION');
      await rejectRefund(owner, { ...req, reason: 'Fuori tempo' });
      expect(await errorCode(rejectRefund(owner, { ...req, reason: 'Di nuovo' }))).toBe('CONFLICT');
      expect((await requestRefund(anon, { orderCode: r.code, accessToken: r.accessToken, amountCents: 100, reason: 'Ancora', iban: IBAN, holderName: 'Mario Rossi' })).amountCents).toBe(100);
    });
  });

  describe('annullamento, integrazioni, rinvio', () => {
    it('annulla un ordine in attesa; uno pagato va prima rimborsato', async () => {
      const pending = await createOrder(anon, online());
      expect(await errorCode(cancelOrder(roleOn('cashier', f.slug), { orderId: pending.id, reason: 'Prova' }))).toBe('FORBIDDEN');
      await cancelOrder(owner, { orderId: pending.id, reason: 'Doppio ordine' });
      expect((await orderRow(pending.id)).status).toBe('cancelled');
      expect((await ticketsOf(pending.id)).every((t) => t.status === 'void')).toBe(true);
      expect(await errorCode(cancelOrder(owner, { orderId: pending.id, reason: 'Ancora' }))).toBe('CONFLICT');

      const pos = await createOrder(roleOn('cashier', f.slug), { editionId: f.edition.id, channel: 'pos', lines: [{ productId: f.drink.id, quantity: 1 }], idempotencyKey: key() });
      expect(await errorCode(cancelOrder(roleOn('cashier', f.slug), { orderId: pos.id, reason: 'Sbagliato' }))).toBe('FORBIDDEN');
      expect(await errorCode(cancelOrder(roleOn('event_manager', f.slug), { orderId: pos.id, reason: 'Sbagliato' }))).toBe('CONFLICT');
    });

    it('rimanda i biglietti solo degli ordini pagati', async () => {
      const pending = await createOrder(anon, online());
      expect(await errorCode(resendTickets(owner, { orderId: pending.id }))).toBe('CONFLICT');
      const invite = await createOrder(owner, online({ channel: 'invite' }));
      await resendTickets(owner, { orderId: invite.id });
      expect(events.some((e) => e.type === 'order.tickets_resent' && e.orderId === invite.id)).toBe(true);
      expect(await errorCode(resendTickets(roleOn('gate', f.slug), { orderId: invite.id }))).toBe('FORBIDDEN');
    });

    it('un’integrazione è un ordine collegato con il suo pagamento', async () => {
      const g = await createEdition();
      const parent = await createOrder(owner, { ...online({ channel: 'admin', payNow: 'cash' }), editionId: g.edition.id, lines: [{ productId: g.ticket.id, quantity: 1, sessionId: g.day2.id }] });
      expect(parent.status).toBe('paid');
      const extra = await addLines(owner, { orderId: parent.id, lines: [{ productId: g.lab.id, quantity: 1 }], idempotencyKey: key() });
      const row = await orderRow(extra.id);
      expect(row).toMatchObject({ parentOrderId: parent.id, status: 'pending', totalCents: 300, sessionId: g.day2.id, customerId: (await orderRow(parent.id)).customerId });
      const unpaid = await createOrder(anon, online());
      expect(await errorCode(addLines(owner, { orderId: unpaid.id, lines: [{ productId: f.lab.id, quantity: 1 }], idempotencyKey: key() }))).toBe('CONFLICT');
    });

    it('sposta un ordine su un’altra data, controllando la capienza', async () => {
      const g = await createEdition();
      const big = await createOrder(anon, { ...online(), editionId: g.edition.id, lines: [{ productId: g.ticket.id, quantity: 3, sessionId: g.day2.id }] });
      expect(await errorCode(moveSession(owner, { orderId: big.id, toSessionId: g.day1.id }))).toBe('SOLD_OUT');
      const small = await createOrder(anon, { ...online(), editionId: g.edition.id, lines: [{ productId: g.ticket.id, quantity: 2, sessionId: g.day2.id }] });
      expect(await moveSession(owner, { orderId: small.id, toSessionId: g.day1.id, reason: 'Pioggia' })).toEqual({ moved: 1 });
      expect((await orderRow(small.id)).sessionId).toBe(g.day1.id);
      expect((await ticketsOf(small.id)).every((t) => t.sessionId === g.day1.id)).toBe(true);
      expect(await moveSession(owner, { orderId: small.id, toSessionId: g.day1.id })).toEqual({ moved: 0 });
      expect(await errorCode(moveSession(owner, { orderId: small.id, toSessionId: f.day1.id }))).toBe('VALIDATION');
      expect(await errorCode(moveSession(roleOn('gate', g.slug), { orderId: small.id, toSessionId: g.day2.id }))).toBe('FORBIDDEN');
    });
  });

  describe('check-in', () => {
    async function paidTicket(g = f, sessionId = g.day2.id) {
      const r = await createOrder(owner, { ...online({ channel: 'admin', payNow: 'card_pos' }), editionId: g.edition.id, lines: [{ productId: g.ticket.id, quantity: 1, sessionId }] });
      return (await ticketsOf(r.id))[0];
    }
    const gate = () => roleOn('gate', f.slug);

    it('valido, poi già usato; annullando il passaggio torna valido', async () => {
      const t = await paidTicket();
      const first = await scan(gate(), { qrToken: t.qrToken, checkinListId: f.entrance.id });
      expect(first.result).toBe('valid');
      const second = await scan(gate(), { qrToken: t.qrToken, checkinListId: f.entrance.id });
      expect(second).toMatchObject({ result: 'already_used', ticket: { productName: 'Ingresso', sessionLabel: 'Dom 25 ott' } });
      if (first.result !== 'valid') throw new Error();
      await revertCheckin(gate(), { checkinId: first.checkinId, reason: 'Scansione sbagliata' });
      expect(await errorCode(revertCheckin(gate(), { checkinId: first.checkinId }))).toBe('CONFLICT');
      expect((await scan(gate(), { qrToken: t.qrToken, checkinListId: f.entrance.id })).result).toBe('valid');
    });

    it('due scanner sullo stesso QR nello stesso istante: un valid e un already_used', async () => {
      const t = await paidTicket();
      const results = await Promise.all([scan(gate(), { qrToken: t.qrToken, checkinListId: f.entrance.id }), scan(gate(), { qrToken: t.qrToken, checkinListId: f.entrance.id })]);
      expect(results.map((r) => r.result).sort()).toEqual(['already_used', 'valid']);
    });

    it('lista sbagliata, data sbagliata, biglietto non pagato o sconosciuto', async () => {
      const t = await paidTicket();
      const labList = await saveCheckinList(owner, f.slug, null, { name: 'Laboratorio', productIds: [f.lab.id] });
      expect((await scan(gate(), { qrToken: t.qrToken, checkinListId: labList.id })).result).toBe('wrong_list');
      expect((await scan(gate(), { qrToken: t.qrToken, checkinListId: f.entrance.id, sessionId: f.day1.id })).result).toBe('wrong_session');
      const pending = await createOrder(anon, online());
      const [pt] = await ticketsOf(pending.id);
      expect((await scan(gate(), { qrToken: pt.qrToken, checkinListId: f.entrance.id })).result).toBe('void');
      expect((await scan(gate(), { qrToken: 'non-esiste-proprio', checkinListId: f.entrance.id })).result).toBe('unknown');
      const other = await createEdition();
      const ot = await paidTicket(other);
      expect((await scan(gate(), { qrToken: ot.qrToken, checkinListId: f.entrance.id })).result).toBe('unknown');
      expect(await errorCode(scan(roleOn('gate', other.slug), { qrToken: t.qrToken, checkinListId: f.entrance.id }))).toBe('FORBIDDEN');
    });

    it('una lista con più passaggi ammessi non dà mai already_used', async () => {
      const t = await paidTicket();
      const list = await saveCheckinList(owner, f.slug, null, { name: 'Uscite e rientri', allowMultiple: true });
      await saveCheckinList(owner, f.slug, list.id, { name: 'Uscite e rientri', allowMultiple: true });
      for (let i = 0; i < 3; i++) expect((await scan(gate(), { qrToken: t.qrToken, checkinListId: list.id })).result).toBe('valid');
      expect(await errorCode(saveCheckinList(gate(), f.slug, null, { name: 'Prova' }))).toBe('FORBIDDEN');
    });
  });

  describe('edizione archiviata', () => {
    it('ogni scrittura risponde EDITION_ARCHIVED', async () => {
      const g = await createEdition();
      const paid = await createOrder(owner, { ...online({ channel: 'admin', payNow: 'cash' }), editionId: g.edition.id, lines: [{ productId: g.ticket.id, quantity: 1, sessionId: g.day2.id }] });
      const pending = await createOrder(anon, { ...online(), editionId: g.edition.id, lines: [{ productId: g.ticket.id, quantity: 1, sessionId: g.day2.id }] });
      const [t] = await ticketsOf(paid.id);
      await getDb().update(editions).set({ status: 'archived' }).where(eq(editions.id, g.edition.id));

      const attempts: Array<() => Promise<unknown>> = [
        () => createOrder(anon, { ...online(), editionId: g.edition.id, lines: [{ productId: g.ticket.id, quantity: 1, sessionId: g.day2.id }] }),
        () => recordPayment(system, { orderId: pending.id, method: 'nexi', amountCents: 500, status: 'succeeded', providerRef: `arch-${pending.id}` }),
        () => cancelOrder(owner, { orderId: pending.id, reason: 'Prova' }),
        () => moveSession(owner, { orderId: paid.id, toSessionId: g.day1.id }),
        () => resendTickets(owner, { orderId: paid.id }),
        () => createRefund(owner, { orderId: paid.id, amountCents: 100, method: 'cash', reason: 'Prova' }),
        () => requestRefund(anon, { orderCode: paid.code, accessToken: paid.accessToken, reason: 'Prova', iban: IBAN, holderName: 'Mario Rossi' }),
        () => scan(roleOn('gate', g.slug), { qrToken: t.qrToken, checkinListId: g.entrance.id }),
        () => saveCheckinList(owner, g.slug, null, { name: 'Nuova' }),
      ];
      for (const attempt of attempts) expect(await errorCode(attempt())).toBe('EDITION_ARCHIVED');
    });
  });

  describe('permessi per ruolo', () => {
    it('vende in cassa solo chi ha il ruolo sull’edizione', async () => {
      const pos = (ctx: typeof owner) => createOrder(ctx, { editionId: f.edition.id, channel: 'pos', lines: [{ productId: f.drink.id, quantity: 1 }], idempotencyKey: key() });
      expect(await errorCode(pos(anon))).toBe('FORBIDDEN');
      expect(await errorCode(pos(roleOn('cashier', 'altra-edizione')))).toBe('FORBIDDEN');
      expect(await errorCode(pos(roleOn('gate', f.slug)))).toBe('FORBIDDEN');
      expect(await errorCode(pos(roleOn('editor', null)))).toBe('FORBIDDEN');
      for (const ctx of [roleOn('cashier', f.slug), roleOn('event_manager', f.slug), roleOn('admin', null), owner]) expect((await pos(ctx)).status).toBe('paid');
    });

    it('ordini da admin, inviti e pay-link solo da chi gestisce gli ordini', async () => {
      for (const channel of ['admin', 'invite', 'paylink'] as const) {
        expect(await errorCode(createOrder(roleOn('cashier', f.slug), online({ channel })))).toBe('FORBIDDEN');
        expect(await errorCode(createOrder(anon, online({ channel })))).toBe('FORBIDDEN');
      }
      const paylinkProduct = await createOrder(roleOn('event_manager', f.slug), online({ channel: 'admin' }));
      expect(paylinkProduct.status).toBe('pending');
      expect(paylinkProduct.expiresAt).toBeNull();
    });

    it('la scadenza degli ordini la lancia solo il sistema o chi può annullare', async () => {
      expect(await errorCode(expirePendingOrders(anon))).toBe('FORBIDDEN');
      expect(await errorCode(expirePendingOrders(roleOn('cashier', null)))).toBe('FORBIDDEN');
      expect((await expirePendingOrders(owner)).expired).toBeGreaterThanOrEqual(0);
    });
  });
});
