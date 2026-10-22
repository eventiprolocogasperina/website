// "Altro" della cassa su un Postgres vero (npm run test:db): importo libero solo dalla cassa con il
// turno aperto, entro 1000 €, un solo prodotto per edizione, nei pezzi venduti di Z e rendiconto.
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Ctx } from '@/server/auth/context-shared';
import { auditLog, devices, orderLines, products, roleAssignments, users } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { createOrder } from '@/server/domain/orders';
import { createEdition, owner, roleOn, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { ensureOpenPriceProduct, getPosCatalog } from './catalog';
import { saveRegister } from './registers';
import { cashReport } from './report';
import { sell, type SellInput } from './sales';
import { closeSession, openSession, sessionSummary } from './sessions';
import { voidSale } from './void';

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

const k = () => `altro-${randomUUID()}`;

describe.skipIf(!enabled)('cassa: "Altro" a importo libero', () => {
  let f: Fixture;
  let registerId: string;
  let sessionId: string;
  let phone: Ctx;
  let phone2: Ctx;
  const sale = (over: Partial<SellInput> = {}): SellInput => ({ cashSessionId: sessionId, lines: [{ openAmountCents: 350, quantity: 1 }], method: 'cash', idempotencyKey: k(), ...over });
  const openProducts = () => getDb().select().from(products).where(and(eq(products.editionId, f.edition.id), eq(products.openPrice, true)));

  async function cashier(name: string): Promise<Ctx> {
    const [u] = await getDb().insert(users).values({ name }).returning();
    await getDb().insert(roleAssignments).values({ userId: u.id, role: 'cashier', editionSlug: f.slug });
    const [d] = await getDb().insert(devices).values({ name: `Telefono ${name}`, tokenHash: randomUUID(), editionSlug: f.slug, kind: 'pos' }).returning();
    return { user: { id: u.id, name, email: null }, device: { id: d.id, name: d.name, edition: f.slug, kind: 'pos' }, legacy: false, grants: [{ role: 'cashier', edition: f.slug }], ip: null };
  }

  beforeAll(async () => {
    f = await createEdition();
    phone = await cashier('Anna');
    phone2 = await cashier('Bruno');
    // Una cassa che vende solo l'acqua: "Altro" vale lo stesso, su ogni cassa.
    ({ id: registerId } = await saveRegister(owner, f.slug, null, { name: 'Bar', issuesNumbers: true, active: true, productIds: [f.drink.id] }));
    ({ sessionId } = await openSession(phone, { registerId, openingFloatCents: 0 }));
  });
  afterAll(async () => {
    await closeTestDb();
  });

  it('il listino offre "Altro" ma non lo mette tra i prodotti; nessun prodotto creato finché non si vende', async () => {
    const catalog = await getPosCatalog(registerId);
    expect(catalog.openPrice).toEqual({ available: true, maxCents: 100_000 });
    expect(catalog.products.map((p) => p.id)).toEqual([f.drink.id]);
    expect(await openProducts()).toHaveLength(0);
  });

  it('due telefoni alla prima vendita: un solo prodotto "Altro", righe con l’importo digitato, totale del server', async () => {
    const [a, b] = await Promise.all([
      sell(phone, sale({ lines: [{ openAmountCents: 350, quantity: 2 }, { productId: f.drink.id, quantity: 1 }], expectedTotalCents: 800 })),
      sell(phone2, sale({ lines: [{ openAmountCents: 1250, quantity: 1 }] })),
    ]);
    const [altro, ...others] = await openProducts();
    expect(others).toHaveLength(0);
    expect(altro).toMatchObject({ name: 'Altro', channels: ['pos'], priceCents: 0, issuesTicket: false, active: true });
    expect(a).toMatchObject({ totalCents: 800, created: true });
    expect(a.lines.find((l) => l.productId === altro.id)).toMatchObject({ name: 'Altro', quantity: 2, unitPriceCents: 350, totalCents: 700 });
    expect(b.totalCents).toBe(1250);
    const rows = await getDb().select().from(orderLines).where(eq(orderLines.orderId, a.orderId));
    expect(rows.find((l) => l.productId === altro.id)).toMatchObject({ unitPriceCents: 350, quantity: 2, totalCents: 700 });
    const [log] = await getDb().select().from(auditLog).where(and(eq(auditLog.action, 'order.created'), eq(auditLog.entityId, a.orderId)));
    expect(log.after).toMatchObject({ openPriceCents: 700 });
    const created = await getDb().select().from(auditLog).where(and(eq(auditLog.action, 'product.created'), eq(auditLog.entityId, altro.id)));
    expect(created).toHaveLength(1);
    // Il totale mostrato sul telefono si controlla anche con "Altro".
    expect(await errorCode(sell(phone, sale({ expectedTotalCents: 300 })))).toBe('PRICE_CHANGED');
  });

  it('limiti: più di 0 e al massimo 1000 € per riga', async () => {
    for (const openAmountCents of [0, -100, 100_001, 12.5]) expect(await errorCode(sell(phone, sale({ lines: [{ openAmountCents, quantity: 1 }] })))).toBe('ZOD');
    expect((await sell(phone, sale({ lines: [{ openAmountCents: 100_000, quantity: 1 }] }))).totalCents).toBe(100_000);
  });

  it('solo dalla cassa con il turno: mai online, dall’admin o senza turno; mai un prezzo per i prodotti del listino', async () => {
    const [altro] = await openProducts();
    const order = (over: Record<string, unknown>) =>
      createOrder(owner, { editionId: f.edition.id, channel: 'pos', lines: [{ productId: altro.id, quantity: 1, unitPriceCents: 500 }], idempotencyKey: k(), ...over } as never);
    expect(await errorCode(order({}))).toBe('ZOD');
    expect(await errorCode(order({ channel: 'admin', payNow: 'cash' }))).toBe('ZOD');
    expect(await errorCode(order({ channel: 'online', customer: { email: 'a@example.com', name: 'A' } }))).toBe('ZOD');
    expect(await errorCode(order({ cashSessionId: sessionId, lines: [{ productId: f.drink.id, quantity: 1, unitPriceCents: 1 }] }))).toBe('VALIDATION');
    expect(await errorCode(order({ cashSessionId: sessionId, lines: [{ productId: altro.id, quantity: 1 }] }))).toBe('VALIDATION');
    // Chi non vende in cassa non usa "Altro" (e non crea nulla).
    expect(await errorCode(sell(roleOn('gate', f.slug), sale()))).toBe('FORBIDDEN');
  });

  it('spento in Catalogo: niente pulsante e la vendita si rifiuta', async () => {
    const [altro] = await openProducts();
    await getDb().update(products).set({ active: false }).where(eq(products.id, altro.id));
    expect((await getPosCatalog(registerId)).openPrice.available).toBe(false);
    expect(await errorCode(sell(phone, sale()))).toBe('SALES_CLOSED');
    await getDb().update(products).set({ active: true }).where(eq(products.id, altro.id));
  });

  it('pezzi venduti: "Altro" nella Z e nel rendiconto, senza gli annullati', async () => {
    const [altro] = await openProducts();
    const voided = await sell(phone, sale({ lines: [{ openAmountCents: 999, quantity: 1 }] }));
    await voidSale(owner, { orderId: voided.orderId, reason: 'Importo sbagliato', cashSessionId: sessionId });
    const live = await sessionSummary(phone, sessionId);
    // 2×3,50 + 1×12,50 + 1×1000 (la vendita annullata non conta).
    expect(live.totals.products.find((p) => p.productId === altro.id)).toMatchObject({ name: 'Altro', quantity: 4, amountCents: 700 + 1250 + 100_000 });
    expect(live.totals.products.find((p) => p.productId === f.drink.id)).toMatchObject({ quantity: 1, amountCents: 100 });

    const expected = live.expectedCashCents;
    await closeSession(phone, { sessionId, denominations: { '50000': Math.floor(expected / 50000), '1': expected % 50000 } });
    const closed = await sessionSummary(owner, sessionId);
    expect(closed.session.zTotals?.products).toEqual(live.totals.products);
    const report = await cashReport(owner, f.slug);
    expect(report.totals.products).toEqual(live.totals.products);
  });

  it('mai creato in un’edizione archiviata', async () => {
    const g = await createEdition({ status: 'archived' });
    expect(await errorCode(ensureOpenPriceProduct(owner, g.edition.id))).toBe('EDITION_ARCHIVED');
  });
});
