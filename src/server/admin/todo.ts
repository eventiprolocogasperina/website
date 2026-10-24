import 'server-only';
import { and, count, eq, isNull, lt, sql } from 'drizzle-orm';
import { cache } from 'react';
import { getDb } from '@/server/db/client';
import { orders, refundRequests, zuccalandPhotos } from '@/server/db/schema';

export type TodoCounts = {
  /** Richieste di rimborso ancora da gestire. */
  refunds: number;
  /** Foto dei visitatori in attesa di moderazione. */
  photos: number;
  /** Ordini in attesa di pagamento da più di un'ora (pagamento abbandonato o non confermato). */
  stalePending: number;
};

/** Conteggi per la campanella e il riquadro "Da fare". Una sola volta per richiesta. */
export const getTodoCounts = cache(async (): Promise<TodoCounts> => {
  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [[refunds], [photos], [stalePending]] = await Promise.all([
    db.select({ n: count() }).from(refundRequests).where(eq(refundRequests.status, 'pending')),
    db.select({ n: count() }).from(zuccalandPhotos).where(eq(zuccalandPhotos.status, 'pending')),
    db
      .select({ n: count() })
      .from(orders)
      .where(and(eq(orders.status, 'PENDING'), isNull(orders.deletedAt), lt(orders.createdAt, sql`${oneHourAgo}::timestamptz`))),
  ]);
  return { refunds: refunds.n, photos: photos.n, stalePending: stalePending.n };
});
