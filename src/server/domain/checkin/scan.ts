import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { checkinLists, checkins, customers, devices, editions, ordersV2, products, sessions, ticketsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { isReadOnly } from '@/server/domain/editions/lifecycle';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { lockEdition } from '@/server/domain/orders/shared';
import { ADMITTING_STATUSES, type OrderStatus } from '@/server/domain/payments/status';
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
  | { result: 'already_used'; at: Date; by: string | null; ticket: ScannedTicket }
  | { result: 'wrong_session'; ticket: ScannedTicket }
  | { result: 'wrong_list'; ticket: ScannedTicket }
  | { result: 'void'; ticket: ScannedTicket }
  | { result: 'blocked'; ticket: ScannedTicket }
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
type Ready = { list: typeof checkinLists.$inferSelect; editionSlug: string; ticketId: string; orderCode: string; ticket: ScannedTicket };

/**
 * Controlli della scansione, comuni alla lettura veloce e alla transazione. Restituisce l'esito
 * definitivo, oppure `ready` se il biglietto può entrare (manca solo la registrazione).
 * Con `tx` il biglietto è bloccato (FOR UPDATE) e l'edizione condivisa (FOR SHARE).
 */
async function evaluate(db: Db, ctx: Ctx, data: ScanData, opts: ScanOptions, tx: Tx | null): Promise<{ final: ScanResult } | { ready: Ready }> {
  const [list] = await db.select().from(checkinLists).where(eq(checkinLists.id, data.checkinListId));
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

  const query = db
    .select({ ticket: ticketsV2, order: { status: ordersV2.status, code: ordersV2.code, blacklisted: ordersV2.isBlacklisted, deletedAt: ordersV2.deletedAt }, productName: products.name, customerName: customers.name, session: { label: sessions.label, status: sessions.status } })
    .from(ticketsV2)
    .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
    .innerJoin(products, eq(products.id, ticketsV2.productId))
    .leftJoin(customers, eq(customers.id, ordersV2.customerId))
    .leftJoin(sessions, eq(sessions.id, ticketsV2.sessionId))
    .where(data.ticketId ? eq(ticketsV2.id, data.ticketId) : eq(ticketsV2.qrToken, data.qrToken!));
  const [row] = tx ? await query.for('update', { of: ticketsV2 }) : await query;
  // Un biglietto di un'altra edizione è "sconosciuto": lo scanner non deve dire di più.
  if (!row || row.ticket.editionId !== list.editionId) return { final: { result: 'unknown' } };

  // Le date con i rinvii servono solo se il biglietto è di una data rinviata o di un'altra data:
  // nel caso comune si risparmia una query.
  const target = list.sessionId ?? data.sessionId ?? null;
  const sameDay = !target || !row.ticket.sessionId || row.ticket.sessionId === target;
  const graph = sameDay && row.session?.status !== 'postponed' ? null : await loadSessionGraph(db, list.editionId);
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

  if (opts.clientId) {
    const [same] = await db.select().from(checkins).where(eq(checkins.clientId, opts.clientId));
    if (same && same.ticketId !== row.ticket.id) throw new DomainError('CONFLICT', { message: 'Passaggio offline già usato per un altro biglietto.' });
    if (same) return { final: { result: 'valid', checkinId: same.id, at: same.at, ticket } };
  }

  // La blacklist vince su tutto: rosso con l'avviso di chiamare un responsabile, anche se l'ordine è annullato.
  if (row.order.blacklisted) return { final: { result: 'blocked', ticket } };
  if (row.ticket.status === 'void' || row.order.deletedAt || !ADMITTING_STATUSES.includes(row.order.status as OrderStatus)) return { final: { result: 'void', ticket } };
  if (!listAcceptsProduct(list, row.ticket.productId)) return { final: { result: 'wrong_list', ticket } };
  if (graph && !sessionMatches(graph, row.ticket.sessionId, target)) return { final: { result: 'wrong_session', ticket } };

  if (!list.allowMultiple) {
    const [previous] = await db
      .select({ at: checkins.at, by: devices.name })
      .from(checkins)
      .leftJoin(devices, eq(devices.id, checkins.deviceId))
      .where(and(eq(checkins.ticketId, row.ticket.id), eq(checkins.checkinListId, list.id), isNull(checkins.revertedAt)))
      .orderBy(desc(checkins.at))
      .limit(1);
    if (previous) return { final: { result: 'already_used', at: previous.at, by: previous.by, ticket } };
  }
  return { ready: { list, editionSlug, ticketId: row.ticket.id, orderCode: row.order.code, ticket } };
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
    const { list, editionSlug, ticketId, orderCode, ticket } = checked.ready;
    const [checkin] = await tx
      .insert(checkins)
      .values({ ticketId, checkinListId: list.id, at: now, operatorId: ctx.user?.id ?? null, deviceId: ctx.device?.id ?? null, clientId: opts.clientId ?? null })
      .returning({ id: checkins.id, at: checkins.at });
    await audit(tx, ctx, 'ticket.checked_in', {
      entityType: 'ticket',
      entityId: ticketId,
      edition: editionSlug,
      after: { list: list.name, orderCode, session: ticket.validOn, ...(opts.clientId ? { offline: true, at: now } : {}) },
    });
    events.push({ type: 'ticket.checked_in', ticketId, checkinListId: list.id, edition: editionSlug });
    return { result: 'valid', checkinId: checkin.id, at: checkin.at, ticket };
  });
  await publish(events);
  return result;
}

export const RevertCheckinInput = z.object({ checkinId: z.string().uuid(), reason: z.string().trim().max(500).nullish() });

/** Annulla un passaggio fatto per errore: il biglietto torna utilizzabile. */
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
