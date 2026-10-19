import 'server-only';
import { and, asc, eq, inArray, isNull, gt, ne, or, sql } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import type { getDb, Tx } from '@/server/db/client';
import { discountsV2, editions, orderLines, ordersV2, products, quotaProducts, quotas, sessions } from '@/server/db/schema';
import { isReadOnly } from '@/server/domain/editions/lifecycle';
import { DomainError } from '@/server/domain/errors';
import { computeAvailability, countsTowardCapacity, sessionQuotaId, soldKey, type SoldCounts } from '@/server/domain/quotas/availability';

export type EditionRow = typeof editions.$inferSelect;
export type OrderRow = typeof ordersV2.$inferSelect;

/** Durata di un ordine in attesa di pagamento, per canale (§5.4: 15 minuti online). */
export const PENDING_TTL_MS: Partial<Record<OrderRow['channel'], number>> = {
  online: 15 * 60_000,
  paylink: 48 * 60 * 60_000,
};

/**
 * Carica l'edizione dentro la transazione con un blocco condiviso: molti ordini insieme sì,
 * un'archiviazione nel frattempo no. Rifiuta le edizioni archiviate.
 */
export async function lockEdition(tx: Tx, editionId: string): Promise<EditionRow> {
  const [row] = await tx.select().from(editions).where(eq(editions.id, editionId)).for('share');
  if (!row) throw new DomainError('NOT_FOUND');
  if (isReadOnly(row.status)) throw new DomainError('EDITION_ARCHIVED');
  return row;
}

/** Ordine da modificare, bloccato, con la sua edizione. */
export async function lockOrder(tx: Tx, orderId: string): Promise<{ order: OrderRow; edition: EditionRow }> {
  const [order] = await tx.select().from(ordersV2).where(and(eq(ordersV2.id, orderId), isNull(ordersV2.deletedAt))).for('update');
  if (!order) throw new DomainError('NOT_FOUND');
  const edition = await lockEdition(tx, order.editionId);
  return { order, edition };
}

/** Errore di vincolo UNIQUE di Postgres (con o senza l'involucro di Drizzle). */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  for (let e: unknown = error, i = 0; e && i < 4; e = (e as { cause?: unknown }).cause, i++) {
    const { code, constraint: name } = e as { code?: string; constraint?: string };
    if (code === '23505') return !constraint || name === constraint;
  }
  return false;
}

/** Dove l'ordine fa riferimento a un utente o a un dispositivo. */
export function actorColumns(ctx: Ctx) {
  return { operatorId: ctx.user?.id ?? null, deviceId: ctx.device?.id ?? null };
}

export type SeatLine = { productId: string; sessionId: string | null; quantity: number };

/**
 * Controlla i posti per le righe nuove, dentro la transazione (§5.4):
 * 1. blocca con FOR UPDATE le quote e le date con capienza coinvolte, sempre nello stesso ordine;
 * 2. conta i posti occupati (pagati, rimborsati in parte, in attesa non scaduti), escluso l'ordine indicato;
 * 3. rifiuta con SOLD_OUT se una quota coinvolta andrebbe oltre la sua dimensione.
 * Due ordini sull'ultimo posto: il secondo aspetta il blocco del primo e poi vede il suo ordine.
 */
export async function reserveSeats(tx: Tx, editionId: string, lines: SeatLine[], opts: { now: Date; excludeOrderId?: string }): Promise<void> {
  if (!lines.length) return;
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const [prodRows, links] = await Promise.all([
    tx.select({ id: products.id, kind: products.kind, requiresSession: products.requiresSession, active: products.active }).from(products).where(eq(products.editionId, editionId)),
    tx.select().from(quotaProducts).where(inArray(quotaProducts.productId, productIds)),
  ]);

  const capacitySessionIds = [
    ...new Set(lines.filter((l) => l.sessionId && prodRows.some((p) => p.id === l.productId && countsTowardCapacity(p))).map((l) => l.sessionId as string)),
  ].sort();
  const quotaIds = [...new Set(links.map((l) => l.quotaId))].sort();

  const lockedSessions = capacitySessionIds.length
    ? await tx.select({ id: sessions.id, capacity: sessions.capacity, status: sessions.status }).from(sessions).where(inArray(sessions.id, capacitySessionIds)).orderBy(asc(sessions.id)).for('update')
    : [];
  const lockedQuotas = quotaIds.length
    ? await tx.select({ id: quotas.id, size: quotas.size, sessionId: quotas.sessionId }).from(quotas).where(inArray(quotas.id, quotaIds)).orderBy(asc(quotas.id)).for('update')
    : [];
  const allLinks = quotaIds.length ? await tx.select().from(quotaProducts).where(inArray(quotaProducts.quotaId, quotaIds)) : [];

  // Quote che le righe nuove toccano: solo quelle vanno controllate.
  const touched = lockedQuotas.filter((q) => lines.some((l) => allLinks.some((k) => k.quotaId === q.id && k.productId === l.productId) && (q.sessionId === null || q.sessionId === l.sessionId)));
  const touchedSessions = lockedSessions.filter((s) => s.capacity !== null);
  if (!touched.length && !touchedSessions.length) return;

  const sold = await soldCounts(tx, editionId, opts);
  for (const l of lines) sold.set(soldKey(l.productId, l.sessionId), (sold.get(soldKey(l.productId, l.sessionId)) ?? 0) + l.quantity);

  const availability = computeAvailability({
    products: prodRows,
    sessions: touchedSessions,
    quotas: touched.map((q) => ({ ...q, productIds: allLinks.filter((k) => k.quotaId === q.id).map((k) => k.productId) })),
    sold,
  });
  const over = availability.quotas.some((q) => q.used > q.size) || availability.sessions.some((s) => s.capacity !== null && s.used > s.capacity);
  if (over) throw new DomainError('SOLD_OUT', { details: { quotas: touched.map((q) => q.id), sessions: touchedSessions.map((s) => sessionQuotaId(s.id)) } });
}

/** Posti occupati per prodotto e data: ordini pagati o rimborsati in parte, e quelli in attesa non ancora scaduti. */
export async function soldCounts(tx: Tx | ReturnType<typeof getDb>, editionId: string, opts: { now: Date; excludeOrderId?: string }): Promise<SoldCounts> {
  const rows = await tx
    .select({ productId: orderLines.productId, sessionId: orderLines.sessionId, n: sql<number>`sum(${orderLines.quantity})::int` })
    .from(orderLines)
    .innerJoin(ordersV2, eq(ordersV2.id, orderLines.orderId))
    .where(
      and(
        eq(ordersV2.editionId, editionId),
        isNull(ordersV2.deletedAt),
        opts.excludeOrderId ? ne(ordersV2.id, opts.excludeOrderId) : undefined,
        or(
          inArray(ordersV2.status, ['paid', 'partially_refunded']),
          and(eq(ordersV2.status, 'pending'), or(isNull(ordersV2.expiresAt), gt(ordersV2.expiresAt, opts.now))),
        ),
      ),
    )
    .groupBy(orderLines.productId, orderLines.sessionId);
  return new Map(rows.map((r) => [soldKey(r.productId, r.sessionId), Number(r.n)]));
}

/** Restituisce un utilizzo del codice sconto (ordine mai pagato che scade o si annulla). */
export async function releaseDiscountUse(tx: Tx, discountId: string | null) {
  if (!discountId) return;
  await tx
    .update(discountsV2)
    .set({ usedCount: sql`greatest(${discountsV2.usedCount} - 1, 0)` })
    .where(eq(discountsV2.id, discountId));
}
