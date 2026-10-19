// Checkout pubblico e pagamento Nexi su un Postgres vero (npm run test:db): ordine online, esito firmato,
// esito doppio, importo sbagliato, firma falsa, carta rifiutata, "I miei biglietti" e cambio data del cliente.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { editions, ordersV2, payments } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { resultMac } from '@/server/integrations/nexi/mac';
import { anon, buyer, createDiscount, createEdition, key, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';

vi.mock('@/server/integrations/telegram', () => ({ sendAlert: vi.fn(async () => {}) }));
process.env.NEXI_ALIAS = 'ALIAS_TEST';
process.env.NEXI_MAC_KEY = 'chiave-di-test';

const { getCheckout, placeOrder, quoteCart } = await import('./index');
const { getOrderByToken } = await import('./my-tickets');
const { paymentForm, processResult } = await import('@/server/integrations/nexi');
const { customerMoveSession } = await import('@/server/domain/orders');
const { sendAlert } = await import('@/server/integrations/telegram');
const { sendOrderTickets } = await import('@/server/email/order-tickets');

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

/** Esito firmato come lo manderebbe Nexi per un modulo di pagamento. */
function nexiResult(fields: Record<string, string>, over: Record<string, string> = {}) {
  const p: Record<string, string> = { codTrans: fields.codTrans, esito: 'OK', importo: fields.importo, divisa: 'EUR', data: '20261019', orario: '120000', codAut: 'A1', ...over };
  p.mac = resultMac(p, 'chiave-di-test');
  return p;
}

describe.skipIf(!enabled)('checkout pubblico e Nexi', () => {
  let f: Fixture;
  const order = (over: Record<string, unknown> = {}) =>
    placeOrder('203.0.113.9', {
      editionId: f.edition.id,
      sessionId: f.day2.id,
      lines: [{ productId: f.ticket.id, quantity: 2 }],
      customer: { name: buyer.name, email: buyer.email, phone: null, marketingConsent: false },
      privacyConsent: true,
      idempotencyKey: key(),
      expectedTotalCents: 1000,
      ...over,
    } as never);
  const paymentsOf = (orderId: string) => getDb().select().from(payments).where(eq(payments.orderId, orderId));

  beforeAll(async () => {
    f = await createEdition();
  });
  afterAll(async () => {
    await closeTestDb();
  });

  it('mostra solo i prodotti online e le date con i posti, e chiude le edizioni non in vendita', async () => {
    const v = (await getCheckout(f.slug))!;
    expect(v.selling).toBe(true);
    expect(v.products.map((p) => p.name).sort()).toEqual(['Ingresso', 'Laboratorio']);
    expect(v.sessions.find((s) => s.id === f.day1.id)).toMatchObject({ remaining: 2, open: true });
    const draft = await createEdition({ status: 'published' });
    expect((await getCheckout(draft.slug))!).toMatchObject({ selling: false, closedReason: expect.stringContaining('non è ancora aperta') });
    expect(await getCheckout('non-esiste')).toBeNull();
  });

  it('calcola il riepilogo sul server, con lo sconto', async () => {
    await createDiscount({ code: 'PROVA10', editionId: f.edition.id, kind: 'percent', value: 10 });
    const q = await quoteCart({ editionId: f.edition.id, sessionId: f.day2.id, lines: [{ productId: f.ticket.id, quantity: 2 }], discountCode: 'prova10' });
    expect(q).toMatchObject({ subtotalCents: 1000, discountCents: 100, totalCents: 900, discountCode: 'PROVA10' });
    expect(await errorCode(quoteCart({ editionId: f.edition.id, sessionId: f.day2.id, lines: [{ productId: f.ticket.id, quantity: 1 }], discountCode: 'NOPE' }))).toBe('DISCOUNT_INVALID');
  });

  it('crea l’ordine in attesa per 15 minuti e rifiuta un totale diverso o senza consenso', async () => {
    const r = await order();
    expect(r).toMatchObject({ status: 'pending', totalCents: 1000, edition: f.slug });
    expect(r.expiresAt!.getTime() - Date.now()).toBeGreaterThan(14 * 60_000);
    expect(await errorCode(order({ expectedTotalCents: 500 }))).toBe('PRICE_CHANGED');
    expect(await errorCode(order({ privacyConsent: false }))).toBe('ZOD');
  });

  it('rifiuta una data esaurita', async () => {
    await order({ sessionId: f.day1.id });
    expect(await errorCode(order({ sessionId: f.day1.id, lines: [{ productId: f.ticket.id, quantity: 1 }], expectedTotalCents: 500 }))).toBe('SOLD_OUT');
  });

  it('esito OK: ordine pagato una volta sola anche se arrivano notifica e ritorno, email partita una volta', async () => {
    vi.mocked(sendOrderTickets).mockClear();
    const r = await order();
    const form = paymentForm({ code: r.code, totalCents: r.totalCents });
    expect(form.fields.importo).toBe('1000');
    const p = nexiResult(form.fields);
    const a = await processResult(p, 'server');
    const b = await processResult(p, 'browser');
    expect(a).toMatchObject({ ok: true, outcome: 'succeeded', order: { status: 'paid', accessToken: r.accessToken } });
    expect(b).toMatchObject({ ok: true, outcome: 'succeeded' });
    const pay = await paymentsOf(r.id);
    expect(pay).toHaveLength(1);
    expect(pay[0]).toMatchObject({ method: 'nexi', status: 'succeeded', amountCents: 1000, providerRef: `nexi:${form.fields.codTrans}` });
    expect(JSON.stringify(pay[0].raw)).not.toContain('mac');
    expect(vi.mocked(sendOrderTickets)).toHaveBeenCalledTimes(1);
  });

  it('importo diverso: l’ordine non diventa pagato e parte un solo allarme', async () => {
    vi.mocked(sendAlert).mockClear();
    const r = await order();
    const form = paymentForm({ code: r.code, totalCents: r.totalCents });
    const p = nexiResult(form.fields, { importo: '900' });
    expect(await processResult(p, 'server')).toMatchObject({ outcome: 'amount_mismatch' });
    expect(await processResult(p, 'browser')).toMatchObject({ outcome: 'amount_mismatch' });
    expect((await getDb().select().from(ordersV2).where(eq(ordersV2.id, r.id)))[0].status).toBe('pending');
    expect(vi.mocked(sendAlert)).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(sendAlert).mock.calls[0][0])).not.toContain(buyer.email.toLowerCase());
  });

  it('firma falsa o ordine sconosciuto: nulla viene registrato', async () => {
    const r = await order();
    const form = paymentForm({ code: r.code, totalCents: r.totalCents });
    const p = { ...nexiResult(form.fields), mac: 'f'.repeat(40) };
    expect(await processResult(p, 'server')).toEqual({ ok: false, reason: 'mac' });
    expect(await paymentsOf(r.id)).toHaveLength(0);
    expect(await processResult(nexiResult({ codTrans: 'XX99ZZZZ12345678', importo: '1000' }), 'server')).toEqual({ ok: false, reason: 'unknown_order' });
  });

  it('carta rifiutata: pagamento non riuscito, ordine ancora in attesa; un nuovo tentativo paga', async () => {
    const r = await order();
    const first = paymentForm({ code: r.code, totalCents: r.totalCents }, new Date(Date.now() - 60_000));
    expect(await processResult(nexiResult(first.fields, { esito: 'KO', codAut: '' }), 'server')).toMatchObject({ outcome: 'failed', order: { status: 'pending' } });
    const retry = paymentForm({ code: r.code, totalCents: r.totalCents });
    expect(retry.fields.codTrans).not.toBe(first.fields.codTrans);
    expect(await processResult(nexiResult(retry.fields), 'browser')).toMatchObject({ outcome: 'succeeded', order: { status: 'paid' } });
    expect((await paymentsOf(r.id)).map((x) => x.status).sort()).toEqual(['failed', 'succeeded']);
  });

  it('"I miei biglietti": biglietti dell’ordine e cambio data solo se il modulo lo consente', async () => {
    const r = await order();
    const form = paymentForm({ code: r.code, totalCents: r.totalCents });
    await processResult(nexiResult(form.fields), 'server');
    const mine = (await getOrderByToken(r.accessToken))!;
    expect(mine).toMatchObject({ code: r.code, status: 'paid', dateChange: null });
    expect(mine.tickets).toHaveLength(2);
    expect(await getOrderByToken('token-che-non-esiste-1234')).toBeNull();

    expect(await errorCode(customerMoveSession(null, { accessToken: r.accessToken, toSessionId: f.day1.id }))).toBe('FORBIDDEN');
    await getDb()
      .update(editions)
      .set({ moduleSettings: { postponement: { allowCustomerChange: true } } })
      .where(eq(editions.id, f.edition.id));
    const fresh = await createEdition();
    expect(await errorCode(customerMoveSession(null, { accessToken: r.accessToken, toSessionId: fresh.day1.id }))).toBe('VALIDATION');
    expect((await getOrderByToken(r.accessToken))!.dateChange!.map((d) => d.id)).toContain(f.day1.id);
    // day1 è pieno (2 posti già presi dal test della data esaurita): il cambio rispetta la capienza.
    expect(await errorCode(customerMoveSession(null, { accessToken: r.accessToken, toSessionId: f.day1.id }))).toBe('SOLD_OUT');
  });

  it('il token sbagliato non sposta nulla', async () => {
    expect(await errorCode(customerMoveSession(anon.ip, { accessToken: 'x'.repeat(32), toSessionId: f.day1.id }))).toBe('NOT_FOUND');
  });
});
