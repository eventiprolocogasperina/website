import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { checkinLists, checkins, customers, devices, ordersV2, products, sessions, ticketsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
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

/**
 * Scansione di un biglietto all'ingresso.
 * Il biglietto viene bloccato (FOR UPDATE) prima di controllare i passaggi, così due scanner che
 * leggono lo stesso QR nello stesso istante danno un `valid` e un `already_used`.
 */
export async function scan(ctx: Ctx, input: z.input<typeof ScanInput>, opts: ScanOptions = {}): Promise<ScanResult> {
  const data = ScanInput.parse(input);
  const now = opts.now ?? new Date();
  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx): Promise<ScanResult> => {
    const [list] = await tx.select().from(checkinLists).where(eq(checkinLists.id, data.checkinListId));
    if (!list) throw new DomainError('NOT_FOUND');
    const edition = await lockEdition(tx, list.editionId);
    assertCanOn(ctx, 'checkin.scan', edition.slug);

    const [row] = await tx
      .select({ ticket: ticketsV2, order: { status: ordersV2.status, code: ordersV2.code, blacklisted: ordersV2.isBlacklisted, deletedAt: ordersV2.deletedAt }, productName: products.name, customerName: customers.name })
      .from(ticketsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
      .innerJoin(products, eq(products.id, ticketsV2.productId))
      .leftJoin(customers, eq(customers.id, ordersV2.customerId))
      .where(data.ticketId ? eq(ticketsV2.id, data.ticketId) : eq(ticketsV2.qrToken, data.qrToken!))
      .for('update', { of: ticketsV2 });
    // Un biglietto di un'altra edizione è "sconosciuto": lo scanner non deve dire di più.
    if (!row || row.ticket.editionId !== list.editionId) return { result: 'unknown' };

    const graph = await loadSessionGraph(tx, list.editionId);
    const labelOf = (id: string | null) => (id ? (graph.get(id)?.label ?? null) : null);
    const ticket: ScannedTicket = {
      id: row.ticket.id,
      orderId: row.ticket.orderId,
      productName: row.productName,
      sessionLabel: labelOf(row.ticket.sessionId),
      validOn: labelOf(effectiveSession(graph, row.ticket.sessionId)),
      orderCode: row.order.code,
      holderName: row.ticket.attendeeName ?? row.customerName ?? null,
    };

    if (opts.clientId) {
      const [same] = await tx.select().from(checkins).where(eq(checkins.clientId, opts.clientId));
      if (same && same.ticketId !== row.ticket.id) throw new DomainError('CONFLICT', { message: 'Passaggio offline già usato per un altro biglietto.' });
      if (same) return { result: 'valid', checkinId: same.id, at: same.at, ticket };
    }

    if (row.ticket.status === 'void' || row.order.deletedAt || !ADMITTING_STATUSES.includes(row.order.status as OrderStatus)) return { result: 'void', ticket };
    if (row.order.blacklisted) return { result: 'blocked', ticket };
    if (!listAcceptsProduct(list, row.ticket.productId)) return { result: 'wrong_list', ticket };
    if (!sessionMatches(graph, row.ticket.sessionId, list.sessionId ?? data.sessionId ?? null)) return { result: 'wrong_session', ticket };

    if (!list.allowMultiple) {
      const [previous] = await tx
        .select({ at: checkins.at, by: devices.name })
        .from(checkins)
        .leftJoin(devices, eq(devices.id, checkins.deviceId))
        .where(and(eq(checkins.ticketId, row.ticket.id), eq(checkins.checkinListId, list.id), isNull(checkins.revertedAt)))
        .orderBy(desc(checkins.at))
        .limit(1);
      if (previous) return { result: 'already_used', at: previous.at, by: previous.by, ticket };
    }

    const [checkin] = await tx
      .insert(checkins)
      .values({ ticketId: row.ticket.id, checkinListId: list.id, at: now, operatorId: ctx.user?.id ?? null, deviceId: ctx.device?.id ?? null, clientId: opts.clientId ?? null })
      .returning({ id: checkins.id, at: checkins.at });
    await audit(tx, ctx, 'ticket.checked_in', {
      entityType: 'ticket',
      entityId: row.ticket.id,
      edition: edition.slug,
      after: { list: list.name, orderCode: row.order.code, session: ticket.validOn, ...(opts.clientId ? { offline: true, at: now } : {}) },
    });
    events.push({ type: 'ticket.checked_in', ticketId: row.ticket.id, checkinListId: list.id, edition: edition.slug });
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
