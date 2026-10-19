import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { validateIban } from '@/lib/validation/iban';
import type { Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { withTransaction, type Tx } from '@/server/db/client';
import { editions, ordersV2, payments, refundsV2, ticketsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { lockOrder, type EditionRow, type OrderRow } from '@/server/domain/orders/shared';
import { derivePaymentStatus, summarizePayments } from '@/server/domain/payments/status';
import { decryptIban, encryptIban, maskIban } from './crypto';
import '@/server/domain/editions/handlers';

type RefundRow = typeof refundsV2.$inferSelect;

function assertCanOn(ctx: Ctx, permission: Permission, edition: string) {
  if (!can(ctx, permission, { edition })) throw new DomainError('FORBIDDEN');
}

const TOO_MUCH = 'L’importo supera quanto pagato e non ancora rimborsato.';

/** Quanto si può ancora rimborsare, senza contare il rimborso indicato. */
async function refundable(tx: Tx, order: OrderRow, excludeRefundId?: string): Promise<number> {
  const [pay, ref] = await Promise.all([
    tx.select().from(payments).where(eq(payments.orderId, order.id)),
    tx
      .select()
      .from(refundsV2)
      .where(and(eq(refundsV2.orderId, order.id), excludeRefundId ? ne(refundsV2.id, excludeRefundId) : undefined)),
  ]);
  return summarizePayments(order.totalCents, pay, ref).refundableCents;
}

const REFUNDABLE_STATUSES: OrderRow['status'][] = ['paid', 'partially_refunded'];

const IbanField = z
  .string()
  .trim()
  .transform((v, c) => {
    const r = validateIban(v);
    if (!r.valid) {
      c.addIssue({ code: 'custom', message: r.error ?? 'IBAN non valido.' });
      return z.NEVER;
    }
    return r.cleanIban;
  });

export const RequestRefundInput = z.object({
  orderCode: z.string().trim().toUpperCase().min(4).max(20),
  /** Il token del link "I miei biglietti": senza, nessuno può chiedere il rimborso di un ordine altrui. */
  accessToken: z.string().trim().min(16).max(100),
  /** Di default tutto il rimborsabile. */
  amountCents: z.number().int().positive().nullish(),
  reason: z.string().trim().min(3, 'Scrivi il motivo.').max(1000),
  iban: IbanField,
  holderName: z.string().trim().min(3, 'Scrivi l’intestatario del conto.').max(120),
});

/**
 * Richiesta di rimborso dal sito (pubblica, ma solo con il token dell'ordine).
 * L'IBAN viene validato e salvato cifrato; nel registro e negli eventi non compare.
 */
export async function requestRefund(ctx: Ctx, input: z.input<typeof RequestRefundInput>): Promise<{ refundId: string; amountCents: number }> {
  const data = RequestRefundInput.parse(input);
  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx) => {
    const [found] = await tx.select({ id: ordersV2.id, accessToken: ordersV2.accessToken }).from(ordersV2).where(eq(ordersV2.code, data.orderCode));
    const a = Buffer.from(found?.accessToken ?? '');
    const b = Buffer.from(data.accessToken);
    if (!found || a.length !== b.length || !timingSafeEqual(a, b)) throw new DomainError('NOT_FOUND');
    const { order, edition } = await lockOrder(tx, found.id);
    if (!REFUNDABLE_STATUSES.includes(order.status)) throw new DomainError('CONFLICT', { message: 'Questo ordine non ha importi da rimborsare.' });
    const max = await refundable(tx, order);
    const amountCents = data.amountCents ?? max;
    if (amountCents <= 0 || amountCents > max) throw new DomainError('VALIDATION', { message: TOO_MUCH });

    const [row] = await tx
      .insert(refundsV2)
      .values({ orderId: order.id, amountCents, reason: data.reason, method: 'bank_transfer', status: 'requested', ibanEncrypted: encryptIban(data.iban), holderName: data.holderName })
      .returning({ id: refundsV2.id });
    await audit(tx, ctx, 'refund.requested', { entityType: 'refund', entityId: row.id, edition: edition.slug, after: { orderCode: order.code, amountCents, conto: maskIban(data.iban) }, reason: data.reason });
    events.push({ type: 'refund.requested', refundId: row.id, orderId: order.id, code: order.code, edition: edition.slug, amountCents });
    return { refundId: row.id, amountCents };
  });
  await publish(events);
  return result;
}

