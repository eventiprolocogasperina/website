'use server';

// Server Action della coda rimborsi: approva, segna eseguito, rifiuta, mostra l'IBAN (registrato).
import { runAction } from '@/server/admin/run-action';
import { approveRefund, markRefundPaid, rejectRefund, revealIban } from '@/server/domain/refunds';

const PATHS = ['/admin'];

export async function approveRefundAction(refundId: string) {
  return runAction(PATHS, (ctx) => approveRefund(ctx, { refundId }));
}
export async function payRefundAction(refundId: string) {
  return runAction(PATHS, (ctx) => markRefundPaid(ctx, { refundId }));
}
export async function rejectRefundAction(refundId: string, reason: string) {
  return runAction(PATHS, (ctx) => rejectRefund(ctx, { refundId, reason }));
}
/** L'IBAN intero arriva solo a chi ha refunds.view_iban, e ogni lettura finisce nel registro attività. */
export async function revealIbanAction(refundId: string) {
  return runAction([], (ctx) => revealIban(ctx, refundId));
}
