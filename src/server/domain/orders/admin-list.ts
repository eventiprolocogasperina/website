import 'server-only';
import { and, asc, count, desc, eq, exists, gte, ilike, inArray, isNotNull, isNull, lt, or, sql, type SQL } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { can, editionsWith } from '@/server/auth/permissions';
import { getDb } from '@/server/db/client';
import { checkins, customers, discountsV2, editions, ordersV2, refundsV2, sessions, ticketsV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import type { OrderFilters } from '@/lib/admin/order-filters';

export const ORDERS_PAGE_SIZE = 50;

export type OrderListRow = {
  id: string;
  code: string;
  createdAt: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  editionSlug: string;
  editionTitle: string;
  sessionId: string | null;
  sessionLabel: string | null;
  channel: string;
  totalCents: number;
  status: string;
  isBlacklisted: boolean;
  tickets: number;
  checkedIn: number;
};

export type OrderListResult = { rows: OrderListRow[]; total: number; page: number; pageSize: number };

/** "50%_x" → "50\%\_x": la ricerca dell'utente non usa i caratteri jolly di LIKE. */
export const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Le edizioni che l'utente può vedere: `edition` se indicata, altrimenti tutte quelle con orders.read. */
export function readableEditions(ctx: Ctx, edition: string | null): 'all' | string[] {
  if (edition) {
    if (!can(ctx, 'orders.read', { edition })) throw new DomainError('FORBIDDEN');
    return [edition];
  }
  const scope = editionsWith(ctx, 'orders.read');
  if (scope !== 'all' && !scope.length) throw new DomainError('FORBIDDEN');
  return scope;
}

/** Condizioni comuni a elenco ed esportazione. `scope` viene da readableEditions. */
export function orderConditions(scope: 'all' | string[], f: OrderFilters): SQL | undefined {
  const q = f.q ? `%${likeEscape(f.q)}%` : null;
  const editionSlugs = scope === 'all' ? (f.edition ? [f.edition] : null) : f.edition ? scope.filter((s) => s === f.edition) : scope;
  const db = getDb();
  return and(
    isNull(ordersV2.deletedAt),
    editionSlugs ? inArray(editions.slug, editionSlugs.length ? editionSlugs : ['']) : undefined,
    f.status.length ? inArray(ordersV2.status, f.status) : undefined,
    f.channel.length ? inArray(ordersV2.channel, f.channel) : undefined,
    f.session ? eq(ordersV2.sessionId, f.session) : undefined,
    f.from ? gte(ordersV2.createdAt, sql`(${f.from}::date)::timestamp AT TIME ZONE 'Europe/Rome'`) : undefined,
    f.to ? lt(ordersV2.createdAt, sql`((${f.to}::date + 1))::timestamp AT TIME ZONE 'Europe/Rome'`) : undefined,
    f.discount === 'si'
      ? isNotNull(ordersV2.discountId)
      : f.discount
        ? exists(db.select({ x: sql`1` }).from(discountsV2).where(and(eq(discountsV2.id, ordersV2.discountId), eq(discountsV2.code, f.discount.toUpperCase()))))
        : undefined,
    f.blacklist === 'si' ? eq(ordersV2.isBlacklisted, true) : f.blacklist === 'no' ? eq(ordersV2.isBlacklisted, false) : undefined,
    f.refund ? exists(db.select({ x: sql`1` }).from(refundsV2).where(eq(refundsV2.orderId, ordersV2.id))) : undefined,
    q ? or(ilike(ordersV2.code, q), ilike(customers.name, q), ilike(customers.email, q), ilike(customers.phone, q)) : undefined,
  );
}

const SORTS = {
  '-data': [desc(ordersV2.createdAt), desc(ordersV2.id)],
  data: [asc(ordersV2.createdAt), asc(ordersV2.id)],
  '-totale': [desc(ordersV2.totalCents), desc(ordersV2.createdAt)],
  totale: [asc(ordersV2.totalCents), desc(ordersV2.createdAt)],
  codice: [asc(ordersV2.code)],
  '-codice': [desc(ordersV2.code)],
} as const;

/**
 * Elenco ordini dell'admin (§11.1), globale (`edition` null) o di un'edizione.
 * Legge solo il nucleo nuovo. Due query sulla pagina (righe e totale) più una per i check-in delle
 * sole 50 righe mostrate: il costo non cresce con il numero di ordini (vedi docs/admin-ordini.md).
 */
export async function listOrders(ctx: Ctx, edition: string | null, f: OrderFilters): Promise<OrderListResult> {
  const scope = readableEditions(ctx, edition);
  const where = orderConditions(scope, f);
  const db = getDb();
  const base = () =>
    db
      .select({
        id: ordersV2.id,
        code: ordersV2.code,
        createdAt: ordersV2.createdAt,
        customerName: customers.name,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        editionSlug: editions.slug,
        editionTitle: editions.title,
        sessionId: ordersV2.sessionId,
        sessionLabel: sessions.label,
        channel: ordersV2.channel,
        totalCents: ordersV2.totalCents,
        status: ordersV2.status,
        isBlacklisted: ordersV2.isBlacklisted,
      })
      .from(ordersV2)
      .innerJoin(editions, eq(editions.id, ordersV2.editionId))
      .leftJoin(customers, eq(customers.id, ordersV2.customerId))
      .leftJoin(sessions, eq(sessions.id, ordersV2.sessionId));

  const [rows, [{ n }]] = await Promise.all([
    base()
      .where(where)
      .orderBy(...SORTS[f.sort])
      .limit(ORDERS_PAGE_SIZE)
      .offset(f.page * ORDERS_PAGE_SIZE),
    db
      .select({ n: count() })
      .from(ordersV2)
      .innerJoin(editions, eq(editions.id, ordersV2.editionId))
      .leftJoin(customers, eq(customers.id, ordersV2.customerId))
      .where(where),
  ]);
  const checkin = await checkinCounts(rows.map((r) => r.id));
  return {
    total: n,
    page: f.page,
    pageSize: ORDERS_PAGE_SIZE,
    rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), tickets: checkin.get(r.id)?.tickets ?? 0, checkedIn: checkin.get(r.id)?.checkedIn ?? 0 })),
  };
}

