import 'server-only';
import { and, eq, gte, inArray, isNotNull, lt, sql, type SQL } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import type { getDb, Tx } from '@/server/db/client';
import { cashCounters, cashRegisters, cashSales, cashSessions, orderLines, ordersV2, payments, products, refundsV2, users } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { POS_METHODS, type Movement, type PosMethod, type SaleFlags, type SoldLine } from './totals';

export type Db = Tx | ReturnType<typeof getDb>;
export type RegisterRow = typeof cashRegisters.$inferSelect;
export type CashSessionRow = typeof cashSessions.$inferSelect;

export function assertCanOn(ctx: Ctx, permission: Permission, edition: string) {
  if (!can(ctx, permission, { edition })) throw new DomainError('FORBIDDEN');
}

/** Contatore per edizione (numero da chiamare, chiusure Z): incremento atomico, crea la riga se manca. */
export async function nextCounter(tx: Tx, editionId: string, kind: 'order_number' | 'z_report'): Promise<number> {
  const [row] = await tx
    .insert(cashCounters)
    .values({ editionId, kind, value: 1 })
    .onConflictDoUpdate({ target: [cashCounters.editionId, cashCounters.kind], set: { value: sql`${cashCounters.value} + 1`, updatedAt: new Date() } })
    .returning({ value: cashCounters.value });
  return row.value;
}

const isPosMethod = (m: string): m is PosMethod => (POS_METHODS as readonly string[]).includes(m);

export type MovementFilter = { editionId: string; sessionId?: string; from?: Date; to?: Date };

/**
 * Movimenti, righe e vendite di cassa per il calcolo dei totali (totals.ts).
 * Con `sessionId`: solo quel turno (chiusura Z). Senza: tutta l'edizione (rendiconto).
 */
export async function loadCashData(db: Db, f: MovementFilter): Promise<{ movements: Movement[]; lines: SoldLine[]; sales: SaleFlags[] }> {
  const time = (col: Parameters<typeof gte>[0]): SQL[] => [...(f.from ? [gte(col, f.from)] : []), ...(f.to ? [lt(col, f.to)] : [])];

  const payRows = await db
    .select({ orderId: payments.orderId, method: payments.method, amount: payments.amountCents, at: payments.receivedAt, sessionId: payments.cashSessionId, register: cashRegisters.name, operator: users.name })
    .from(payments)
    .innerJoin(cashSales, eq(cashSales.orderId, payments.orderId))
    .innerJoin(ordersV2, eq(ordersV2.id, payments.orderId))
    .leftJoin(users, eq(users.id, ordersV2.operatorId))
    .leftJoin(cashSessions, eq(cashSessions.id, payments.cashSessionId))
    .leftJoin(cashRegisters, eq(cashRegisters.id, cashSessions.registerId))
    .where(and(eq(cashSales.editionId, f.editionId), eq(payments.status, 'succeeded'), f.sessionId ? eq(payments.cashSessionId, f.sessionId) : undefined, ...time(payments.receivedAt)));

  const refRows = await db
    .select({ orderId: refundsV2.orderId, method: refundsV2.method, amount: refundsV2.amountCents, at: refundsV2.processedAt, sessionId: refundsV2.cashSessionId, register: cashRegisters.name, operator: users.name })
    .from(refundsV2)
    .innerJoin(cashSales, eq(cashSales.orderId, refundsV2.orderId))
    .leftJoin(users, eq(users.id, refundsV2.processedBy))
    .leftJoin(cashSessions, eq(cashSessions.id, refundsV2.cashSessionId))
    .leftJoin(cashRegisters, eq(cashRegisters.id, cashSessions.registerId))
    .where(and(eq(cashSales.editionId, f.editionId), eq(refundsV2.status, 'paid'), isNotNull(refundsV2.processedAt), f.sessionId ? eq(refundsV2.cashSessionId, f.sessionId) : undefined, ...time(refundsV2.processedAt)));

  const movements: Movement[] = [];
  for (const r of payRows) {
    if (!isPosMethod(r.method)) continue;
    movements.push({ kind: 'payment', orderId: r.orderId, method: r.method, amountCents: r.amount, at: r.at, sessionId: r.sessionId, registerName: r.register ?? 'Senza cassa', operatorName: r.operator ?? 'Non indicato' });
  }
  for (const r of refRows) {
    if (!isPosMethod(r.method)) continue;
    movements.push({ kind: 'refund', orderId: r.orderId, method: r.method, amountCents: r.amount, at: r.at!, sessionId: r.sessionId, registerName: r.register ?? 'Admin', operatorName: r.operator ?? 'Non indicato' });
  }

  const saleRows = await db
    .select({ orderId: cashSales.orderId, voidedAt: cashSales.voidedAt, oversold: cashSales.oversold, afterClose: cashSales.afterClose, createdAt: ordersV2.paidAt })
    .from(cashSales)
    .innerJoin(ordersV2, eq(ordersV2.id, cashSales.orderId))
    .where(and(eq(cashSales.editionId, f.editionId), f.sessionId ? eq(cashSales.cashSessionId, f.sessionId) : undefined, ...time(ordersV2.paidAt)));
  const sales: SaleFlags[] = saleRows.map((s) => ({ orderId: s.orderId, voided: !!s.voidedAt, flagged: s.oversold || s.afterClose }));

  const ids = saleRows.map((s) => s.orderId);
  const lineRows = ids.length
    ? await db
        .select({ orderId: orderLines.orderId, productId: orderLines.productId, name: products.name, quantity: orderLines.quantity, total: orderLines.totalCents })
        .from(orderLines)
        .innerJoin(products, eq(products.id, orderLines.productId))
        .where(inArray(orderLines.orderId, ids))
    : [];
  const voided = new Set(sales.filter((s) => s.voided).map((s) => s.orderId));
  const lines: SoldLine[] = lineRows.map((l) => ({ orderId: l.orderId, productId: l.productId, name: l.name, quantity: l.quantity, totalCents: l.total, voided: voided.has(l.orderId) }));
  return { movements, lines, sales };
}
