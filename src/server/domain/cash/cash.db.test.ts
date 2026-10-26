// Cassa su un Postgres vero (npm run test:db): turni, vendite da due telefoni sull'ultima porzione,
// idempotenza della coda offline, annullo con PIN del responsabile, chiusura Z che quadra col rendiconto.
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Ctx } from '@/server/auth/context-shared';
import { hashPassword } from '@/server/auth/password';
import { auditLog, cashSales, devices, editions, orderLines, ordersV2, payments, products, quotaProducts, quotas, refundsV2, roleAssignments, users } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { createEdition, owner, roleOn, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { getPosCatalog } from './catalog';
import { departmentQueue, readyNumbers, setPrepStatus } from './departments';
import { saveRegister } from './registers';
import { cashReport, reportCsv } from './report';
import { sell, type SellInput } from './sales';
import { closeSession, openSession, sessionSummary } from './sessions';
import { voidSale } from './void';
import { changeSaleMethod, findSalesByNumber } from './correct';

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

const k = () => `cassa-${randomUUID()}`;

describe.skipIf(!enabled)('cassa sul database', () => {
  let f: Fixture;
  let registerId: string;
  let sessionId: string;
  let phone1: Ctx;
  let phone2: Ctx;
  let manager: { id: string };
  let panino: typeof products.$inferSelect;

  async function person(name: string, role: 'cashier' | 'event_manager', pin: string) {
    const [u] = await getDb().insert(users).values({ name, pinHash: hashPassword(pin) }).returning();
    await getDb().insert(roleAssignments).values({ userId: u.id, role, editionSlug: f.slug });
    return u;
  }
  async function phone(name: string, user: { id: string; name: string }): Promise<Ctx> {
    const [d] = await getDb().insert(devices).values({ name, tokenHash: randomUUID(), editionSlug: f.slug, kind: 'pos' }).returning();
    return { user: { id: user.id, name: user.name, email: null }, device: { id: d.id, name, edition: f.slug, kind: 'pos' }, legacy: false, grants: [{ role: 'cashier', edition: f.slug }], ip: null };
  }
  const sale = (over: Partial<SellInput> = {}): SellInput => ({ cashSessionId: sessionId, lines: [{ productId: f.drink.id, quantity: 2 }], method: 'cash', idempotencyKey: k(), ...over });

  beforeAll(async () => {
    f = await createEdition();
    [panino] = await getDb().insert(products).values({ editionId: f.edition.id, kind: 'food', name: 'Panino', priceCents: 650, channels: ['pos'], department: 'Griglia' }).returning();
    const [q] = await getDb().insert(quotas).values({ editionId: f.edition.id, name: 'Scorta panini', size: 3 }).returning();
    await getDb().insert(quotaProducts).values({ quotaId: q.id, productId: panino.id });
    const anna = await person('Anna Cassa', 'cashier', '1111');
    const bruno = await person('Bruno Cassa', 'cashier', '2222');
    manager = await person('Marta Responsabile', 'event_manager', '9876');
    phone1 = await phone('Telefono 1', anna);
    phone2 = await phone('Telefono 2', bruno);
    ({ id: registerId } = await saveRegister(owner, f.slug, null, { name: 'Cassa 1', issuesNumbers: true, active: true, productIds: null }));
  });
  afterAll(async () => {
    await closeTestDb();
  });

  it('apre il turno col fondo cassa; il secondo telefono si unisce allo stesso turno', async () => {
    expect(await errorCode(openSession(roleOn('gate', f.slug), { registerId, openingFloatCents: 5000 }))).toBe('FORBIDDEN');
    const a = await openSession(phone1, { registerId, openingFloatCents: 5000 });
    const b = await openSession(phone2, { registerId, openingFloatCents: 999 });
    expect(a.joined).toBe(false);
    expect(b).toEqual({ sessionId: a.sessionId, joined: true });
    sessionId = a.sessionId;
  });

  it('vende in contanti: prezzi del server, resto, numero progressivo, pagamento legato al turno', async () => {
    const r = await sell(phone1, sale({ cashReceivedCents: 500 }));
    expect(r).toMatchObject({ totalCents: 200, changeCents: 300, number: 1, created: true, method: 'cash', registerName: 'Cassa 1' });
    const r2 = await sell(phone2, sale({ method: 'card_pos', lines: [{ productId: f.drink.id, quantity: 1 }] }));
    expect(r2.number).toBe(2);
    const [order] = await getDb().select().from(ordersV2).where(eq(ordersV2.id, r.orderId));
    expect(order).toMatchObject({ channel: 'pos', status: 'paid', cashSessionId: sessionId, operatorId: phone1.user!.id, deviceId: phone1.device!.id });
    const [pay] = await getDb().select().from(payments).where(eq(payments.orderId, r.orderId));
    expect(pay).toMatchObject({ method: 'cash', amountCents: 200, cashSessionId: sessionId });
    expect(await errorCode(sell(phone1, sale({ expectedTotalCents: 150 })))).toBe('PRICE_CHANGED');
    expect(await errorCode(sell(phone1, sale({ cashReceivedCents: 100 })))).toBe('VALIDATION');
    expect(await errorCode(sell(phone1, sale({ method: 'complimentary' })))).toBe('ZOD');
    const omaggio = await sell(phone1, sale({ method: 'complimentary', complimentaryReason: 'Sindaco' }));
    expect(omaggio).toMatchObject({ method: 'complimentary', complimentaryReason: 'Sindaco' });
  });

  it('due telefoni vendono insieme l’ultima porzione: una vendita passa, l’altra riceve SOLD_OUT', async () => {
    await sell(phone1, sale({ lines: [{ productId: panino.id, quantity: 2 }] }));
    const results = await Promise.allSettled([
      sell(phone1, sale({ lines: [{ productId: panino.id, quantity: 1 }] })),
      sell(phone2, sale({ lines: [{ productId: panino.id, quantity: 1 }] })),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect((failed.reason as DomainError).code).toBe('SOLD_OUT');
    const catalog = await getPosCatalog(registerId);
    expect(catalog.products.find((p) => p.id === panino.id)?.remaining).toBe(0);
  });

  it('sincronizzazione idempotente: la stessa chiave inviata due volte (anche insieme) crea una sola vendita', async () => {
    const input = sale({ offlineAt: new Date(Date.now() - 60_000).toISOString() as never });
    const [a, b] = await Promise.all([sell(phone1, input), sell(phone1, input)]);
    expect(a.orderId).toBe(b.orderId);
    expect([a.created, b.created].sort()).toEqual([false, true]);
    const again = await sell(phone1, input);
    expect(again).toMatchObject({ orderId: a.orderId, created: false, number: a.number });
    expect(await getDb().select().from(payments).where(eq(payments.orderId, a.orderId))).toHaveLength(1);
    expect(await getDb().select().from(cashSales).where(eq(cashSales.orderId, a.orderId))).toHaveLength(1);
  });

  it('una vendita offline oltre la scorta si accetta ma resta segnalata', async () => {
    expect(await errorCode(sell(phone2, sale({ lines: [{ productId: panino.id, quantity: 1 }] })))).toBe('SOLD_OUT');
    const r = await sell(phone2, sale({ lines: [{ productId: panino.id, quantity: 1 }], offlineAt: new Date(Date.now() - 120_000).toISOString() as never }));
    expect(r.oversold).toBe(true);
  });

  it('una cassa limitata a certi prodotti rifiuta gli altri', async () => {
    const { id } = await saveRegister(owner, f.slug, null, { name: 'Bar', issuesNumbers: false, active: true, productIds: [f.drink.id] });
    const s = await openSession(phone2, { registerId: id, openingFloatCents: 0 });
    expect(await errorCode(sell(phone2, sale({ cashSessionId: s.sessionId, lines: [{ productId: panino.id, quantity: 1 }] })))).toBe('VALIDATION');
    const ok = await sell(phone2, sale({ cashSessionId: s.sessionId }));
    expect(ok.number).toBeNull();
    expect((await getPosCatalog(id)).products.map((p) => p.id)).toEqual([f.drink.id]);
  });

  it('annullo: serve il PIN di un responsabile, lo storno torna dal turno e la scorta si libera', async () => {
    const r = await sell(phone1, sale({ lines: [{ productId: f.drink.id, quantity: 3 }], cashReceivedCents: 300 }));
    expect(await errorCode(voidSale(phone1, { orderId: r.orderId, reason: 'Errore di battitura' }))).toBe('FORBIDDEN');
    expect(await errorCode(voidSale(phone1, { orderId: r.orderId, reason: 'Errore', managerUserId: manager.id, managerPin: '0000' }))).toBe('FORBIDDEN');
    const [after] = await getDb().select().from(users).where(eq(users.id, manager.id));
    expect(after.pinFailedAttempts).toBe(1);
    expect(await errorCode(voidSale(phone1, { orderId: r.orderId, reason: 'Errore', managerUserId: phone2.user!.id, managerPin: '2222' }))).toBe('FORBIDDEN');

    const done = await voidSale(phone1, { orderId: r.orderId, reason: 'Errore di battitura', managerUserId: manager.id, managerPin: '9876', cashSessionId: sessionId });
    expect(done.refundedCents).toBe(300);
    const [order] = await getDb().select().from(ordersV2).where(eq(ordersV2.id, r.orderId));
    expect(order.status).toBe('cancelled');
    const [refund] = await getDb().select().from(refundsV2).where(eq(refundsV2.orderId, r.orderId));
    expect(refund).toMatchObject({ method: 'cash', status: 'paid', amountCents: 300, cashSessionId: sessionId });
    const [cs] = await getDb().select().from(cashSales).where(eq(cashSales.orderId, r.orderId));
    expect(cs).toMatchObject({ voidApprovedBy: manager.id, voidReason: 'Errore di battitura' });
    expect(await errorCode(voidSale(phone1, { orderId: r.orderId, reason: 'Ancora', managerUserId: manager.id, managerPin: '9876' }))).toBe('CONFLICT');
  });

  it('correzione del metodo: contanti → POS con il motivo nel registro, solo per chi può annullare', async () => {
    const r = await sell(phone1, sale({ cashReceivedCents: 1000 }));
    if (r.number !== null) {
      const found = await findSalesByNumber(owner, f.slug, r.number);
      expect(found.find((x) => x.orderId === r.orderId)).toMatchObject({ method: 'cash', voided: false });
    }
    expect(await errorCode(changeSaleMethod(phone1, { orderId: r.orderId, method: 'card_pos', reason: 'Pagato col POS' }))).toBe('FORBIDDEN');
    expect(await errorCode(changeSaleMethod(owner, { orderId: r.orderId, method: 'cash', reason: 'Nessun cambio' }))).toBe('CONFLICT');
    expect(await changeSaleMethod(owner, { orderId: r.orderId, method: 'card_pos', reason: 'Pagato col POS' })).toEqual({ from: 'cash', to: 'card_pos' });
    const pays = await getDb().select().from(payments).where(eq(payments.orderId, r.orderId));
    expect(pays.map((p) => [p.method, p.amountCents])).toEqual([['card_pos', r.totalCents]]);
    const [log] = await getDb().select().from(auditLog).where(and(eq(auditLog.entityId, r.orderId), eq(auditLog.action, 'cash.sale_method_changed')));
    expect(log).toMatchObject({ reason: 'Pagato col POS', before: { method: 'cash' }, after: { method: 'card_pos' } });
  });

  it('chiusura Z: atteso contro contato, nota oltre 1 €, numero progressivo, totali uguali al rendiconto', async () => {
    const live = await sessionSummary(phone1, sessionId);
    // Fondo 50 € + contanti incassati − storni in contanti del turno.
    const cashIn = live.totals.byMethod.find((m) => m.method === 'cash')!;
    expect(live.expectedCashCents).toBe(5000 + cashIn.amountCents - cashIn.refundedCents);

    const exact = { '5000': 1, '100': Math.floor((live.expectedCashCents - 5000) / 100), '1': (live.expectedCashCents - 5000) % 100 };
    const short = { ...exact, '5000': 0 };
    expect(await errorCode(closeSession(phone1, { sessionId, denominations: short }))).toBe('VALIDATION');
    expect(await errorCode(closeSession(phone1, { sessionId, denominations: { '300': 1 } }))).toBe('VALIDATION');
    const z = await closeSession(phone1, { sessionId, denominations: exact });
    expect(z).toMatchObject({ zReportNumber: 1, differenceCents: 0, expectedCashCents: live.expectedCashCents });
    expect(await errorCode(closeSession(phone1, { sessionId, denominations: exact }))).toBe('CONFLICT');
    expect(await errorCode(sell(phone1, sale()))).toBe('CONFLICT');

    // Una vendita offline arrivata dopo la chiusura si accetta, segnata "dopo la chiusura".
    const late = await sell(phone1, sale({ offlineAt: new Date(Date.now() - 30_000).toISOString() as never }));
    expect(late.afterClose).toBe(true);

    const report = await cashReport(owner, f.slug);
    const closed = await sessionSummary(owner, sessionId);
    const bar = (await getDb().select().from(cashSales).where(eq(cashSales.editionId, f.edition.id))).filter((s) => s.cashSessionId !== sessionId);
    const barTotal = await getDb().select().from(payments).where(eq(payments.cashSessionId, bar[0].cashSessionId));
    // Rendiconto = Z del turno + vendite fuori dalla Z (cassa Bar + vendita dopo la chiusura).
    expect(report.totals.netCents).toBe(closed.totals.netCents + barTotal.reduce((s, p) => s + p.amountCents, 0) + late.totalCents);
    expect(report.flagged.map((x) => x.orderId)).toContain(late.orderId);
    expect(report.byRegister.map((g) => g.label).sort()).toEqual(['Bar', 'Cassa 1']);
    expect(report.totals.voided).toBe(1);
    const csv = reportCsv(report);
    expect(csv.startsWith('﻿Dimensione;')).toBe(true);
    expect(csv).toContain('Prodotto;Panino');
    expect(csv).not.toMatch(/IVA|fiscale/i);
    expect(await errorCode(cashReport(phone1, f.slug))).toBe('FORBIDDEN');
  });

  it('reparti: comande da preparare, spostamento di colonna, numeri pronti solo con lo schermo acceso', async () => {
    const { sessionId: s2 } = await openSession(phone1, { registerId, openingFloatCents: 0 });
    await getDb().update(quotas).set({ size: 100 }).where(eq(quotas.name, 'Scorta panini'));
    const r = await sell(phone1, { cashSessionId: s2, lines: [{ productId: panino.id, quantity: 2 }, { productId: f.drink.id, quantity: 1 }], method: 'cash', idempotencyKey: k() });
    const lines = await getDb().select().from(orderLines).where(eq(orderLines.orderId, r.orderId));
    expect(lines.find((l) => l.productId === panino.id)?.prepStatus).toBe('pending');
    expect(lines.find((l) => l.productId === f.drink.id)?.prepStatus).toBeNull();

    const queue = await departmentQueue(phone2, f.slug, 'Griglia');
    expect(queue.find((t) => t.orderId === r.orderId)).toMatchObject({ status: 'pending', number: r.number, lines: [{ name: 'Panino', quantity: 2 }] });
    await setPrepStatus(phone2, { orderId: r.orderId, department: 'Griglia', status: 'ready' });
    expect(await readyNumbers(f.slug)).toBeNull();
    await getDb().update(editions).set({ moduleSettings: { departments: { readyScreen: true } } }).where(eq(editions.id, f.edition.id));
    expect((await readyNumbers(f.slug))?.ready).toContainEqual({ number: r.number, department: 'Griglia' });
    expect(await errorCode(setPrepStatus(roleOn('gate', f.slug), { orderId: r.orderId, department: 'Griglia', status: 'delivered' }))).toBe('FORBIDDEN');
    // Un ordine annullato sparisce dallo schermo Pronti e dalle comande.
    await voidSale(owner, { orderId: r.orderId, reason: 'Annullato alla cassa', cashSessionId: s2 });
    expect((await readyNumbers(f.slug))?.ready).not.toContainEqual({ number: r.number, department: 'Griglia' });
    expect((await departmentQueue(phone2, f.slug, 'Griglia')).some((t) => t.orderId === r.orderId)).toBe(false);
  });

  it('un’edizione archiviata non apre turni', async () => {
    const g = await createEdition({ status: 'archived' });
    const [reg] = await getDb().insert((await import('@/server/db/schema')).cashRegisters).values({ editionId: g.edition.id, name: 'Cassa' }).returning();
    expect(await errorCode(openSession(owner, { registerId: reg.id, openingFloatCents: 0 }))).toBe('EDITION_ARCHIVED');
  });
});
