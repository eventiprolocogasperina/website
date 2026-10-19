import 'server-only';
import { and, asc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb } from '@/server/db/client';
import { checkinLists, checkins, devices, editions, ordersV2, products, sessions, ticketsV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { ADMITTING_STATUSES } from '@/server/domain/payments/status';
import { addDaysToKey, romeDateKey, romeDateTime } from '@/lib/dates';
import { effectiveSession, quarterHours, type SessionGraph } from './rules';
import { assertCanOn, loadSessionGraph, type Db } from './scan';

export type Counter = { entered: number; expected: number };

/** Biglietti che possono entrare: validi, ordine pagato, non eliminato e non in blacklist. */
const admitted = (editionId: string) =>
  and(eq(ticketsV2.editionId, editionId), eq(ticketsV2.status, 'valid'), inArray(ordersV2.status, ADMITTING_STATUSES), isNull(ordersV2.deletedAt), eq(ordersV2.isBlacklisted, false));

/**
 * Attesi ed entrati raggruppati per data (già ricondotta alla data di recupero se rinviata).
 * `listId` conta i passaggi di quella lista, altrimenti di una lista qualsiasi; `productIds` limita i biglietti.
 */
async function countBySession(db: Db, graph: SessionGraph, editionId: string, opts: { listId?: string; productIds?: string[]; kind?: 'ticket' }): Promise<Map<string | null, Counter>> {
  const enteredExpr = opts.listId
    ? sql<number>`count(*) filter (where exists (select 1 from ${checkins} c where c.ticket_id = ${ticketsV2.id} and c.checkin_list_id = ${opts.listId} and c.reverted_at is null))`
    : sql<number>`count(*) filter (where exists (select 1 from ${checkins} c where c.ticket_id = ${ticketsV2.id} and c.reverted_at is null))`;
  const rows = await db
    .select({ sessionId: ticketsV2.sessionId, expected: sql<number>`count(*)`, entered: enteredExpr })
    .from(ticketsV2)
    .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
    .innerJoin(products, eq(products.id, ticketsV2.productId))
    .where(and(admitted(editionId), opts.productIds?.length ? inArray(ticketsV2.productId, opts.productIds) : undefined, opts.kind ? eq(products.kind, opts.kind) : undefined))
    .groupBy(ticketsV2.sessionId);
  const out = new Map<string | null, Counter>();
  for (const r of rows) {
    const key = effectiveSession(graph, r.sessionId);
    const prev = out.get(key) ?? { entered: 0, expected: 0 };
    out.set(key, { entered: prev.entered + Number(r.entered), expected: prev.expected + Number(r.expected) });
  }
  return out;
}

/** Somma per una data: i biglietti senza data valgono in ogni giorno. Senza data scelta, tutto. */
function pick(map: Map<string | null, Counter>, sessionId: string | null): Counter {
  if (!sessionId) return [...map.values()].reduce((a, c) => ({ entered: a.entered + c.entered, expected: a.expected + c.expected }), { entered: 0, expected: 0 });
  const a = map.get(sessionId) ?? { entered: 0, expected: 0 };
  const b = map.get(null) ?? { entered: 0, expected: 0 };
  return { entered: a.entered + b.entered, expected: a.expected + b.expected };
}

/** Contatori dello scanner: entrati e attesi per la lista e la data che si stanno controllando. */
export async function listCounters(ctx: Ctx, listId: string, sessionId: string | null): Promise<Counter> {
  const db = getDb();
  const [list] = await db.select({ list: checkinLists, slug: editions.slug }).from(checkinLists).innerJoin(editions, eq(editions.id, checkinLists.editionId)).where(eq(checkinLists.id, listId));
  if (!list) throw new DomainError('NOT_FOUND');
  assertCanOn(ctx, 'checkin.scan', list.slug);
  const graph = await loadSessionGraph(db, list.list.editionId);
  const map = await countBySession(db, graph, list.list.editionId, { listId, productIds: list.list.productIds });
  return pick(map, list.list.sessionId ?? sessionId);
}

export type CheckinStats = {
  sessions: Array<{ id: string; label: string; startsAt: string } & Counter>;
  lists: Array<{ id: string; name: string; sessionLabel: string | null } & Counter>;
  /** Giorni con almeno un ingresso (aaaa-mm-gg, ora di Roma) e quello mostrato nel grafico. */
  days: string[];
  day: string | null;
  quarters: Array<{ start: string; count: number }>;
  devices: Array<{ id: string; name: string; count: number }>;
  total: Counter;
};

/** Statistiche della pagina Check-in: per data, per lista, ingressi per quarto d'ora e per dispositivo. */
export async function checkinStats(ctx: Ctx, editionSlug: string, opts: { day?: string | null; now?: Date } = {}): Promise<CheckinStats> {
  assertCanOn(ctx, 'checkin.scan', editionSlug);
  const db = getDb();
  const [edition] = await db.select({ id: editions.id }).from(editions).where(eq(editions.slug, editionSlug));
  if (!edition) throw new DomainError('NOT_FOUND');
  const graph = await loadSessionGraph(db, edition.id);
  const [allSessions, lists, bySession] = await Promise.all([
    db.select().from(sessions).where(eq(sessions.editionId, edition.id)).orderBy(asc(sessions.startsAt)),
    db.select().from(checkinLists).where(eq(checkinLists.editionId, edition.id)).orderBy(asc(checkinLists.createdAt)),
    countBySession(db, graph, edition.id, { kind: 'ticket' }),
  ]);
  const listCounts = await Promise.all(lists.map((l) => countBySession(db, graph, edition.id, { listId: l.id, productIds: l.productIds })));

  const listIds = lists.map((l) => l.id);
  const dayRows = listIds.length
    ? await db
        .selectDistinct({ day: sql<string>`to_char(${checkins.at} at time zone 'Europe/Rome', 'YYYY-MM-DD')` })
        .from(checkins)
        .where(and(inArray(checkins.checkinListId, listIds), isNull(checkins.revertedAt)))
    : [];
  const days = dayRows.map((r) => r.day).sort();
  const today = romeDateKey(opts.now ?? new Date());
  const day = opts.day && days.includes(opts.day) ? opts.day : days.includes(today) ? today : (days[days.length - 1] ?? null);

  let quarters: CheckinStats['quarters'] = [];
  let perDevice: CheckinStats['devices'] = [];
  if (day) {
    const range = and(inArray(checkins.checkinListId, listIds), isNull(checkins.revertedAt), gte(checkins.at, romeDateTime(day)), lt(checkins.at, romeDateTime(addDaysToKey(day, 1))));
    const bucket = sql<Date>`date_bin('15 minutes', ${checkins.at}, timestamptz '2000-01-01T00:00:00Z')`;
    const [q, d] = await Promise.all([
      db.select({ start: bucket, count: sql<number>`count(*)` }).from(checkins).where(range).groupBy(bucket),
      db
        .select({ id: checkins.deviceId, name: devices.name, count: sql<number>`count(*)` })
        .from(checkins)
        .leftJoin(devices, eq(devices.id, checkins.deviceId))
        .where(range)
        .groupBy(checkins.deviceId, devices.name),
    ]);
    quarters = quarterHours(q.map((r) => ({ start: new Date(r.start), count: Number(r.count) }))).map((r) => ({ start: r.start.toISOString(), count: r.count }));
    perDevice = d.map((r) => ({ id: r.id ?? 'admin', name: r.name ?? 'Admin o importati', count: Number(r.count) })).sort((a, b) => b.count - a.count);
  }

  const visible = allSessions.filter((s) => !(s.status === 'postponed' && s.rescheduledToSessionId));
  return {
    sessions: visible.map((s) => ({ id: s.id, label: s.label, startsAt: s.startsAt.toISOString(), ...pick(bySession, s.id) })),
    lists: lists.map((l, i) => ({ id: l.id, name: l.name, sessionLabel: l.sessionId ? (graph.get(l.sessionId)?.label ?? null) : null, ...pick(listCounts[i], l.sessionId) })),
    days,
    day,
    quarters,
    devices: perDevice,
    total: pick(bySession, null),
  };
}
