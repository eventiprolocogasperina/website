import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, withTransaction } from '@/server/db/client';
import { cashRegisters, cashSales, cashSessions, editions, orderLines, ordersV2, payments, products, refundsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { lockOrder } from '@/server/domain/orders/shared';
import { assertCanOn } from './shared';

/** Metodi tra cui si può correggere un contributo registrato male (l'omaggio resta un annullo). */
export const CORRECTABLE_METHODS = ['cash', 'card_pos'] as const;
export type CorrectableMethod = (typeof CORRECTABLE_METHODS)[number];

export type SaleLookup = {
  orderId: string;
  code: string;
  number: number | null;
  register: string;
  at: string;
  totalCents: number;
  items: string;
  /** Metodo del pagamento, se ce n'è uno solo tra contanti e POS; null se non si può correggere. */
  method: CorrectableMethod | null;
  voided: boolean;
  sessionClosed: boolean;
};

/** Vendite di cassa dell'edizione con quel numero progressivo (più d'una se la numerazione è ripartita). */
export async function findSalesByNumber(ctx: Ctx, editionSlug: string, number: number): Promise<SaleLookup[]> {
  assertCanOn(ctx, 'pos.void', editionSlug);
  const db = getDb();
  const rows = await db
    .select({ s: cashSales, o: ordersV2, register: cashRegisters.name, closedAt: cashSessions.closedAt })
    .from(cashSales)
    .innerJoin(ordersV2, eq(ordersV2.id, cashSales.orderId))
    .innerJoin(editions, eq(editions.id, cashSales.editionId))
    .leftJoin(cashRegisters, eq(cashRegisters.id, cashSales.registerId))
    .leftJoin(cashSessions, eq(cashSessions.id, cashSales.cashSessionId))
    .where(and(eq(editions.slug, editionSlug), eq(cashSales.number, number)))
    .orderBy(desc(ordersV2.createdAt))
    .limit(10);
  const out: SaleLookup[] = [];
  for (const { s, o, register, closedAt } of rows) {
    const [pays, lines, refunds] = await Promise.all([
      db.select().from(payments).where(and(eq(payments.orderId, o.id), eq(payments.status, 'succeeded'))),
      db.select({ name: products.name, quantity: orderLines.quantity }).from(orderLines).innerJoin(products, eq(products.id, orderLines.productId)).where(eq(orderLines.orderId, o.id)),
      db.select({ id: refundsV2.id }).from(refundsV2).where(eq(refundsV2.orderId, o.id)),
    ]);
    const only = pays.length === 1 && !refunds.length ? pays[0].method : null;
    out.push({
      orderId: o.id,
      code: o.code,
      number: s.number,
      register: register ?? 'Senza cassa',
      at: (o.paidAt ?? o.createdAt).toISOString(),
      totalCents: o.totalCents,
      items: lines.map((l) => `${l.quantity}× ${l.name}`).join(', '),
      method: only === 'cash' || only === 'card_pos' ? only : null,
      voided: !!s.voidedAt,
      sessionClosed: !!closedAt,
    });
  }
  return out;
}

export const ChangeSaleMethodInput = z.object({
  orderId: z.uuid(),
  method: z.enum(CORRECTABLE_METHODS),
  reason: z.string().trim().min(3, 'Scrivi il motivo della correzione.').max(500),
});

/**
 * Corregge il metodo di un contributo registrato male (contanti ↔ POS). L'importo non cambia;
 * cambia solo il metodo del pagamento, con il prima e il dopo nel registro attività. Nulla si cancella.
 */
export async function changeSaleMethod(ctx: Ctx, input: z.input<typeof ChangeSaleMethodInput>): Promise<{ from: CorrectableMethod; to: CorrectableMethod }> {
  const data = ChangeSaleMethodInput.parse(input);
  return withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, data.orderId);
    assertCanOn(ctx, 'pos.void', edition.slug);
    if (edition.status === 'archived') throw new DomainError('EDITION_ARCHIVED');
    const [sale] = await tx.select().from(cashSales).where(eq(cashSales.orderId, order.id)).for('update');
    if (!sale) throw new DomainError('NOT_FOUND', { message: 'Vendita di cassa non trovata.' });
    if (sale.voidedAt || order.status === 'cancelled') throw new DomainError('CONFLICT', { message: 'Questa vendita è stata annullata: non si corregge.' });
    const pays = await tx.select().from(payments).where(and(eq(payments.orderId, order.id), eq(payments.status, 'succeeded')));
    const refunds = await tx.select({ id: refundsV2.id }).from(refundsV2).where(eq(refundsV2.orderId, order.id));
    const pay = pays.length === 1 && !refunds.length ? pays[0] : null;
    if (!pay || (pay.method !== 'cash' && pay.method !== 'card_pos'))
      throw new DomainError('CONFLICT', { message: 'Si correggono solo le vendite pagate in un’unica volta, in contanti o col POS.' });
    if (pay.method === data.method) throw new DomainError('CONFLICT', { message: 'La vendita è già registrata con questo metodo.' });
    const from = pay.method;
    await tx.update(payments).set({ method: data.method, updatedAt: new Date() }).where(eq(payments.id, pay.id));
    await audit(tx, ctx, 'cash.sale_method_changed', {
      entityType: 'order',
      entityId: order.id,
      edition: edition.slug,
      before: { method: from, amountCents: pay.amountCents },
      after: { method: data.method, code: order.code, number: sale.number },
      reason: data.reason,
    });
    return { from, to: data.method };
  });
}