/** Biglietti validi e biglietti entrati almeno una volta (check-in non annullato), per ordine. */
export async function checkinCounts(orderIds: string[]): Promise<Map<string, { tickets: number; checkedIn: number }>> {
  if (!orderIds.length) return new Map();
  const entered = getDb()
    .select({ x: sql`1` })
    .from(checkins)
    .where(and(eq(checkins.ticketId, ticketsV2.id), isNull(checkins.revertedAt)));
  const rows = await getDb()
    .select({
      orderId: ticketsV2.orderId,
      tickets: sql<number>`count(*) filter (where ${ticketsV2.status} = 'valid')::int`,
      checkedIn: sql<number>`count(*) filter (where exists (${entered}))::int`,
    })
    .from(ticketsV2)
    .where(inArray(ticketsV2.orderId, orderIds))
    .groupBy(ticketsV2.orderId);
  return new Map(rows.map((r) => [r.orderId, { tickets: Number(r.tickets), checkedIn: Number(r.checkedIn) }]));
}

export type ViewCounts = { pending: number; blacklist: number; refunds: number };

/** Numeri accanto ai tab (§11.1): ordini da pagare, in blacklist, con rimborsi da gestire. */
export async function orderViewCounts(ctx: Ctx, edition: string | null): Promise<ViewCounts> {
  const scope = readableEditions(ctx, edition);
  const [row] = await getDb()
    .select({
      pending: sql<number>`count(*) filter (where ${ordersV2.status} = 'pending' and not ${ordersV2.isBlacklisted})::int`,
      blacklist: sql<number>`count(*) filter (where ${ordersV2.isBlacklisted})::int`,
      refunds: sql<number>`count(*) filter (where exists (select 1 from ${refundsV2} where ${refundsV2.orderId} = ${ordersV2.id} and ${refundsV2.status} in ('requested', 'approved')))::int`,
    })
    .from(ordersV2)
    .innerJoin(editions, eq(editions.id, ordersV2.editionId))
    .where(and(isNull(ordersV2.deletedAt), scope === 'all' ? undefined : inArray(editions.slug, scope)));
  return { pending: Number(row.pending), blacklist: Number(row.blacklist), refunds: Number(row.refunds) };
}