export const CreateRefundInput = z.object({
  orderId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  method: z.enum(['bank_transfer', 'nexi', 'cash']),
  reason: z.string().trim().min(3, 'Scrivi il motivo.').max(1000),
  iban: IbanField.nullish(),
  holderName: z.string().trim().max(120).nullish(),
});

/** Rimborso deciso dall'admin (es. in contanti alla cassa): nasce già approvato. */
export async function createRefund(ctx: Ctx, input: z.input<typeof CreateRefundInput>): Promise<{ refundId: string }> {
  const data = CreateRefundInput.parse(input);
  return withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, data.orderId);
    assertCanOn(ctx, 'orders.refund', edition.slug);
    if (!REFUNDABLE_STATUSES.includes(order.status)) throw new DomainError('CONFLICT', { message: 'Questo ordine non ha importi da rimborsare.' });
    if (data.amountCents > (await refundable(tx, order))) throw new DomainError('VALIDATION', { message: TOO_MUCH });
    const [row] = await tx
      .insert(refundsV2)
      .values({
        orderId: order.id,
        amountCents: data.amountCents,
        reason: data.reason,
        method: data.method,
        status: 'approved',
        ibanEncrypted: data.iban ? encryptIban(data.iban) : null,
        holderName: data.holderName ?? null,
        processedBy: ctx.user?.id ?? null,
      })
      .returning({ id: refundsV2.id });
    await audit(tx, ctx, 'refund.created', { entityType: 'refund', entityId: row.id, edition: edition.slug, after: { orderCode: order.code, amountCents: data.amountCents, method: data.method }, reason: data.reason });
    return { refundId: row.id };
  });
}

async function lockRefund(tx: Tx, refundId: string): Promise<{ refund: RefundRow; order: OrderRow; edition: EditionRow }> {
  const [refund] = await tx.select().from(refundsV2).where(eq(refundsV2.id, refundId)).for('update');
  if (!refund) throw new DomainError('NOT_FOUND');
  const { order, edition } = await lockOrder(tx, refund.orderId);
  return { refund, order, edition };
}

const RefundIdInput = z.object({ refundId: z.string().uuid() });

export async function approveRefund(ctx: Ctx, input: z.input<typeof RefundIdInput>): Promise<void> {
  const { refundId } = RefundIdInput.parse(input);
  await withTransaction(async (tx) => {
    const { refund, order, edition } = await lockRefund(tx, refundId);
    assertCanOn(ctx, 'orders.refund', edition.slug);
    if (refund.status !== 'requested') throw new DomainError('CONFLICT', { message: 'La richiesta è già stata gestita.' });
    if (refund.amountCents > (await refundable(tx, order, refund.id))) throw new DomainError('VALIDATION', { message: TOO_MUCH });
    await tx.update(refundsV2).set({ status: 'approved', processedBy: ctx.user?.id ?? null, updatedAt: new Date() }).where(eq(refundsV2.id, refund.id));
    await audit(tx, ctx, 'refund.approved', { entityType: 'refund', entityId: refund.id, edition: edition.slug, before: { status: refund.status }, after: { status: 'approved' } });
  });
}

/**
 * Segna il rimborso come eseguito e ricalcola lo stato dell'ordine.
 * Rimborso totale: i biglietti non valgono più. Rimborso parziale: restano validi.
 */
