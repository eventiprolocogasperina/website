'use server';

// Server Action delle pagine Ordini (globale e di edizione): solo chiamate ai servizi di dominio,
// che controllano permessi, edizione archiviata e registro attività.
import { runAction } from '@/server/admin/run-action';
import { setOrdersV2Enabled } from '@/server/admin/flags';
import { cancelOrder, createOrder, moveSession, resendTickets, type CreateOrderInput } from '@/server/domain/orders';
import { addOrderNote, markOrderPaid, moveSessionBulk, refundOrder, resendTicketsBulk, setOrderBlacklist, updateOrderCustomer, type RefundOrderInput } from '@/server/domain/orders/admin';
import { deleteView, saveView } from '@/server/domain/views';
import { createPaylinkFromOrder } from '@/modules/paylink/admin';
import { createPaylinkOrder } from '@/modules/paylink/server';
import { sendMessageToOrders } from '@/modules/broadcast/messages';
import type { z } from 'zod';

const PATHS = ['/admin'];

export async function addNoteAction(orderId: string, body: string) {
  return runAction(PATHS, (ctx) => addOrderNote(ctx, { orderId, body }));
}
export async function setBlacklistAction(orderId: string, blacklisted: boolean, reason: string) {
  return runAction(PATHS, (ctx) => setOrderBlacklist(ctx, { orderId, blacklisted, reason: reason || null }));
}
export async function updateOrderCustomerAction(orderId: string, customer: { email: string; name: string; phone: string }) {
  return runAction(PATHS, (ctx) => updateOrderCustomer(ctx, { orderId, customer: { ...customer, phone: customer.phone || null } }));
}
export async function markPaidAction(orderId: string, method: 'cash' | 'card_pos' | 'bank_transfer') {
  return runAction(PATHS, (ctx) => markOrderPaid(ctx, { orderId, method }));
}
export async function refundAction(input: z.input<typeof RefundOrderInput>) {
  return runAction(PATHS, (ctx) => refundOrder(ctx, input));
}
export async function cancelOrderAction(orderId: string, reason: string) {
  return runAction(PATHS, (ctx) => cancelOrder(ctx, { orderId, reason }));
}
export async function resendTicketsAction(orderId: string) {
  return runAction(PATHS, (ctx) => resendTickets(ctx, { orderId }));
}
export async function moveSessionAction(orderId: string, toSessionId: string, reason: string) {
  return runAction(PATHS, (ctx) => moveSession(ctx, { orderId, toSessionId, reason: reason || null }));
}
export async function paylinkFromOrderAction(orderId: string, lines: Array<{ productId: string; quantity: number }>, idempotencyKey: string) {
  return runAction(PATHS, async (ctx) => (await createPaylinkFromOrder(ctx, { orderId, lines, idempotencyKey })).code);
}

export async function bulkResendAction(orderIds: string[]) {
  return runAction(PATHS, (ctx) => resendTicketsBulk(ctx, orderIds));
}
export async function bulkMoveAction(orderIds: string[], toSessionId: string, reason: string) {
  return runAction(PATHS, (ctx) => moveSessionBulk(ctx, orderIds, toSessionId, reason || null));
}
export async function bulkMessageAction(editionId: string, orderIds: string[], subject: string, body: string) {
  return runAction(PATHS, (ctx) => sendMessageToOrders(ctx, { editionId, orderIds, subject, body }));
}

export type NewOrderInput = Omit<CreateOrderInput, 'channel' | 'expectedTotalCents' | 'answers'> & { channel: 'admin' | 'paylink' };

/** "Nuovo ordine": canale admin (pagato subito o in attesa) o pay-link se il modulo è attivo. Prezzi dal server. */
export async function createOrderAction(input: NewOrderInput) {
  return runAction(PATHS, async (ctx) => {
    const { channel, payNow, ...rest } = input;
    const res = channel === 'paylink' ? await createPaylinkOrder(ctx, rest) : await createOrder(ctx, { ...rest, channel: 'admin', payNow: payNow ?? null });
    return { code: res.code, status: res.status };
  });
}

export async function saveViewAction(name: string, query: string) {
  return runAction([], (ctx) => saveView(ctx, { scope: 'orders', name, query }));
}
export async function deleteViewAction(id: string) {
  return runAction([], (ctx) => deleteView(ctx, id));
}
export async function setOrdersV2Action(enabled: boolean) {
  return runAction(PATHS, (ctx) => setOrdersV2Enabled(ctx, enabled));
}
