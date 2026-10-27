import 'server-only';
import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { formatMoney } from '@/lib/money';
import { getDb } from '@/server/db/client';
import { cashRegisters, cashSales, checkins, editions, ordersV2, payments, products, sessions, ticketsV2 } from '@/server/db/schema';
import { getAvailability } from '@/server/domain/catalog';
import { methodLabel } from '@/server/domain/stats/csv';
import { editionStats, SOLD_STATUSES } from '@/server/domain/stats';
import { capacityMessage, crossedThresholds, escapeHtml } from './messages';
import { isNotificationOn } from './settings';

/*
 * Resoconti Telegram per le edizioni in corso (§18.11: solo numeri, codici e nomi di casse o date):
 * `/oggi` durante l'evento, il riepilogo serale del cron e l'avviso quando una data si riempie.
 */

const ROME = sql.raw(`'Europe/Rome'`);
const n = sql<number>`count(*)::int`;
const sumOf = (col: unknown) => sql<number>`coalesce(sum(${col}), 0)::int`;
/** Oggi a Roma: la giornata dell'evento, non quella UTC. */
const today = (col: unknown) => sql`(${col} at time zone ${ROME})::date = (now() at time zone ${ROME})::date`;
const soldAt = sql`coalesce(${ordersV2.paidAt}, ${ordersV2.createdAt})`;
const sold = (editionId: string) => and(eq(ordersV2.editionId, editionId), inArray(ordersV2.status, [...SOLD_STATUSES]), isNull(ordersV2.deletedAt));

/** Stati in cui un'edizione vende o si sta svolgendo. */
export const RUNNING_STATUSES = ['live', 'on_sale', 'sold_out'] as const;

type EditionRef = { id: string; slug: string; title: string; status: string; startsAt: Date | null; notificationSettings: Record<string, boolean> | null };

export async function runningEditions(): Promise<EditionRef[]> {
  const rows = await getDb()
    .select({ id: editions.id, slug: editions.slug, title: editions.title, status: editions.status, startsAt: editions.startsAt, notificationSettings: editions.notificationSettings })
    .from(editions)
    .where(inArray(editions.status, [...RUNNING_STATUSES]));
  // Prima quelle in corso, poi la più vicina.
  return rows.sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live') || (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0));
}

const dateLine = (s: { label: string; capacity: number | null; sold: number; remaining: number | null }) =>
  `▪️ ${escapeHtml(s.label)}: ${s.sold}${s.capacity ? `/${s.capacity} · liberi ${s.remaining ?? 0}` : ''}`;

/** `/oggi`: la giornata di oggi di un'edizione, online e in cassa, con gli ingressi. */
export async function todayReport(e: Pick<EditionRef, 'id' | 'title'>): Promise<string> {
  const db = getDb();
  const [[online], byMethod, byRegister, [entries], stats] = await Promise.all([
    db
      .select({ orders: n, cents: sumOf(ordersV2.totalCents) })
      .from(ordersV2)
      .where(and(sold(e.id), ne(ordersV2.channel, 'pos'), today(soldAt))),
    db
      .select({ method: payments.method, cents: sumOf(payments.amountCents) })
      .from(payments)
      .innerJoin(ordersV2, eq(ordersV2.id, payments.orderId))
      .where(and(eq(ordersV2.editionId, e.id), eq(ordersV2.channel, 'pos'), eq(payments.status, 'succeeded'), isNull(ordersV2.deletedAt), today(payments.receivedAt)))
      .groupBy(payments.method),
    db
      .select({ register: sql<string>`coalesce(${cashRegisters.name}, 'Senza cassa')`, sales: n, cents: sumOf(ordersV2.totalCents) })
      .from(cashSales)
      .innerJoin(ordersV2, eq(ordersV2.id, cashSales.orderId))
      .leftJoin(cashRegisters, eq(cashRegisters.id, cashSales.registerId))
      .where(and(eq(cashSales.editionId, e.id), isNull(cashSales.voidedAt), sold(e.id), today(soldAt)))
      .groupBy(sql`1`),
    db
      .select({ n })
      .from(checkins)
      .innerJoin(ticketsV2, eq(ticketsV2.id, checkins.ticketId))
      .where(and(eq(ticketsV2.editionId, e.id), isNull(checkins.revertedAt), today(checkins.at))),
    editionStats(e.id),
  ]);
  const cashTotal = byMethod.reduce((s, m) => s + m.cents, 0);
  const registers = byRegister.map((r) => `▪️ ${escapeHtml(r.register)}: ${r.sales} vendite · ${formatMoney(r.cents)}`).join('\n');
  const methods = byMethod.map((m) => `${methodLabel(m.method)} ${formatMoney(m.cents)}`).join(' · ');
  const dates = stats.bySession.filter((s) => s.status === 'open' && new Date(s.startsAt).getTime() > Date.now() - 86_400_000).map(dateLine).join('\n');
  return (
    `📅 <b>Oggi · ${escapeHtml(e.title)}</b>\n\n` +
    `🌐 Online: <b>${online.orders}</b> ordini · ${formatMoney(online.cents)}\n` +
    `💶 Cassa: <b>${formatMoney(cashTotal)}</b>${methods ? ` (${methods})` : ''}\n` +
    (registers ? `${registers}\n` : '') +
    `✅ Ingressi oggi: <b>${entries.n}</b> (in tutto ${stats.totals.checkins})\n` +
    `💰 Incasso totale edizione: ${formatMoney(stats.totals.grossCents)}` +
    (dates ? `\n\n<b>Posti</b>\n${dates}` : '')
  );
}

