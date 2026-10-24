import 'server-only';
import { and, asc, count, eq, exists, ilike, inArray, isNull, notExists, or, sql } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb } from '@/server/db/client';
import { attendeeAnswers, checkinLists, checkins, customers, editions, orderLines, ordersV2, products, sessions, ticketsV2 } from '@/server/db/schema';
import { ANSWER_KEYS, type ActivitiesSettings } from '@/modules/activities/module';
import { normalizeChoice, readChoice } from '@/modules/activities/rules';
import { moduleSettings } from '@/modules/registry';
import { DomainError } from '@/server/domain/errors';
import { formatDate, romeTime } from '@/lib/dates';
import type { ManifestGroup } from '@/lib/pdf/manifest/rows';
import { groupByDay } from '@/lib/pdf/manifest/rows';
import { likeEscape } from './admin-list';

// Partecipanti di un'edizione (prompt 12): un biglietto per riga, con risposte, data e check-in.
// E il registro presenze (PDF e CSV), una riga per prenotazione come quello di oggi.

export const ATTENDEES_PAGE_SIZE = 50;
/** Ordini che portano persone all'evento. */
const ATTENDING = ['paid', 'partially_refunded', 'pending'] as const;

export type AttendeeFilters = { q: string; session: string; checkin: '' | 'in' | 'out'; page: number };

export type AttendeeRow = {
  ticketId: string;
  orderId: string;
  orderCode: string;
  orderStatus: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  productName: string;
  sessionLabel: string | null;
  ticketStatus: string;
  /** Passaggio valido da annullare (checkin.revert), se è entrato. */
  checkinId: string | null;
  checkedInAt: string | null;
  checkinList: string | null;
  answers: string;
};

async function editionFor(ctx: Ctx, slug: string) {
  if (!can(ctx, 'orders.read', { edition: slug })) throw new DomainError('FORBIDDEN');
  const [ed] = await getDb().select().from(editions).where(eq(editions.slug, slug));
  if (!ed) throw new DomainError('NOT_FOUND');
  return ed;
}

