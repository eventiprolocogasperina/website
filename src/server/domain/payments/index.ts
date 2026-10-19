import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { withTransaction } from '@/server/db/client';
import { discountsV2, orderLines, ordersV2, payments, refundsV2, ticketsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { lockOrder, reserveSeats } from '@/server/domain/orders/shared';
import { derivePaymentStatus } from './status';
// Email dei biglietti quando l'ordine è pagato.
import '@/server/notifications/handlers';

export { derivePaymentStatus, summarizePayments } from './status';

const METHODS = ['nexi', 'cash', 'card_pos', 'complimentary', 'bank_transfer'] as const;

/** Chi può registrare un pagamento, per metodo. Quelli di Nexi arrivano solo dal callback già verificato. */
const METHOD_PERMISSION: Record<(typeof METHODS)[number], Permission | 'system'> = {
  nexi: 'system',
  cash: 'pos.sell',
  card_pos: 'pos.sell',
  complimentary: 'orders.edit',
  bank_transfer: 'orders.edit',
};

export const RecordPaymentInput = z.object({
  orderId: z.string().uuid(),
  method: z.enum(METHODS),
  amountCents: z.number().int().min(0).max(10_000_000),
  status: z.enum(['pending', 'succeeded', 'failed']),
  /** Riferimento del gestore: rende la chiamata idempotente. */
  providerRef: z.string().trim().min(1).max(200).nullish(),
  /** Risposta del gestore, salvata così com'è (mai nei log). */
  raw: z.record(z.string(), z.unknown()).nullish(),
  cashSessionId: z.string().uuid().nullish(),
});
export type RecordPaymentInput = z.input<typeof RecordPaymentInput>;

export type RecordPaymentResult = {
  paymentId: string;
  orderStatus: string;
  /** true se il pagamento con questo riferimento era già registrato. */
  duplicate: boolean;
};

/**
 * Registra un pagamento e ricalcola lo stato dell'ordine (§5.4).
 * - Idempotente su `providerRef`: un callback ricevuto due volte crea un solo pagamento.
 *   Un pagamento `pending` può diventare `succeeded` o `failed` con lo stesso riferimento.
 * - Se l'ordine era scaduto o annullato e il pagamento arriva lo stesso, l'ordine torna pagato
 *   solo se i posti ci sono ancora; altrimenti resta com'è ed esce `order.paid_after_expiry`
 *   perché qualcuno lo rimborsi.
 */
export async function recordPayment(ctx: Ctx, input: RecordPaymentInput, opts: { now?: Date } = {}): Promise<RecordPaymentResult> {
  const data = RecordPaymentInput.parse(input);
  const now = opts.now ?? new Date();
  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, data.orderId);
    const permission = METHOD_PERMISSION[data.method];
    if (permission === 'system' ? !ctx.system : !can(ctx, permission, { edition: edition.slug })) throw new DomainError('FORBIDDEN');

    let paymentId: string;
    let duplicate = false;
    const [existing] = data.providerRef ? await tx.select().from(payments).where(eq(payments.providerRef, data.providerRef)) : [];
    if (existing) {
      if (existing.orderId !== order.id) throw new DomainError('CONFLICT', { details: { reason: 'provider_ref di un altro ordine' } });
      paymentId = existing.id;
      if (existing.status !== 'pending' || data.status === 'pending') duplicate = true;
      else {
        await tx.update(payments).set({ status: data.status, amountCents: data.amountCents, raw: data.raw ?? existing.raw, receivedAt: now, updatedAt: now }).where(eq(payments.id, existing.id));
      }
    } else {
      const [row] = await tx
        .insert(payments)
        .values({ orderId: order.id, method: data.method, amountCents: data.amountCents, status: data.status, providerRef: data.providerRef ?? null, raw: data.raw ?? null, receivedAt: now, cashSessionId: data.cashSessionId ?? null })
        .returning({ id: payments.id });
      paymentId = row.id;
    }
    if (duplicate) return { paymentId, orderStatus: order.status, duplicate };

    const [pay, ref] = await Promise.all([tx.select().from(payments).where(eq(payments.orderId, order.id)), tx.select().from(refundsV2).where(eq(refundsV2.orderId, order.id))]);
    let next = derivePaymentStatus(order.status, order.totalCents, pay, ref);

    const lateAndCovered = (order.status === 'expired' || order.status === 'cancelled') && derivePaymentStatus('pending', order.totalCents, pay, ref) === 'paid';
    if (lateAndCovered && data.status === 'succeeded') {
      const lines = await tx.select().from(orderLines).where(eq(orderLines.orderId, order.id));
      try {
        await reserveSeats(tx, edition.id, lines, { now, excludeOrderId: order.id });
        next = 'paid';
        await tx.update(ticketsV2).set({ status: 'valid', updatedAt: now }).where(eq(ticketsV2.orderId, order.id));
        if (order.discountId) await tx.update(discountsV2).set({ usedCount: sql`${discountsV2.usedCount} + 1` }).where(eq(discountsV2.id, order.discountId));
      } catch (error) {
        if (!(error instanceof DomainError && error.code === 'SOLD_OUT')) throw error;
        events.push({ type: 'order.paid_after_expiry', orderId: order.id, code: order.code, edition: edition.slug, amountCents: data.amountCents });
      }
    }

    const becamePaid = next === 'paid' && order.status !== 'paid';
    if (next !== order.status) {
      await tx
        .update(ordersV2)
        .set({ status: next, paidAt: becamePaid ? now : order.paidAt, expiresAt: becamePaid ? null : order.expiresAt, cancelledAt: becamePaid ? null : order.cancelledAt, updatedAt: now })
        .where(eq(ordersV2.id, order.id));
    }
    await audit(tx, ctx, 'payment.recorded', {
      entityType: 'order',
      entityId: order.id,
      edition: edition.slug,
      before: { status: order.status },
      after: { status: next, paymentId, method: data.method, amountCents: data.amountCents, paymentStatus: data.status },
    });
    if (becamePaid) events.push({ type: 'order.paid', orderId: order.id, code: order.code, edition: edition.slug, totalCents: order.totalCents });
    return { paymentId, orderStatus: next, duplicate };
  });
  await publish(events);
  return result;
}
