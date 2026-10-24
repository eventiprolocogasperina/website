// Pezzi disponibili dei prodotti di cassa su un Postgres vero (npm run test:db): la scorta è la quota
// personale del prodotto (§5.4), ogni vendita la scala nella sua transazione, l'annullo la restituisce.
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Ctx } from '@/server/auth/context-shared';
import { auditLog, devices, products, quotaProducts, quotas } from '@/server/db/schema';
import { setProductStock } from '@/server/domain/catalog/stock';
import { DomainError } from '@/server/domain/errors';
import { createEdition, owner, roleOn, type Fixture } from '@/test/fixtures';
import { closeTestDb, getDb } from '@/test/pg-client';
import { getPosCatalog, listPosProducts } from './catalog';
import { saveRegister } from './registers';
import { sell, type SellInput } from './sales';
import { openSession } from './sessions';
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

const k = () => `scorta-${randomUUID()}`;

describe.skipIf(!enabled)('cassa: pezzi disponibili', () => {
  let f: Fixture;
  let registerId: string;
  let sessionId: string;
  let phone: Ctx;
  let phone2: Ctx;
  let panino: typeof products.$inferSelect;
  const sale = (over: Partial<SellInput> = {}): SellInput => ({ cashSessionId: sessionId, lines: [{ productId: panino.id, quantity: 1 }], method: 'cash', idempotencyKey: k(), ...over });
  const remaining = async (productId = panino.id) => (await getPosCatalog(registerId)).products.find((p) => p.id === productId)!.remaining;

  async function device(name: string): Promise<Ctx> {
    const [d] = await getDb().insert(devices).values({ name, tokenHash: randomUUID(), editionSlug: f.slug, kind: 'pos' }).returning();
    return { user: null, device: { id: d.id, name, edition: f.slug, kind: 'pos' }, legacy: false, grants: [{ role: 'cashier', edition: f.slug }], ip: null };
  }

  beforeAll(async () => {
    f = await createEdition();
    [panino] = await getDb().insert(products).values({ editionId: f.edition.id, kind: 'food', name: 'Panino', priceCents: 650, channels: ['pos'] }).returning();
    phone = await device('Telefono 1');
    phone2 = await device('Telefono 2');
    ({ id: registerId } = await saveRegister(owner, f.slug, null, { name: 'Cassa 1', issuesNumbers: true, active: true, productIds: null }));
    ({ sessionId } = await openSession(phone, { registerId, openingFloatCents: 0 }));
  });
  afterAll(async () => {
    await closeTestDb();
  });

  it('senza scorta: nessun limite; i permessi e i prodotti non di cassa si rifiutano', async () => {
    expect(await remaining()).toBeNull();
    expect(await errorCode(setProductStock(roleOn('cashier', f.slug), f.slug, { productId: panino.id, remaining: 5 }))).toBe('FORBIDDEN');
    expect(await errorCode(setProductStock(owner, f.slug, { productId: f.ticket.id, remaining: 5 }))).toBe('VALIDATION');
    expect(await errorCode(setProductStock(owner, f.slug, { productId: panino.id, remaining: -1 }))).toBe('ZOD');
  });

  it('imposta i pezzi rimasti: crea la quota personale del prodotto, la cassa e l’admin la vedono', async () => {
    expect(await setProductStock(owner, f.slug, { productId: panino.id, remaining: 3 })).toEqual({ remaining: 3, size: 3 });
    expect(await remaining()).toBe(3);
    expect((await listPosProducts(f.edition.id)).find((p) => p.id === panino.id)?.remaining).toBe(3);
    const links = await getDb().select({ q: quotas }).from(quotaProducts).innerJoin(quotas, eq(quotas.id, quotaProducts.quotaId)).where(eq(quotaProducts.productId, panino.id));
    expect(links.map((l) => l.q.name)).toEqual(['Scorta: Panino']);
    const [log] = await getDb().select().from(auditLog).where(and(eq(auditLog.action, 'product.stock_set'), eq(auditLog.entityId, panino.id)));
    expect(log.after).toMatchObject({ remaining: 3, size: 3 });
  });

  it('ogni vendita scala i pezzi; oltre la scorta si rifiuta con un messaggio chiaro', async () => {
    await sell(phone, sale({ lines: [{ productId: panino.id, quantity: 2 }] }));
    expect(await remaining()).toBe(1);
    const refused = sell(phone, sale({ lines: [{ productId: panino.id, quantity: 2 }] }));
    await expect(refused).rejects.toMatchObject({ code: 'SOLD_OUT', message: 'Pezzi non sufficienti. Panino: ne resta 1. Togli dal carrello quello che manca.' });
    expect(await remaining()).toBe(1);
  });

  it('due telefoni sull’ultimo pezzo: uno vende, l’altro riceve "esaurito"', async () => {
    const results = await Promise.allSettled([sell(phone, sale()), sell(phone2, sale())]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(failed.reason).toMatchObject({ code: 'SOLD_OUT', message: 'Pezzi non sufficienti. Panino è esaurito. Togli dal carrello quello che manca.' });
    expect(await remaining()).toBe(0);
  });

  it('l’annullo restituisce i pezzi', async () => {
    // 3 panini venduti finora: rimettiamo un pezzo, lo vendiamo e annulliamo la vendita.
    await setProductStock(owner, f.slug, { productId: panino.id, remaining: 1 });
    const one = await sell(phone, sale());
    expect(await remaining()).toBe(0);
    await voidSale(owner, { orderId: one.orderId, reason: 'Panino caduto', cashSessionId: sessionId });
    expect(await remaining()).toBe(1);
  });

  it('i pezzi scritti sono quelli rimasti adesso: le vendite già fatte restano contate', async () => {
    // 3 venduti finora (2 + 1, l'ultimo annullato non conta): 10 rimasti → quota da 13.
    expect(await setProductStock(owner, f.slug, { productId: panino.id, remaining: 10 })).toEqual({ remaining: 10, size: 13 });
    expect(await remaining()).toBe(10);
    // Vuoto = senza limite: la quota personale sparisce, le vendite restano.
    expect(await setProductStock(owner, f.slug, { productId: panino.id, remaining: null })).toEqual({ remaining: null, size: null });
    expect(await remaining()).toBeNull();
    expect((await sell(phone, sale({ lines: [{ productId: panino.id, quantity: 20 }] }))).totalCents).toBe(20 * 650);
  });

  it('mai in un’edizione archiviata', async () => {
    const g = await createEdition({ status: 'archived' });
    expect(await errorCode(setProductStock(owner, g.slug, { productId: g.drink.id, remaining: 3 }))).toBe('EDITION_ARCHIVED');
  });
});
