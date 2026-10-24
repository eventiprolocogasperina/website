import 'server-only';
// Dati della panoramica dell'edizione (§11.5): numeri, capienza, vendite giornaliere, "Da fare" e la
// prossima azione suggerita in base allo stato.
import { and, count, eq, inArray, isNull, lt } from 'drizzle-orm';
import { romeDateKey } from '@/lib/dates';
import { getDb } from '@/server/db/client';
import { editions, ordersV2, refundsV2, zuccalandPhotos } from '@/server/db/schema';
import { editionStats, editionTotals, previousEdition, type EditionStats, type Totals } from './index';
import { lastDays } from './next-action';

export { nextAction, type NextAction } from './next-action';

export type TodoItem = { key: string; text: string; href: string };

export type EditionOverview = {
  stats: EditionStats;
  previous: { title: string; totals: Totals } | null;
  /** Ultimi 14 giorni, giorni senza vendite compresi. */
  daily: Array<{ day: string; orders: number; cents: number }>;
  todo: TodoItem[];
};

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

export async function editionOverview(editionId: string, slug: string, now = new Date()): Promise<EditionOverview> {
  const db = getDb();
  const oneHourAgo = new Date(now.getTime() - 3600_000);
  const [e] = await db.select({ enabledModules: editions.enabledModules }).from(editions).where(eq(editions.id, editionId));
  const [stats, prev, [pending], [refunds], [photos]] = await Promise.all([
    editionStats(editionId),
    previousEdition(editionId),
    db
      .select({ n: count() })
      .from(ordersV2)
      .where(and(eq(ordersV2.editionId, editionId), eq(ordersV2.status, 'pending'), isNull(ordersV2.deletedAt), lt(ordersV2.createdAt, oneHourAgo))),
    db
      .select({ n: count() })
      .from(refundsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, refundsV2.orderId))
      .where(and(eq(ordersV2.editionId, editionId), inArray(refundsV2.status, ['requested', 'approved']))),
    e?.enabledModules.includes('visitor-photos') ? db.select({ n: count() }).from(zuccalandPhotos).where(eq(zuccalandPhotos.status, 'pending')) : Promise.resolve([{ n: 0 }]),
  ]);
  const base = `/admin/e/${slug}`;
  const todo: TodoItem[] = [];
  if (refunds.n) todo.push({ key: 'refunds', text: plural(refunds.n, 'rimborso da gestire', 'rimborsi da gestire'), href: `${base}/rimborsi` });
  if (pending.n) todo.push({ key: 'pending', text: plural(pending.n, 'ordine in attesa da più di un’ora', 'ordini in attesa da più di un’ora'), href: `${base}/ordini?stato=pending` });
  if (photos.n) todo.push({ key: 'photos', text: plural(photos.n, 'foto da moderare', 'foto da moderare'), href: `${base}/m/visitor-photos` });
  for (const s of stats.bySession) {
    if (s.status === 'open' && s.capacity && s.remaining !== null && s.remaining > 0 && s.remaining <= Math.max(5, s.capacity * 0.1) && new Date(s.startsAt) > now) {
      todo.push({ key: `low-${s.sessionId}`, text: `${s.label}: restano ${s.remaining} posti`, href: `${base}/date` });
    }
  }
  return {
    stats,
    previous: prev ? { title: prev.title, totals: await editionTotals(prev.id) } : null,
    daily: lastDays(stats.byDay, romeDateKey(now)),
    todo,
  };
}
