// Ciclo di vita delle edizioni su un Postgres vero (npm run test:db): l'intero percorso da bozza ad
// archiviata con la checklist di chiusura, l'esaurita automatica e la sola lettura dopo l'archivio.
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { editionReports, editions, sessions, ticketsV2 } from '@/server/db/schema';
import { revertCheckin, saveCheckinList, scan } from '@/server/domain/checkin';
import { applyScannerAction } from '@/server/domain/checkin/actions';
import { syncOfflineCheckins } from '@/server/domain/checkin/offline';
import { resetOrderNumbering, saveRegister, setRegisterActive } from '@/server/domain/cash/registers';
import { sell } from '@/server/domain/cash/sales';
import { closeSession, openSession } from '@/server/domain/cash/sessions';
import { voidSale } from '@/server/domain/cash/void';
import { deleteDiscount, deleteProduct, deleteQuota, deleteSession, saveDiscount, saveProduct, saveQuota, saveSession } from '@/server/domain/catalog';
import { DomainError } from '@/server/domain/errors';
import { on, type DomainEvent } from '@/server/domain/events';
import { addLines, cancelOrder, createOrder, moveSession, resendTickets, type CreateOrderInput } from '@/server/domain/orders';
import { recordPayment } from '@/server/domain/payments';
import { createRefund, requestRefund } from '@/server/domain/refunds';
import { moveAllOrders, postponeSession } from '@/modules/postponement/server';
import { createPaylinkOrder } from '@/modules/paylink/server';
import { anon, buyer, createEdition, key, makeSalesReady, owner, roleOn, system, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { changeEditionStatus, updateEdition } from './index';
import { saveModuleSettings, setModuleEnabled } from './modules';
import { getClosingChecklist, skipClosingCheck, unskipClosingCheck } from './closing';
import { generateFinalReport, latestFinalReport } from './final-report';

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

const events: DomainEvent[] = [];
const statusOf = async (id: string) => (await getDb().select({ s: editions.status }).from(editions).where(eq(editions.id, id)))[0].s;

describe.skipIf(!enabled)('ciclo di vita delle edizioni', () => {
  const online = (f: Fixture, over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
    editionId: f.edition.id,
    channel: 'online',
    customer: buyer,
    lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }],
    idempotencyKey: key(),
    ...over,
  });

  beforeAll(() => {
    on('*', (e) => void events.push(e));
  });
  afterAll(async () => {
    await closeTestDb();
  });

  it('percorre bozza → archiviata: ogni passaggio emette il suo evento, l’archivio aspetta la checklist', async () => {
    const f = await createEdition({ status: 'draft', modules: ['time-slots', 'visitor-photos'] });
    await makeSalesReady(f.edition.id);
    for (const to of ['published', 'on_sale', 'live', 'concluded'] as const) await changeEditionStatus(owner, f.slug, { to });
    expect(events.filter((e) => e.type.startsWith('edition.') && 'editionId' in e && e.editionId === f.edition.id).map((e) => e.type)).toEqual([
      'edition.published',
      'edition.on_sale',
      'edition.live',
      'edition.concluded',
    ]);
    // Salti non permessi nella macchina a stati.
    expect(await errorCode(changeEditionStatus(owner, f.slug, { to: 'on_sale' }))).toBe('CONFLICT');

    // Un ordine ancora in attesa e il rendiconto mancante bloccano l'archivio.
    await getDb().update(editions).set({ status: 'on_sale' }).where(eq(editions.id, f.edition.id));
    await createOrder(anon, online(f));
    await getDb().update(editions).set({ status: 'concluded' }).where(eq(editions.id, f.edition.id));
    const list = await getClosingChecklist(owner, f.slug);
    expect(list.items.map((i) => i.key)).toEqual(['core:cash-sessions', 'core:pending-orders', 'core:refunds-closed', 'core:final-report', 'time-slots:sessions-closed', 'visitor-photos:photos-moderated']);
    expect(list.items.find((i) => i.key === 'core:pending-orders')).toMatchObject({ ok: false, detail: '1 ordine in attesa' });
    expect(list.complete).toBe(false);
    expect(await errorCode(changeEditionStatus(owner, f.slug, { to: 'archived' }))).toBe('CONFLICT');

    // Solo owner e admin saltano, e con un motivo.
    expect(await errorCode(skipClosingCheck(roleOn('event_manager', f.slug), f.slug, { key: 'core:pending-orders', reason: 'Ordine di prova' }))).toBe('FORBIDDEN');
    expect(await errorCode(skipClosingCheck(owner, f.slug, { key: 'core:pending-orders', reason: 'no' }))).toBe('ZOD');
    for (const k of ['core:pending-orders', 'time-slots:sessions-closed', 'visitor-photos:photos-moderated']) await skipClosingCheck(owner, f.slug, { key: k, reason: 'Ordine di prova lasciato apposta' });
    await unskipClosingCheck(owner, f.slug, 'core:pending-orders');
    expect((await getClosingChecklist(owner, f.slug)).items.find((i) => i.key === 'core:pending-orders')!.skipped).toBeNull();
    await skipClosingCheck(owner, f.slug, { key: 'core:pending-orders', reason: 'Ordine di prova lasciato apposta' });

    await generateFinalReport(owner, f.slug);
    const report = (await latestFinalReport(owner, f.slug))!;
    expect(report.csv).toContain('Incasso netto');
    expect(Buffer.from(report.pdfBase64, 'base64').subarray(0, 4).toString()).toBe('%PDF');
    expect((await getClosingChecklist(owner, f.slug)).complete).toBe(true);

    // Archiviare resta di owner e admin.
    expect(await errorCode(changeEditionStatus(roleOn('event_manager', f.slug), f.slug, { to: 'archived' }))).toBe('FORBIDDEN');
    await changeEditionStatus(owner, f.slug, { to: 'archived' });
    expect(await statusOf(f.edition.id)).toBe('archived');
    expect(events.some((e) => e.type === 'edition.archived' && e.edition === f.slug)).toBe(true);
  });

  it('la checklist mostra solo i controlli dei moduli attivi', async () => {
    const f = await createEdition({ status: 'concluded', modules: [] });
    expect((await getClosingChecklist(owner, f.slug)).items.every((i) => i.module === null)).toBe(true);
  });

  it('esaurita in automatico quando i posti finiscono, e di nuovo in vendita quando si liberano', async () => {
    const f = await createEdition();
    // Resta in vendita solo il sabato, con 2 posti (spostato nel futuro: contano solo le date ancora da fare).
    await getDb().update(sessions).set({ status: 'closed' }).where(eq(sessions.id, f.day2.id));
    await getDb().update(sessions).set({ startsAt: sql`${sessions.startsAt} + interval '5 years'` }).where(eq(sessions.id, f.day1.id));
    const one = () => createOrder(anon, online(f, { lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day1.id }] }));
    await one();
    expect(await statusOf(f.edition.id)).toBe('on_sale');
    const second = await one();
    expect(await statusOf(f.edition.id)).toBe('sold_out');
    expect(events.some((e) => e.type === 'edition.sold_out' && e.edition === f.slug && e.automatic)).toBe(true);
    await cancelOrder(owner, { orderId: second.id, reason: 'Prova' });
    expect(await statusOf(f.edition.id)).toBe('on_sale');
  });

  it('dopo l’archivio ogni servizio di scrittura risponde EDITION_ARCHIVED', async () => {
    const f = await createEdition();
    const paid = await createOrder(owner, { ...online(f, { channel: 'admin', payNow: 'cash' }) });
    const pending = await createOrder(anon, online(f));
    const [t] = await getDb().select().from(ticketsV2).where(eq(ticketsV2.orderId, paid.id));
    const checkin = await scan(roleOn('gate', f.slug), { qrToken: t.qrToken, checkinListId: f.entrance.id });
    const checkinId = checkin.result === 'valid' ? checkin.checkinId : '';
    const { id: registerId } = await saveRegister(owner, f.slug, null, { name: 'Cassa 1', issuesNumbers: true, active: true, productIds: null });
    const { sessionId: cashSessionId } = await openSession(owner, { registerId, openingFloatCents: 0 });
    const sale = await sell(owner, { cashSessionId, lines: [{ productId: f.drink.id, quantity: 1 }], method: 'cash', cashReceivedCents: 100, idempotencyKey: key() });
    await getDb().update(editions).set({ status: 'archived' }).where(eq(editions.id, f.edition.id));

    const attempts: Record<string, () => Promise<unknown>> = {
      updateEdition: () => updateEdition(owner, f.slug, { title: 'Nuovo titolo', seriesId: null, startsDate: null, startsTime: null, endsDate: null, endsTime: null, publicPageMode: 'generic' }),
      changeEditionStatus: () => changeEditionStatus(owner, f.slug, { to: 'concluded' }),
      setModuleEnabled: () => setModuleEnabled(owner, f.slug, { module: 'reviews', enabled: false }),
      saveModuleSettings: () => saveModuleSettings(owner, f.slug, { module: 'reviews', settings: {} }),
      saveSession: () => saveSession(owner, f.slug, null, { label: 'Nuova', date: '2026-10-31', startTime: '10:00', endTime: null, capacity: null, status: 'open' }),
      deleteSession: () => deleteSession(owner, f.slug, f.day1.id),
      saveProduct: () => saveProduct(owner, f.slug, f.drink.id, { name: 'Acqua', kind: 'drink', priceCents: 100, description: null, icon: null, channels: ['pos'], requiresSession: false, issuesTicket: false, department: null, active: true, minPerOrder: null, maxPerOrder: null }),
      deleteProduct: () => deleteProduct(owner, f.slug, f.lab.id),
      saveQuota: () => saveQuota(owner, f.slug, f.labQuota.id, { name: 'Lab', size: 2, sessionId: null, productIds: [f.lab.id] }),
      deleteQuota: () => deleteQuota(owner, f.slug, f.labQuota.id),
      saveDiscount: () => saveDiscount(owner, f.slug, null, { code: 'ARCH', kind: 'percent', value: 10, maxUses: null, validFrom: null, validUntil: null, appliesToProductIds: [], active: true }),
      deleteDiscount: () => deleteDiscount(owner, f.slug, f.labQuota.id),
      createOrder: () => createOrder(anon, online(f)),
      createPaylinkOrder: () => createPaylinkOrder(owner, { editionId: f.edition.id, customer: buyer, lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }], idempotencyKey: key() }),
      addLines: () => addLines(owner, { orderId: paid.id, lines: [{ productId: f.ticket.id, quantity: 1, sessionId: f.day2.id }], idempotencyKey: key() }),
      recordPayment: () => recordPayment(system, { orderId: pending.id, method: 'nexi', amountCents: 500, status: 'succeeded', providerRef: `arch-${pending.id}` }),
      cancelOrder: () => cancelOrder(owner, { orderId: pending.id, reason: 'Prova' }),
      moveSession: () => moveSession(owner, { orderId: paid.id, toSessionId: f.day1.id }),
      resendTickets: () => resendTickets(owner, { orderId: paid.id }),
      createRefund: () => createRefund(owner, { orderId: paid.id, amountCents: 100, method: 'cash', reason: 'Prova' }),
      requestRefund: () => requestRefund(anon, { orderCode: paid.code, accessToken: paid.accessToken, reason: 'Prova', iban: 'IT60X0542811101000000123456', holderName: 'Mario Rossi' }),
      scan: () => scan(roleOn('gate', f.slug), { qrToken: t.qrToken, checkinListId: f.entrance.id }),
      revertCheckin: () => revertCheckin(owner, { checkinId, reason: 'Prova' } as never),
      saveCheckinList: () => saveCheckinList(owner, f.slug, null, { name: 'Nuova' }),
      postponeSession: () => postponeSession(owner, { editionId: f.edition.id, sessionId: f.day1.id, toSessionId: f.day2.id }),
      moveAllOrders: () => moveAllOrders(owner, { editionId: f.edition.id, fromSessionId: f.day2.id, toSessionId: f.day1.id }),
      saveRegister: () => saveRegister(owner, f.slug, null, { name: 'Cassa 2', issuesNumbers: true, active: true, productIds: null }),
      setRegisterActive: () => setRegisterActive(owner, f.slug, registerId, false),
      resetOrderNumbering: () => resetOrderNumbering(owner, f.slug, 1),
      openSession: () => openSession(owner, { registerId, openingFloatCents: 0 }),
      sell: () => sell(owner, { cashSessionId, lines: [{ productId: f.drink.id, quantity: 1 }], method: 'cash', cashReceivedCents: 100, idempotencyKey: key() }),
      voidSale: () => voidSale(owner, { orderId: sale.orderId, reason: 'Prova' }),
      closeSession: () => closeSession(owner, { sessionId: cashSessionId, denominations: { '100': 1 }, notes: null }),
      applyScannerAction: () => applyScannerAction(owner, { orderId: paid.id, actionKey: 'counter-0' }),
      skipClosingCheck: () => skipClosingCheck(owner, f.slug, { key: 'core:final-report', reason: 'Prova di scrittura' }),
      unskipClosingCheck: () => unskipClosingCheck(owner, f.slug, 'core:final-report'),
      generateFinalReport: () => generateFinalReport(owner, f.slug),
    };
    const results = Object.fromEntries(await Promise.all(Object.entries(attempts).map(async ([name, fn]) => [name, await errorCode(fn())])));
    expect(results).toEqual(Object.fromEntries(Object.keys(attempts).map((name) => [name, 'EDITION_ARCHIVED'])));
    // La sincronizzazione offline risponde per ogni ingresso invece di lanciare l'errore.
    const [synced] = await syncOfflineCheckins(roleOn('gate', f.slug), { items: [{ clientId: key(), qrToken: t.qrToken, checkinListId: f.entrance.id }] } as never);
    expect(synced).toMatchObject({ result: 'error', message: new DomainError('EDITION_ARCHIVED').message });
    expect(await getDb().select().from(editionReports).where(eq(editionReports.editionId, f.edition.id))).toHaveLength(0);
  });
});
