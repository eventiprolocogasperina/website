import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { withTransaction } from '@/server/db/client';
import { checkinLists, checkins, ordersV2, products, sessions, ticketsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { editionForWrite } from '@/server/domain/editions';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { lockEdition } from '@/server/domain/orders/shared';
import { ADMITTING_STATUSES, type OrderStatus } from '@/server/domain/payments/status';

function assertCanOn(ctx: Ctx, permission: Permission, edition: string) {
  if (!can(ctx, permission, { edition })) throw new DomainError('FORBIDDEN');
}

export type ScanResult =
  | { result: 'valid'; checkinId: string; at: Date; ticket: ScannedTicket }
  | { result: 'already_used'; at: Date; ticket: ScannedTicket }
  | { result: 'wrong_session'; ticket: ScannedTicket }
  | { result: 'wrong_list'; ticket: ScannedTicket }
  | { result: 'void'; ticket: ScannedTicket }
  | { result: 'unknown' };

/** Cosa vede chi scansiona: prodotto, data e codice ordine, niente email né telefono. */
export type ScannedTicket = { id: string; productName: string; sessionLabel: string | null; orderCode: string; attendeeName: string | null };

export const ScanInput = z.object({
  qrToken: z.string().trim().min(8).max(200),
  checkinListId: z.string().uuid(),
  /** Data per cui si sta facendo entrare; se manca vale quella della lista. */
  sessionId: z.string().uuid().nullish(),
});

/**
 * Scansione di un biglietto all'ingresso.
 * Il biglietto viene bloccato prima di controllare i passaggi, così due scanner che leggono lo
 * stesso QR nello stesso istante danno un `valid` e un `already_used`.
 */
export async function scan(ctx: Ctx, input: z.input<typeof ScanInput>, opts: { now?: Date } = {}): Promise<ScanResult> {
  const data = ScanInput.parse(input);
  const now = opts.now ?? new Date();
  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx): Promise<ScanResult> => {
    const [list] = await tx.select().from(checkinLists).where(eq(checkinLists.id, data.checkinListId));
    if (!list) throw new DomainError('NOT_FOUND');
    const edition = await lockEdition(tx, list.editionId);
    assertCanOn(ctx, 'checkin.scan', edition.slug);

    const [row] = await tx
      .select({ ticket: ticketsV2, orderStatus: ordersV2.status, orderCode: ordersV2.code, productName: products.name, sessionLabel: sessions.label })
      .from(ticketsV2)
      .innerJoin(ordersV2, eq(ordersV2.id, ticketsV2.orderId))
      .innerJoin(products, eq(products.id, ticketsV2.productId))
      .leftJoin(sessions, eq(sessions.id, ticketsV2.sessionId))
      .where(eq(ticketsV2.qrToken, data.qrToken))
      .for('update', { of: ticketsV2 });
    // Un biglietto di un'altra edizione è "sconosciuto": lo scanner non deve dire di più.
    if (!row || row.ticket.editionId !== list.editionId) return { result: 'unknown' };

    const ticket: ScannedTicket = { id: row.ticket.id, productName: row.productName, sessionLabel: row.sessionLabel, orderCode: row.orderCode, attendeeName: row.ticket.attendeeName };
    if (row.ticket.status === 'void' || !ADMITTING_STATUSES.includes(row.orderStatus as OrderStatus)) return { result: 'void', ticket };
    if (list.productIds.length && !list.productIds.includes(row.ticket.productId)) return { result: 'wrong_list', ticket };
    const sessionId = data.sessionId ?? list.sessionId;
    if (sessionId && row.ticket.sessionId && row.ticket.sessionId !== sessionId) return { result: 'wrong_session', ticket };

    if (!list.allowMultiple) {
      const [previous] = await tx
        .select({ at: checkins.at })
        .from(checkins)
        .where(and(eq(checkins.ticketId, row.ticket.id), eq(checkins.checkinListId, list.id), isNull(checkins.revertedAt)))
        .orderBy(desc(checkins.at))
        .limit(1);
      if (previous) return { result: 'already_used', at: previous.at, ticket };
    }

    const [checkin] = await tx
      .insert(checkins)
      .values({ ticketId: row.ticket.id, checkinListId: list.id, at: now, operatorId: ctx.user?.id ?? null, deviceId: ctx.device?.id ?? null })
      .returning({ id: checkins.id, at: checkins.at });
    await audit(tx, ctx, 'ticket.checked_in', { entityType: 'ticket', entityId: row.ticket.id, edition: edition.slug, after: { list: list.name, orderCode: row.orderCode } });
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
    const [row] = await tx.select({ checkin: checkins, editionId: checkinLists.editionId }).from(checkins).innerJoin(checkinLists, eq(checkinLists.id, checkins.checkinListId)).where(eq(checkins.id, data.checkinId)).for('update', { of: checkins });
    if (!row) throw new DomainError('NOT_FOUND');
    const edition = await lockEdition(tx, row.editionId);
    assertCanOn(ctx, 'checkin.revert', edition.slug);
    if (row.checkin.revertedAt) throw new DomainError('CONFLICT', { message: 'Il passaggio è già stato annullato.' });
    await tx.update(checkins).set({ revertedAt: new Date(), revertedBy: ctx.user?.id ?? null }).where(eq(checkins.id, row.checkin.id));
    await audit(tx, ctx, 'ticket.checkin_reverted', { entityType: 'ticket', entityId: row.checkin.ticketId, edition: edition.slug, reason: data.reason ?? null });
  });
}

export const CheckinListInput = z.object({
  name: z.string().trim().min(2, 'Scrivi un nome, es. Ingresso.').max(80),
  productIds: z.array(z.string().uuid()).max(100).default([]),
  sessionId: z.string().uuid().nullish(),
  allowMultiple: z.boolean().default(false),
});

/** Crea o modifica una lista di check-in (l'interfaccia arriva con lo scanner, prompt 15). */
export async function saveCheckinList(ctx: Ctx, editionSlug: string, id: string | null, input: z.input<typeof CheckinListInput>): Promise<{ id: string }> {
  if (!can(ctx, 'catalog.edit', { edition: editionSlug })) throw new DomainError('FORBIDDEN');
  const data = CheckinListInput.parse(input);
  return withTransaction(async (tx) => {
    const edition = await editionForWrite(tx, editionSlug);
    const values = { name: data.name, productIds: data.productIds, sessionId: data.sessionId ?? null, allowMultiple: data.allowMultiple };
    if (!id) {
      const [row] = await tx
        .insert(checkinLists)
        .values({ ...values, editionId: edition.id })
        .returning({ id: checkinLists.id });
      await audit(tx, ctx, 'checkin_list.created', { entityType: 'checkin_list', entityId: row.id, edition: edition.slug, after: values });
      return row;
    }
    const [before] = await tx
      .select()
      .from(checkinLists)
      .where(and(eq(checkinLists.id, id), eq(checkinLists.editionId, edition.id)));
    if (!before) throw new DomainError('NOT_FOUND');
    await tx.update(checkinLists).set({ ...values, updatedAt: new Date() }).where(eq(checkinLists.id, id));
    await audit(tx, ctx, 'checkin_list.updated', { entityType: 'checkin_list', entityId: id, edition: edition.slug, before: { name: before.name, productIds: before.productIds, sessionId: before.sessionId, allowMultiple: before.allowMultiple }, after: values });
    return { id };
  });
}