const answerText = (v: unknown): string =>
  Array.isArray(v) ? v.map(answerText).join(', ') : v && typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k} ${answerText(x)}`).join(', ') : String(v ?? '');

/** Risposte leggibili per ordine e per biglietto: "Bambini 2 · Attività: Zuccart". */
async function answersFor(orderIds: string[], settings: ActivitiesSettings | null): Promise<{ order: Map<string, string>; ticket: Map<string, string> }> {
  const order = new Map<string, string>();
  const ticket = new Map<string, string>();
  if (!orderIds.length) return { order, ticket };
  const rows = await getDb().select().from(attendeeAnswers).where(inArray(attendeeAnswers.orderId, orderIds));
  for (const id of orderIds) {
    const mine = rows.filter((r) => r.orderId === id && !r.ticketId);
    const parts: string[] = [];
    const choice = settings ? normalizeChoice(settings, readChoice(mine)) : readChoice(mine);
    if (choice.children !== null) parts.push(`Bambini ${choice.children}`);
    if (choice.activities.length) parts.push(`Attività: ${choice.activities.map((k) => settings?.activities.find((a) => a.key === k)?.label ?? k).join(', ')}`);
    for (const a of mine.filter((r) => r.questionKey !== ANSWER_KEYS.children && r.questionKey !== ANSWER_KEYS.activities && r.questionKey !== 'attivita_per')) {
      parts.push(`${settings?.questions.find((q) => q.key === a.questionKey)?.label ?? a.questionKey}: ${answerText(a.value)}`);
    }
    if (parts.length) order.set(id, parts.join(' · '));
  }
  for (const r of rows.filter((x) => x.ticketId)) ticket.set(r.ticketId!, [ticket.get(r.ticketId!), `${r.questionKey}: ${answerText(r.value)}`].filter(Boolean).join(' · '));
  return { order, ticket };
}

const activitiesSettingsOf = (ed: typeof editions.$inferSelect) =>
  ed.enabledModules.includes('activities') ? (moduleSettings('activities', ed.moduleSettings) as ActivitiesSettings) : null;

export async function listAttendees(ctx: Ctx, slug: string, f: AttendeeFilters, opts: { all?: boolean } = {}): Promise<{ rows: AttendeeRow[]; total: number }> {
  const ed = await editionFor(ctx, slug);
  const db = getDb();
  const q = f.q ? `%${likeEscape(f.q)}%` : null;
  const entered = db.select({ x: sql`1` }).from(checkins).where(and(eq(checkins.ticketId, ticketsV2.id), isNull(checkins.revertedAt)));
  const where = and(
    eq(ticketsV2.editionId, ed.id),
    isNull(ordersV2.deletedAt),
    inArray(ordersV2.status, [...ATTENDING]),
    f.session ? eq(ticketsV2.sessionId, f.session) : undefined,
    f.checkin === 'in' ? exists(entered) : f.checkin === 'out' ? notExists(entered) : undefined,
    q ? or(ilike(ordersV2.code, q), ilike(customers.name, q), ilike(customers.email, q), ilike(customers.phone, q), ilike(ticketsV2.attendeeName, q)) : undefined,
  );
  const base = db
    .select({
      ticketId: ticketsV2.id,
      orderId: ordersV2.id,
      orderCode: ordersV2.code,
      orderStatus: ordersV2.status,
      name: sql<string | null>`coalesce(${ticketsV2.attendeeName}, ${customers.name})`,
      email: customers.email,
      phone: customers.phone,
      productName: products.name,
      sessionLabel: sessions.label,
      ticketStatus: ticketsV2.status,
    })
    .from(ticketsV2)
    .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
    .innerJoin(products, eq(products.id, ticketsV2.productId))
    .leftJoin(customers, eq(customers.id, ordersV2.customerId))
    .leftJoin(sessions, eq(sessions.id, ticketsV2.sessionId))
    .where(where)
    .orderBy(asc(sessions.startsAt), asc(customers.name), asc(ordersV2.code), asc(ticketsV2.id));
  const [rows, [{ n }]] = await Promise.all([
    opts.all ? base.limit(20_000) : base.limit(ATTENDEES_PAGE_SIZE).offset(f.page * ATTENDEES_PAGE_SIZE),
    db
      .select({ n: count() })
      .from(ticketsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
      .leftJoin(customers, eq(customers.id, ordersV2.customerId))
      .where(where),
  ]);
  const ids = rows.map((r) => r.ticketId);
  const [entries, answers] = await Promise.all([
    ids.length
      ? db
          .select({ id: checkins.id, ticketId: checkins.ticketId, at: checkins.at, list: checkinLists.name })
          .from(checkins)
          .innerJoin(checkinLists, eq(checkinLists.id, checkins.checkinListId))
          .where(and(inArray(checkins.ticketId, ids), isNull(checkins.revertedAt)))
          .orderBy(asc(checkins.at))
      : [],
    answersFor([...new Set(rows.map((r) => r.orderId))], activitiesSettingsOf(ed)),
  ]);
  return {
    total: n,
    rows: rows.map((r) => {
      const e = entries.find((x) => x.ticketId === r.ticketId);
      return {
        ...r,
        checkinId: e?.id ?? null,
        checkedInAt: e?.at.toISOString() ?? null,
        checkinList: e?.list ?? null,
        answers: [answers.order.get(r.orderId), answers.ticket.get(r.ticketId)].filter(Boolean).join(' · '),
      };
    }),
  };
}

/**
 * Registro presenze per il PDF: una riga per prenotazione (ordine pagato o in attesa, non in
 * blacklist), un foglio per data, ordine di cognome. Stesse colonne di oggi, con le attività
 * prese dalle impostazioni del modulo invece che scritte nel codice.
 */
export async function manifestFor(ctx: Ctx, slug: string, session: string | null) {
  const ed = await editionFor(ctx, slug);
  const settings = activitiesSettingsOf(ed);
  const db = getDb();
  const orders = await db
    .select({ id: ordersV2.id, code: ordersV2.code, status: ordersV2.status, totalCents: ordersV2.totalCents, name: customers.name, email: customers.email, phone: customers.phone, sessionLabel: sessions.label, startsAt: sessions.startsAt })
    .from(ordersV2)
    .leftJoin(customers, eq(customers.id, ordersV2.customerId))
    .leftJoin(sessions, eq(sessions.id, ordersV2.sessionId))
    .where(and(eq(ordersV2.editionId, ed.id), isNull(ordersV2.deletedAt), eq(ordersV2.isBlacklisted, false), inArray(ordersV2.status, [...ATTENDING]), session ? eq(ordersV2.sessionId, session) : undefined));
  const ids = orders.map((o) => o.id);
  const [lines, answers] = await Promise.all([
    ids.length
      ? db
          .select({ orderId: orderLines.orderId, kind: products.kind, productId: products.id, name: products.name, quantity: orderLines.quantity })
          .from(orderLines)
          .innerJoin(products, eq(products.id, orderLines.productId))
          .where(inArray(orderLines.orderId, ids))
      : [],
    ids.length ? db.select().from(attendeeAnswers).where(and(inArray(attendeeAnswers.orderId, ids), isNull(attendeeAnswers.ticketId))) : [],
  ]);
  const labId = settings?.labProductId ?? null;
  const groups: ManifestGroup[] = groupByDay(
    orders.map((o) => {
      const mine = lines.filter((l) => l.orderId === o.id);
      const choice = settings ? normalizeChoice(settings, readChoice(answers.filter((a) => a.orderId === o.id))) : { children: null, activities: [] };
      const labs = mine.filter((l) => (labId ? l.productId === labId : l.kind === 'addon')).reduce((s, l) => s + l.quantity, 0);
      return {
        id: o.id,
        shortDate: o.startsAt ? `${formatDate(o.startsAt, 'short').split(' ')[0]} ${new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' }).format(o.startsAt)}` : 'N/D',
        sortKey: o.startsAt ? `${o.startsAt.toISOString()}` : 'zz',
        name: o.name ?? o.email ?? o.code,
        phone: o.phone,
        code: o.code,
        persons: mine.filter((l) => l.kind === 'ticket').reduce((s, l) => s + l.quantity, 0),
        children: choice.children ?? 0,
        labs,
        activities: choice.activities.map((k) => settings?.activities.find((a) => a.key === k)?.label ?? k),
        activityKeys: choice.activities,
        detail: mine.map((l) => `${l.quantity} × ${l.name}`).join(', '),
        paid: o.status !== 'pending',
        free: o.status !== 'pending' && o.totalCents === 0,
        statusLabel: o.status === 'pending' ? 'IN ATTESA' : o.status,
        amountCents: o.totalCents,
      };
    }),
  );
  const labProduct = labId ? lines.find((l) => l.productId === labId)?.name : null;
  return {
    edition: { title: ed.title, slug: ed.slug },
    groups,
    layout: settings ? ('activities' as const) : ('generic' as const),
    activityColumns: settings?.activities.map((a) => ({ key: a.key, label: a.label.replace(/\s*\([^)]*\)/g, '') })) ?? [],
    labLabel: labProduct ? labProduct.toUpperCase() : 'LABORATORIO',
    generatedAt: `${formatDate(new Date(), 'short')}, ${romeTime(new Date())}`,
  };
}
