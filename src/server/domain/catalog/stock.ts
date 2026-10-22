import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { withTransaction, type Tx } from '@/server/db/client';
import { products, quotaProducts, quotas } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { assertCan, editionForWrite } from '@/server/domain/editions';
import { DomainError } from '@/server/domain/errors';
import { soldCounts } from '@/server/domain/orders/shared';

/*
 * "Pezzi disponibili" dei prodotti di cassa (§5.4: le scorte dei prodotti di cassa sono quote, nessun
 * caso speciale). La scorta di un prodotto è la sua quota personale: senza data e con quel solo
 * prodotto (il backfill la chiama "Scorta: <prodotto>"). Così ogni vendita la consuma dentro la
 * transazione di createOrder con la quota bloccata (FOR UPDATE, SOLD_OUT se non basta), e un annullo
 * la restituisce perché l'ordine annullato non conta più tra i venduti.
 *
 * L'admin scrive quanti pezzi restano ADESSO: la quota diventa venduti + rimasti, calcolata con la
 * quota bloccata, così una vendita che arriva nello stesso istante non si perde.
 */

export const STOCK_QUOTA_PREFIX = 'Scorta: ';

/** Pezzi scrivibili in "Pezzi disponibili" (null = senza limite). */
export const StockInput = z.object({
  productId: z.uuid(),
  remaining: z.number({ error: 'Scrivi quanti pezzi restano.' }).int('Solo numeri interi.').min(0, 'I pezzi non possono essere negativi.').max(100_000, 'Al massimo 100.000 pezzi.').nullable(),
});
export type StockInput = z.input<typeof StockInput>;

/** Un prodotto ha la scorta in "Pezzi disponibili" se si vende in cassa, senza data e non è "Altro". */
export function hasStockField(p: { channels: string[]; requiresSession: boolean; openPrice: boolean }): boolean {
  return p.channels.includes('pos') && !p.requiresSession && !p.openPrice;
}

type QuotaLike = { id: string; size: number; sessionId: string | null; productIds: string[] };

/**
 * La quota personale del prodotto: senza data e con quel solo prodotto. Se ce n'è più d'una vale la
 * più piccola, come nel calcolo della disponibilità.
 */
export function pickStockQuota<Q extends QuotaLike>(list: Q[], productId: string): Q | null {
  return (
    list
      .filter((q) => q.sessionId === null && q.productIds.length === 1 && q.productIds[0] === productId)
      .sort((a, b) => a.size - b.size || a.id.localeCompare(b.id))[0] ?? null
  );
}

/** La quota personale del prodotto, bloccata (lo stesso blocco che prende ogni vendita). */
async function lockStockQuota(tx: Tx, editionId: string, productId: string) {
  const links = await tx.select({ quotaId: quotaProducts.quotaId }).from(quotaProducts).where(eq(quotaProducts.productId, productId));
  if (!links.length) return null;
  const ids = links.map((l) => l.quotaId);
  const [candidates, allLinks] = await Promise.all([
    tx.select().from(quotas).where(and(inArray(quotas.id, ids), eq(quotas.editionId, editionId), isNull(quotas.sessionId))),
    tx.select().from(quotaProducts).where(inArray(quotaProducts.quotaId, ids)),
  ]);
  const own = pickStockQuota(
    candidates.map((q) => ({ ...q, productIds: allLinks.filter((l) => l.quotaId === q.id).map((l) => l.productId) })),
    productId,
  );
  if (!own) return null;
  const [locked] = await tx.select().from(quotas).where(eq(quotas.id, own.id)).for('update');
  return locked ?? null;
}

/** Pezzi venduti del prodotto (pagati e in attesa non scaduti), come li conta reserveSeats. */
async function soldOf(tx: Tx, editionId: string, productId: string): Promise<number> {
  const sold = await soldCounts(tx, editionId, { now: new Date() });
  let n = 0;
  for (const [key, count] of sold) if (key.startsWith(`${productId}|`)) n += count;
  return n;
}

/**
 * Imposta i pezzi rimasti di un prodotto di cassa (permesso catalog.edit). null toglie il limite.
 * Restituisce i pezzi rimasti e la dimensione della quota.
 */
export async function setProductStock(ctx: Ctx, slug: string, input: StockInput): Promise<{ remaining: number | null; size: number | null }> {
  assertCan(ctx, 'catalog.edit', slug);
  const data = StockInput.parse(input);
  return withTransaction(async (tx) => {
    const edition = await editionForWrite(tx, slug);
    // Il prodotto bloccato mette in fila due modifiche della scorta fatte insieme (NO KEY UPDATE: non
    // ferma le vendite, che inseriscono righe d'ordine con la chiave del prodotto).
    const [product] = await tx.select().from(products).where(and(eq(products.id, data.productId), eq(products.editionId, edition.id))).for('no key update');
    if (!product) throw new DomainError('NOT_FOUND');
    if (!hasStockField(product)) throw new DomainError('VALIDATION', { message: 'I pezzi disponibili valgono solo per i prodotti della cassa senza data.' });

    const quota = await lockStockQuota(tx, edition.id, product.id);
    const sold = await soldOf(tx, edition.id, product.id);
    const before = quota ? { remaining: Math.max(0, quota.size - sold), size: quota.size } : { remaining: null, size: null };

    if (data.remaining === null) {
      if (quota) {
        await tx.delete(quotas).where(eq(quotas.id, quota.id));
        await audit(tx, ctx, 'product.stock_set', { entityType: 'product', entityId: product.id, edition: slug, before, after: { remaining: null, size: null } });
      }
      return { remaining: null, size: null };
    }

    const size = sold + data.remaining;
    if (quota) {
      if (quota.size !== size) await tx.update(quotas).set({ size, updatedAt: new Date() }).where(eq(quotas.id, quota.id));
    } else {
      const [row] = await tx
        .insert(quotas)
        .values({ editionId: edition.id, name: `${STOCK_QUOTA_PREFIX}${product.name}`.slice(0, 80), size, sessionId: null })
        .returning({ id: quotas.id });
      await tx.insert(quotaProducts).values({ quotaId: row.id, productId: product.id });
    }
    if (before.remaining !== data.remaining || before.size !== size) {
      await audit(tx, ctx, 'product.stock_set', { entityType: 'product', entityId: product.id, edition: slug, before, after: { remaining: data.remaining, size, sold } });
    }
    return { remaining: data.remaining, size };
  });
}
