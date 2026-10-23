import 'server-only';
import { and, asc, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { checkinLists, checkins, customers, devices, editions, ordersV2, payments, products, sessions, ticketsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { isReadOnly } from '@/server/domain/editions/lifecycle';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { lockEdition } from '@/server/domain/orders/shared';
import { ADMITTING_STATUSES, summarizePayments, type OrderStatus } from '@/server/domain/payments/status';
import { effectiveSession, listAcceptsProduct, sessionGraph, sessionMatches, type SessionGraph } from './rules';

export function assertCanOn(ctx: Ctx, permission: Permission, edition: string) {
  if (!can(ctx, permission, { edition })) throw new DomainError('FORBIDDEN');
}

/** Date dell'edizione con i rinvii, per capire in che giorno vale un biglietto. */
export type Db = Tx | ReturnType<typeof getDb>;

export async function loadSessionGraph(db: Db, editionId: string): Promise<SessionGraph> {
  const rows = await db
    .select({ id: sessions.id, label: sessions.label, status: sessions.status, rescheduledToSessionId: sessions.rescheduledToSessionId })
    .from(sessions)
    .where(eq(sessions.editionId, editionId));
  return sessionGraph(rows);
}

/**
 * Cosa vede chi scansiona: prodotto, data, codice ordine e nome, niente email né telefono.
 * `validOn` è la data in cui il biglietto vale davvero: diversa da `sessionLabel` se la data è stata rinviata.
 */
export type ScannedTicket = { id: string; orderId: string; productName: string; sessionLabel: string | null; validOn: string | null; orderCode: string; holderName: string | null };

export type ScanResult =
  | { result: 'valid'; checkinId: string; at: Date; ticket: ScannedTicket }
  /** `checkinId`: il passaggio che lo ha fatto entrare, per annullarlo dall'esito (con conferma). */
  | { result: 'already_used'; checkinId: string; at: Date; by: string | null; ticket: ScannedTicket }
  | { result: 'wrong_session'; ticket: ScannedTicket }
  | { result: 'wrong_list'; ticket: ScannedTicket }
  | { result: 'void'; ticket: ScannedTicket }
  | { result: 'blocked'; ticket: ScannedTicket }
  /** Ordine "Paga in loco" non ancora pagato: non entra finché non si incassa (cassa o varco). */
  | { result: 'to_pay'; dueCents: number; ticket: ScannedTicket }
  | { result: 'unknown' };

export const ScanInput = z
  .object({
    qrToken: z.string().trim().min(4).max(200).optional(),
    /** In alternativa al QR, dalla ricerca manuale. */
    ticketId: z.string().uuid().optional(),
    checkinListId: z.string().uuid(),
    /** Data per cui si sta facendo entrare. Se la lista ha una data, vale quella della lista. */
    sessionId: z.string().uuid().nullish(),
  })
  .refine((d) => !!d.qrToken !== !!d.ticketId, { message: 'Indica il QR oppure il biglietto.' });

export type ScanOptions = {
  /** Orario del passaggio (per i passaggi offline, quello del telefono). */
  now?: Date;
  /** ID del passaggio generato dallo scanner offline: rimandarlo non crea un secondo passaggio. */
  clientId?: string;
};

type ScanData = z.output<typeof ScanInput>;
type ListRow = typeof checkinLists.$inferSelect;
export type Ready = { list: ListRow; editionSlug: string; ticketId: string; orderCode: string; ticket: ScannedTicket };
export type Judged = { final: ScanResult } | { ready: Ready };
type Scope = { list: ListRow; editionSlug: string };

/** Lista e edizione della scansione, con il permesso. Con `tx` l'edizione è condivisa (FOR SHARE). */
export async function openList(db: Db, ctx: Ctx, listId: string, tx: Tx | null): Promise<Scope> {
  const [list] = await db.select().from(checkinLists).where(eq(checkinLists.id, listId));
  if (!list) throw new DomainError('NOT_FOUND');
  let editionSlug: string;
  if (tx) editionSlug = (await lockEdition(tx, list.editionId)).slug;
  else {
    const [e] = await db.select({ slug: editions.slug, status: editions.status }).from(editions).where(eq(editions.id, list.editionId));
    if (!e) throw new DomainError('NOT_FOUND');
    if (isReadOnly(e.status)) throw new DomainError('EDITION_ARCHIVED');
    editionSlug = e.slug;
  }
  assertCanOn(ctx, 'checkin.scan', editionSlug);
  return { list, editionSlug };
}

/** Biglietti con ordine, prodotto, nome e data. Con `tx` bloccati (FOR UPDATE), sempre nello stesso ordine. */
export async function loadRows(db: Db, where: SQL | undefined, tx: Tx | null) {
  const query = db
    .select({ ticket: ticketsV2, order: { status: ordersV2.status, code: ordersV2.code, blacklisted: ordersV2.isBlacklisted, deletedAt: ordersV2.deletedAt, payOnSite: ordersV2.payOnSite, totalCents: ordersV2.totalCents }, productName: products.name, customerName: customers.name, session: { label: sessions.label, status: sessions.status } })
    .from(ticketsV2)
    .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
    .innerJoin(products, eq(products.id, ticketsV2.productId))
    .leftJoin(customers, eq(customers.id, ordersV2.customerId))
    .leftJoin(sessions, eq(sessions.id, ticketsV2.sessionId))
    .where(where)
    .orderBy(asc(ticketsV2.createdAt), asc(ticketsV2.id));
  return tx ? await query.for('update', { of: ticketsV2 }) : await query;
}
type Row = Awaited<ReturnType<typeof loadRows>>[number];

/**
 * Controlli della scansione per uno o più biglietti, comuni alla lettura veloce, alla transazione e
 * alla conferma di gruppo. Per ogni riga l'esito definitivo, oppure `ready` se il biglietto può
 * entrare (manca solo la registrazione). Le query aggiuntive (date con i rinvii, pagamenti, passaggi
 * precedenti) partono solo se servono, una volta per tutte le righe.
 */
export async function judge(db: Db, scope: Scope, rows: Row[], sessionId: string | null, clientIdOf: (ticketId: string) => string | undefined): Promise<Judged[]> {
  const { list, editionSlug } = scope;
  const target = list.sessionId ?? sessionId ?? null;
  // Le date con i rinvii servono solo se un biglietto è di una data rinviata o di un'altra data:
  // nel caso comune si risparmia una query.
  const needsGraph = rows.some((r) => r.ticket.editionId === list.editionId && ((target && r.ticket.sessionId && r.ticket.sessionId !== target) || r.session?.status === 'postponed'));
  const graph = needsGraph ? await loadSessionGraph(db, list.editionId) : null;
  const clientIds = rows.map((r) => clientIdOf(r.ticket.id)).filter((c): c is string => !!c);
  const sameClient = clientIds.length ? await db.select().from(checkins).where(inArray(checkins.clientId, clientIds)) : [];
  const dueByOrder = new Map<string, number>();

  const first: Array<Judged | { pending: Ready }> = [];
  for (const row of rows) {
    // Un biglietto di un'altra edizione è "sconosciuto": lo scanner non deve dire di più.
    if (row.ticket.editionId !== list.editionId) {
      first.push({ final: { result: 'unknown' } });
      continue;
    }
    const labelOf = (id: string | null) => (id ? (id === row.ticket.sessionId ? (row.session?.label ?? null) : (graph?.get(id)?.label ?? null)) : null);
    const ticket: ScannedTicket = {
      id: row.ticket.id,
      orderId: row.ticket.orderId,
      productName: row.productName,
      sessionLabel: labelOf(row.ticket.sessionId),
      validOn: labelOf(graph ? effectiveSession(graph, row.ticket.sessionId) : row.ticket.sessionId),
      orderCode: row.order.code,
      holderName: row.ticket.attendeeName ?? row.customerName ?? null,
    };
    const clientId = clientIdOf(row.ticket.id);
    if (clientId) {
      const same = sameClient.find((c) => c.clientId === clientId);
      if (same && same.ticketId !== row.ticket.id) throw new DomainError('CONFLICT', { message: 'Passaggio offline già usato per un altro biglietto.' });
      if (same) {
        first.push({ final: { result: 'valid', checkinId: same.id, at: same.at, ticket } });
        continue;
      }
    }
    // La blacklist vince su tutto: rosso con l'avviso di chiamare un responsabile, anche se l'ordine è annullato.
    if (row.order.blacklisted) {
      first.push({ final: { result: 'blocked', ticket } });
      continue;
    }
    const toPay = row.order.status === 'pending' && row.order.payOnSite;
    if (row.ticket.status === 'void' || row.order.deletedAt || (!toPay && !ADMITTING_STATUSES.includes(row.order.status as OrderStatus))) first.push({ final: { result: 'void', ticket } });
    else if (!listAcceptsProduct(list, row.ticket.productId)) first.push({ final: { result: 'wrong_list', ticket } });
    else if (graph && !sessionMatches(graph, row.ticket.sessionId, target)) first.push({ final: { result: 'wrong_session', ticket } });
    else if (toPay) {
      // "Paga in loco": l'importo è quello che manca, calcolato qui; si entra solo dopo l'incasso.
      let due = dueByOrder.get(row.ticket.orderId);
      if (due === undefined) {
        const pay = await db.select({ status: payments.status, amountCents: payments.amountCents }).from(payments).where(eq(payments.orderId, row.ticket.orderId));
        due = summarizePayments(row.order.totalCents, pay).dueCents;
        dueByOrder.set(row.ticket.orderId, due);
      }
      first.push({ final: { result: 'to_pay', dueCents: due, ticket } });
    } else first.push({ pending: { list, editionSlug, ticketId: row.ticket.id, orderCode: row.order.code, ticket } });
  }

  const pendingIds = first.flatMap((j) => ('pending' in j ? [j.pending.ticketId] : []));
  const previous = new Map<string, { id: string; at: Date; by: string | null }>();
  if (!list.allowMultiple && pendingIds.length) {
    const used = await db
      .select({ ticketId: checkins.ticketId, id: checkins.id, at: checkins.at, by: devices.name })
      .from(checkins)
      .leftJoin(devices, eq(devices.id, checkins.deviceId))
      .where(and(inArray(checkins.ticketId, pendingIds), eq(checkins.checkinListId, list.id), isNull(checkins.revertedAt)))
      .orderBy(desc(checkins.at));
    for (const p of used) if (!previous.has(p.ticketId)) previous.set(p.ticketId, p);
  }
  return first.map((j): Judged => {
    if (!('pending' in j)) return j;
    const p = previous.get(j.pending.ticketId);
    return p ? { final: { result: 'already_used', checkinId: p.id, at: p.at, by: p.by, ticket: j.pending.ticket } } : { ready: j.pending };
  });
}

/**
 * Controlli della scansione di un biglietto. Restituisce l'esito definitivo, oppure `ready` se il
 * biglietto può entrare. Con `tx` il biglietto è bloccato (FOR UPDATE) e l'edizione condivisa (FOR SHARE).
 */
async function evaluate(db: Db, ctx: Ctx, data: ScanData, opts: ScanOptions, tx: Tx | null): Promise<Judged> {
  const scope = await openList(db, ctx, data.checkinListId, tx);
  const rows = await loadRows(db, data.ticketId ? eq(ticketsV2.id, data.ticketId) : eq(ticketsV2.qrToken, data.qrToken!), tx);
  if (!rows.length) return { final: { result: 'unknown' } };
  const [judged] = await judge(db, scope, rows, data.sessionId ?? null, () => opts.clientId);
  return judged;
}

/** Registra l'ingresso di un biglietto pronto, con la voce nel registro e l'evento. */
export async function insertCheckin(tx: Tx, ctx: Ctx, ready: Ready, now: Date, clientId: string | null, events: DomainEvent[], extra: Record<string, unknown> = {}) {
  const { list, editionSlug, ticketId, orderCode, ticket } = ready;
  const [checkin] = await tx
    .insert(checkins)
    .values({ ticketId, checkinListId: list.id, at: now, operatorId: ctx.user?.id ?? null, deviceId: ctx.device?.id ?? null, clientId })
    .returning({ id: checkins.id, at: checkins.at });
  await audit(tx, ctx, 'ticket.checked_in', {
    entityType: 'ticket',
    entityId: ticketId,
    edition: editionSlug,
    after: { list: list.name, orderCode, session: ticket.validOn, ...extra },
  });
  events.push({ type: 'ticket.checked_in', ticketId, checkinListId: list.id, edition: editionSlug });
  return checkin;
}

/**
 * Scansione di un biglietto all'ingresso.
 * Prima una lettura veloce senza transazione: "già entrato", "altra data", "annullato"… si
 * rispondono subito. Solo un biglietto che può entrare apre la transazione, dove viene bloccato
 * (FOR UPDATE) e ricontrollato: due scanner che leggono lo stesso QR nello stesso istante danno un
 * `valid` e un `already_used`.
 */
export async function scan(ctx: Ctx, input: z.input<typeof ScanInput>, opts: ScanOptions = {}): Promise<ScanResult> {
  const data = ScanInput.parse(input);
  const now = opts.now ?? new Date();
  const fast = await evaluate(getDb(), ctx, data, opts, null);
  if ('final' in fast) return fast.final;

  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx): Promise<ScanResult> => {
    const checked = await evaluate(tx, ctx, data, opts, tx);
    if ('final' in checked) return checked.final;
    const checkin = await insertCheckin(tx, ctx, checked.ready, now, opts.clientId ?? null, events, opts.clientId ? { offline: true, at: now } : {});
    return { result: 'valid', checkinId: checkin.id, at: checkin.at, ticket: checked.ready.ticket };
  });
  await publish(events);
  return result;
}