/** Riepilogo serale di un'edizione in vendita: la giornata e i totali. */
export async function eveningSummary(e: Pick<EditionRef, 'id' | 'title'>): Promise<string> {
  const db = getDb();
  const [[day], [dayTickets], stats] = await Promise.all([
    db.select({ orders: n, cents: sumOf(ordersV2.totalCents) }).from(ordersV2).where(and(sold(e.id), today(soldAt))),
    db
      .select({ n })
      .from(ticketsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
      .where(and(eq(ticketsV2.status, 'valid'), sold(e.id), today(soldAt))),
    editionStats(e.id),
  ]);
  const dates = stats.bySession.filter((s) => s.status === 'open' && new Date(s.startsAt).getTime() > Date.now()).map(dateLine).join('\n');
  return (
    `🌙 <b>Riepilogo di oggi · ${escapeHtml(e.title)}</b>\n\n` +
    `Oggi: <b>${day.orders}</b> ordini · ${dayTickets.n} biglietti · ${formatMoney(day.cents)}\n` +
    `In tutto: ${stats.totals.orders} ordini · ${stats.totals.tickets} biglietti · ${formatMoney(stats.totals.grossCents)}` +
    (dates ? `\n\n<b>Posti</b>\n${dates}` : '')
  );
}

/** Riepiloghi serali delle edizioni che vendono, se la notifica è accesa per l'edizione. */
export async function eveningSummaries(): Promise<string[]> {
  const list = (await runningEditions()).filter((e) => isNotificationOn(e.notificationSettings, 'dailySummary'));
  return Promise.all(list.map(eveningSummary));
}

/** Avvisi di riempimento per le date toccate da un ordine appena pagato. */
export async function capacityAlerts(orderId: string, editionTitle: string): Promise<string[]> {
  const db = getDb();
  const [o] = await db.select({ editionId: ordersV2.editionId }).from(ordersV2).where(eq(ordersV2.id, orderId));
  if (!o) return [];
  const added = await db
    .select({ sessionId: ticketsV2.sessionId, label: sessions.label, n })
    .from(ticketsV2)
    .innerJoin(products, eq(products.id, ticketsV2.productId))
    .innerJoin(sessions, eq(sessions.id, ticketsV2.sessionId))
    .where(and(eq(ticketsV2.orderId, orderId), eq(ticketsV2.status, 'valid'), eq(products.kind, 'ticket')))
    .groupBy(ticketsV2.sessionId, sessions.label);
  if (!added.length) return [];
  const availability = await getAvailability(o.editionId);
  return added.flatMap((a) => {
    const s = availability.sessions.find((x) => x.id === a.sessionId);
    if (!s?.capacity) return [];
    return crossedThresholds(s.used, a.n, s.capacity).map((threshold) => capacityMessage({ edition: editionTitle, session: a.label, used: s.used, capacity: s.capacity!, threshold }));
  });
}
