// Stato di pagamento di un ordine (§5.4): sempre derivato da pagamenti e rimborsi, mai impostato a mano.
// Funzioni pure.

export type OrderStatus = 'pending' | 'paid' | 'partially_refunded' | 'refunded' | 'cancelled' | 'expired' | 'draft';

export type PaymentLike = { status: string; amountCents: number };
export type RefundLike = { status: string; amountCents: number };

export type PaymentSummary = {
  /** Pagamenti riusciti. */
  paidCents: number;
  /** Rimborsi già eseguiti. */
  refundedCents: number;
  /** Rimborsi richiesti o approvati ma non ancora eseguiti. */
  refundPendingCents: number;
  /** Quanto si può ancora chiedere a rimborso. */
  refundableCents: number;
  /** Quanto manca da pagare (0 se pagato). */
  dueCents: number;
};

export function summarizePayments(totalCents: number, payments: PaymentLike[], refunds: RefundLike[] = []): PaymentSummary {
  const sum = (rows: Array<{ amountCents: number }>) => rows.reduce((s, r) => s + r.amountCents, 0);
  const paidCents = sum(payments.filter((p) => p.status === 'succeeded'));
  const refundedCents = sum(refunds.filter((r) => r.status === 'paid'));
  const refundPendingCents = sum(refunds.filter((r) => r.status === 'requested' || r.status === 'approved'));
  return {
    paidCents,
    refundedCents,
    refundPendingCents,
    refundableCents: Math.max(0, paidCents - refundedCents - refundPendingCents),
    dueCents: Math.max(0, totalCents - paidCents),
  };
}

/**
 * Lo stato che l'ordine deve avere dati totale, pagamenti e rimborsi.
 * Un ordine annullato o scaduto resta tale: se arriva comunque un pagamento, decide il servizio dei
 * pagamenti, che prima controlla che i posti ci siano ancora (vedi recordPayment).
 */
export function derivePaymentStatus(current: OrderStatus, totalCents: number, payments: PaymentLike[], refunds: RefundLike[] = []): OrderStatus {
  if (current === 'cancelled' || current === 'expired' || current === 'draft') return current;
  const s = summarizePayments(totalCents, payments, refunds);
  const covered = s.paidCents >= totalCents && (s.paidCents > 0 || totalCents === 0);
  if (!covered) return 'pending';
  if (s.refundedCents > 0) return s.refundedCents >= s.paidCents ? 'refunded' : 'partially_refunded';
  return 'paid';
}

/** Stati in cui i biglietti fanno entrare. */
export const ADMITTING_STATUSES: OrderStatus[] = ['paid', 'partially_refunded'];