export const RevertCheckinInput = z.object({ checkinId: z.string().uuid(), reason: z.string().trim().max(500).nullish() });

/**
 * Annulla un passaggio fatto per errore: il biglietto torna utilizzabile. Mai una cancellazione (§18.5):
 * il passaggio resta con `reverted_at` e chi l'ha annullato, più la voce nel registro. Vale per
 * "Annulla ultimo" e per l'annullo fatto dopo, dalla ricerca o dall'esito "Già entrato".
 */
export async function revertCheckin(ctx: Ctx, input: z.input<typeof RevertCheckinInput>): Promise<void> {
  const data = RevertCheckinInput.parse(input);
  await withTransaction(async (tx) => {
    const [row] = await tx
      .select({ checkin: checkins, editionId: checkinLists.editionId, list: checkinLists.name })
      .from(checkins)
      .innerJoin(checkinLists, eq(checkinLists.id, checkins.checkinListId))
      .where(eq(checkins.id, data.checkinId))
      .for('update', { of: checkins });
    if (!row) throw new DomainError('NOT_FOUND');
    const edition = await lockEdition(tx, row.editionId);
    assertCanOn(ctx, 'checkin.revert', edition.slug);
    if (row.checkin.revertedAt) throw new DomainError('CONFLICT', { message: 'Il passaggio è già stato annullato.' });
    await tx.update(checkins).set({ revertedAt: new Date(), revertedBy: ctx.user?.id ?? null }).where(eq(checkins.id, row.checkin.id));
    await audit(tx, ctx, 'ticket.checkin_reverted', { entityType: 'ticket', entityId: row.checkin.ticketId, edition: edition.slug, before: { list: row.list, at: row.checkin.at }, reason: data.reason ?? null });
  });
}
