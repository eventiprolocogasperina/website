import 'server-only';
// Numeri di un'edizione per la panoramica, le statistiche e il rendiconto finale (§10.3). Solo
// aggregati: nessun dato personale esce da qui. Le ore e i giorni sono quelli di Roma.
import { and, asc, desc, eq, inArray, isNull, lt, ne, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { checkins, editions, orderLines, ordersV2, payments, products, refundsV2, sessions, ticketsV2 } from '@/server/db/schema';
import { getAvailability } from '@/server/domain/catalog';

/** Ordini che contano come venduti: pagati, anche se rimborsati in parte. */
export const SOLD_STATUSES = ['paid', 'partially_refunded'] as const;

export type Totals = {
  orders: number;
  tickets: number;
  /** Pagamenti riusciti (incasso lordo). */
  grossCents: number;
  /** Rimborsi pagati. */
  refundedCents: number;
  netCents: number;
  checkins: number;
  /** Posti ancora liberi nelle date future aperte; null se le date non hanno capienza. */
  remaining: number | null;
};

export type EditionStats = {
  totals: Totals;
  byChannel: Array<{ channel: string; orders: number; cents: number }>;
  byMethod: Array<{ method: string; cents: number }>;
  byProduct: Array<{ productId: string; name: string; kind: string; quantity: number; cents: number }>;
  bySession: Array<{ sessionId: string; label: string; startsAt: string; status: string; capacity: number | null; sold: number; checkins: number; remaining: number | null }>;
  byDay: Array<{ day: string; orders: number; cents: number }>;
  byHour: Array<{ hour: number; orders: number; cents: number }>;
  cashByHour: Array<{ hour: number; orders: number; cents: number }>;
  cashByDepartment: Array<{ department: string; quantity: number; cents: number }>;
};

const ROME = sql.raw(`'Europe/Rome'`);
const soldAt = sql`coalesce(${ordersV2.paidAt}, ${ordersV2.createdAt})`;
const dayExpr = sql<string>`to_char(${soldAt} at time zone ${ROME}, 'YYYY-MM-DD')`;
const hourExpr = sql<number>`extract(hour from ${soldAt} at time zone ${ROME})::int`;
const n = sql<number>`count(*)::int`;
const sumOf = (col: unknown) => sql<number>`coalesce(sum(${col}), 0)::int`;

function soldOrders(editionId: string) {
  return and(eq(ordersV2.editionId, editionId), inArray(ordersV2.status, [...SOLD_STATUSES]), isNull(ordersV2.deletedAt));
}

/** Totali di un'edizione: bastano per la panoramica e per il confronto con l'edizione precedente. */
export async function editionTotals(editionId: string): Promise<Totals> {
  const db = getDb();
  const [[o], [t], [p], [r], [c], availability, sessionRows] = await Promise.all([
    db.select({ n }).from(ordersV2).where(soldOrders(editionId)),
    db
      .select({ n })
      .from(ticketsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
      .where(and(eq(ticketsV2.editionId, editionId), eq(ticketsV2.status, 'valid'), soldOrders(editionId))),
    db
      .select({ cents: sumOf(payments.amountCents) })
      .from(payments)
      .innerJoin(ordersV2, eq(ordersV2.id, payments.orderId))
      .where(and(eq(ordersV2.editionId, editionId), eq(payments.status, 'succeeded'), isNull(ordersV2.deletedAt))),
    db
      .select({ cents: sumOf(refundsV2.amountCents) })
      .from(refundsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, refundsV2.orderId))
      .where(and(eq(ordersV2.editionId, editionId), eq(refundsV2.status, 'paid'))),
    db
      .select({ n })
      .from(checkins)
      .innerJoin(ticketsV2, eq(ticketsV2.id, checkins.ticketId))
      .where(and(eq(ticketsV2.editionId, editionId), isNull(checkins.revertedAt))),
    getAvailability(editionId),
    db.select({ id: sessions.id, status: sessions.status, startsAt: sessions.startsAt }).from(sessions).where(eq(sessions.editionId, editionId)),
  ]);
  const now = Date.now();
  const future = new Set(sessionRows.filter((s) => s.status === 'open' && s.startsAt.getTime() > now).map((s) => s.id));
  const limited = availability.sessions.filter((s) => future.has(s.id) && s.remaining !== null);
  return {
    orders: o.n,
    tickets: t.n,
    grossCents: p.cents,
    refundedCents: r.cents,
    netCents: p.cents - r.cents,
    checkins: c.n,
    remaining: limited.length ? limited.reduce((sum, s) => sum + s.remaining!, 0) : null,
  };
}

export async function editionStats(editionId: string): Promise<EditionStats> {
  const db = getDb();
  const sold = soldOrders(editionId);
  const pos = and(sold, eq(ordersV2.channel, 'pos'));
  const [totals, byChannel, byMethod, byProduct, sessionRows, soldBySession, checkinsBySession, byDay, byHour, cashByHour, cashByDepartment, availability] = await Promise.all([
    editionTotals(editionId),
    db.select({ channel: ordersV2.channel, orders: n, cents: sumOf(ordersV2.totalCents) }).from(ordersV2).where(sold).groupBy(ordersV2.channel).orderBy(desc(sumOf(ordersV2.totalCents))),
    db
      .select({ method: payments.method, cents: sumOf(payments.amountCents) })
      .from(payments)
      .innerJoin(ordersV2, eq(ordersV2.id, payments.orderId))
      .where(and(eq(ordersV2.editionId, editionId), eq(payments.status, 'succeeded'), isNull(ordersV2.deletedAt)))
      .groupBy(payments.method)
      .orderBy(desc(sumOf(payments.amountCents))),
    db
      .select({ productId: products.id, name: products.name, kind: products.kind, quantity: sumOf(orderLines.quantity), cents: sumOf(orderLines.totalCents) })
      .from(orderLines)
      .innerJoin(ordersV2, eq(ordersV2.id, orderLines.orderId))
      .innerJoin(products, eq(products.id, orderLines.productId))
      .where(sold)
      .groupBy(products.id, products.name, products.kind, products.sort)
      .orderBy(asc(products.sort), asc(products.name)),
    db.select().from(sessions).where(eq(sessions.editionId, editionId)).orderBy(asc(sessions.startsAt), asc(sessions.sort)),
    db
      .select({ sessionId: ticketsV2.sessionId, n })
      .from(ticketsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
      .innerJoin(products, eq(products.id, ticketsV2.productId))
      // Solo i biglietti d'ingresso, come la capienza della data (i laboratori hanno le loro quote).
      .where(and(eq(ticketsV2.status, 'valid'), eq(products.kind, 'ticket'), sold))
      .groupBy(ticketsV2.sessionId),
    db
      .select({ sessionId: ticketsV2.sessionId, n })
      .from(checkins)
      .innerJoin(ticketsV2, eq(ticketsV2.id, checkins.ticketId))
      .where(and(eq(ticketsV2.editionId, editionId), isNull(checkins.revertedAt)))
      .groupBy(ticketsV2.sessionId),
    db.select({ day: dayExpr, orders: n, cents: sumOf(ordersV2.totalCents) }).from(ordersV2).where(sold).groupBy(dayExpr).orderBy(dayExpr),
    db.select({ hour: hourExpr, orders: n, cents: sumOf(ordersV2.totalCents) }).from(ordersV2).where(sold).groupBy(hourExpr).orderBy(hourExpr),
    db.select({ hour: hourExpr, orders: n, cents: sumOf(ordersV2.totalCents) }).from(ordersV2).where(pos).groupBy(hourExpr).orderBy(hourExpr),
    db
      .select({ department: sql<string>`coalesce(${orderLines.department}, 'Senza reparto')`, quantity: sumOf(orderLines.quantity), cents: sumOf(orderLines.totalCents) })
      .from(orderLines)
      .innerJoin(ordersV2, eq(ordersV2.id, orderLines.orderId))
      .where(pos)
      .groupBy(sql`1`)
      .orderBy(desc(sumOf(orderLines.totalCents))),
    getAvailability(editionId),
  ]);
  return {
    totals,
    byChannel,
    byMethod,
    byProduct,
    bySession: sessionRows.map((s) => {
      const a = availability.sessions.find((x) => x.id === s.id);
      return {
        sessionId: s.id,
        label: s.label,
        startsAt: s.startsAt.toISOString(),
        status: s.status,
        capacity: s.capacity,
        sold: soldBySession.find((x) => x.sessionId === s.id)?.n ?? 0,
        checkins: checkinsBySession.find((x) => x.sessionId === s.id)?.n ?? 0,
        remaining: a?.remaining ?? null,
      };
    }),
    byDay,
    byHour,
    cashByHour,
    cashByDepartment,
  };
}

/** L'edizione precedente dello stesso format (per data di inizio), per il confronto. */
export async function previousEdition(editionId: string): Promise<{ id: string; slug: string; title: string } | null> {
  const db = getDb();
  const [e] = await db.select().from(editions).where(eq(editions.id, editionId));
  if (!e?.seriesId || !e.startsAt) return null;
  const [prev] = await db
    .select({ id: editions.id, slug: editions.slug, title: editions.title })
    .from(editions)
    .where(and(eq(editions.seriesId, e.seriesId), ne(editions.id, e.id), lt(editions.startsAt, e.startsAt)))
    .orderBy(desc(editions.startsAt))
    .limit(1);
  return prev ?? null;
}

/** Incasso netto per edizione, per la panoramica dell'associazione. */
export async function netByEdition(editionIds: string[]): Promise<Map<string, number>> {
  if (!editionIds.length) return new Map();
  const db = getDb();
  const [paid, refunded] = await Promise.all([
    db
      .select({ id: ordersV2.editionId, cents: sumOf(payments.amountCents) })
      .from(payments)
      .innerJoin(ordersV2, eq(ordersV2.id, payments.orderId))
      .where(and(inArray(ordersV2.editionId, editionIds), eq(payments.status, 'succeeded'), isNull(ordersV2.deletedAt)))
      .groupBy(ordersV2.editionId),
    db
      .select({ id: ordersV2.editionId, cents: sumOf(refundsV2.amountCents) })
      .from(refundsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, refundsV2.orderId))
      .where(and(inArray(ordersV2.editionId, editionIds), eq(refundsV2.status, 'paid')))
      .groupBy(ordersV2.editionId),
  ]);
  return new Map(editionIds.map((id) => [id, (paid.find((p) => p.id === id)?.cents ?? 0) - (refunded.find((r) => r.id === id)?.cents ?? 0)]));
}