export async function markRefundPaid(ctx: Ctx, input: z.input<typeof RefundIdInput>): Promise<{ orderStatus: string }> {
  const { refundId } = RefundIdInput.parse(input);
  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx) => {
    const { refund, order, edition } = await lockRefund(tx, refundId);
    assertCanOn(ctx, 'orders.refund', edition.slug);
    if (refund.status !== 'approved') throw new DomainError('CONFLICT', { message: 'Prima va approvato.' });
    const now = new Date();
    await tx.update(refundsV2).set({ status: 'paid', processedAt: now, processedBy: ctx.user?.id ?? null, updatedAt: now }).where(eq(refundsV2.id, refund.id));
    const [pay, ref] = await Promise.all([tx.select().from(payments).where(eq(payments.orderId, order.id)), tx.select().from(refundsV2).where(eq(refundsV2.orderId, order.id))]);
    const next = derivePaymentStatus(order.status, order.totalCents, pay, ref);
    if (next !== order.status) await tx.update(ordersV2).set({ status: next, updatedAt: now }).where(eq(ordersV2.id, order.id));
    if (next === 'refunded') await tx.update(ticketsV2).set({ status: 'void', updatedAt: now }).where(eq(ticketsV2.orderId, order.id));
    await audit(tx, ctx, 'refund.paid', {
      entityType: 'refund',
      entityId: refund.id,
      edition: edition.slug,
      before: { status: refund.status, orderStatus: order.status },
      after: { status: 'paid', orderStatus: next, amountCents: refund.amountCents },
    });
    events.push({ type: 'order.refunded', orderId: order.id, code: order.code, edition: edition.slug, amountCents: refund.amountCents, fully: next === 'refunded' });
    return { orderStatus: next };
  });
  await publish(events);
  return result;
}

export const RejectRefundInput = z.object({ refundId: z.string().uuid(), reason: z.string().trim().min(3, 'Scrivi il motivo.').max(1000) });

export async function rejectRefund(ctx: Ctx, input: z.input<typeof RejectRefundInput>): Promise<void> {
  const data = RejectRefundInput.parse(input);
  await withTransaction(async (tx) => {
    const { refund, edition } = await lockRefund(tx, data.refundId);
    assertCanOn(ctx, 'orders.refund', edition.slug);
    if (refund.status !== 'requested' && refund.status !== 'approved') throw new DomainError('CONFLICT', { message: 'La richiesta è già stata gestita.' });
    await tx.update(refundsV2).set({ status: 'rejected', processedAt: new Date(), processedBy: ctx.user?.id ?? null, updatedAt: new Date() }).where(eq(refundsV2.id, refund.id));
    await audit(tx, ctx, 'refund.rejected', { entityType: 'refund', entityId: refund.id, edition: edition.slug, before: { status: refund.status }, after: { status: 'rejected' }, reason: data.reason });
  });
}

/** IBAN in chiaro, per fare il bonifico. Solo con `refunds.view_iban`, e la lettura resta nel registro. */
export async function revealIban(ctx: Ctx, refundId: string): Promise<{ iban: string | null; holderName: string | null }> {
  const id = z.string().uuid().parse(refundId);
  return withTransaction(async (tx) => {
    const [refund] = await tx.select().from(refundsV2).where(eq(refundsV2.id, id));
    if (!refund) throw new DomainError('NOT_FOUND');
    const [order] = await tx.select({ editionId: ordersV2.editionId }).from(ordersV2).where(eq(ordersV2.id, refund.orderId));
    // Anche su un'edizione archiviata: leggere l'IBAN non è una modifica.
    const [edition] = await tx.select({ slug: editions.slug }).from(editions).where(eq(editions.id, order.editionId));
    if (!can(ctx, 'refunds.view_iban', { edition: edition.slug })) throw new DomainError('FORBIDDEN');
    await audit(tx, ctx, 'refund.iban_viewed', { entityType: 'refund', entityId: refund.id, edition: edition.slug });
    return { iban: refund.ibanEncrypted ? decryptIban(refund.ibanEncrypted) : null, holderName: refund.holderName };
  });
}
