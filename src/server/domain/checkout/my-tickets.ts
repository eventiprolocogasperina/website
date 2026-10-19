import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { moduleSettings } from '@/modules/registry';
import { postponementRefundRight } from '@/modules/postponement/server';
import { getDb } from '@/server/db/client';
import { customers, editions, orderLines, ordersV2, payments, products, refundsV2, sessions, ticketsV2 } from '@/server/db/schema';
import { summarizePayments } from '@/server/domain/payments/status';

export type MyOrder = {
  id: string;
  code: string;
  status: string;
  channel: string;
  totalCents: number;
  discountCents: number;
  createdAt: Date;
  paidAt: Date | null;
  expiresAt: Date | null;
  /** In attesa e non ancora scaduto: si può (ri)provare a pagare. */
  payable: boolean;
  accessToken: string;
  edition: { slug: string; title: string; location: string | null; startsAt: Date | null; endsAt: Date | null; enabledModules: string[] };
  session: { id: string; label: string; startsAt: Date; endsAt: Date | null; status: string; rescheduledTo: string | null } | null;
  customer: { name: string | null; email: string } | null;
  lines: Array<{ name: string; quantity: number; unitPriceCents: number; totalCents: number; sessionLabel: string | null }>;
  tickets: Array<{ id: string; qrToken: string; name: string; sessionLabel: string | null; status: string }>;
  /** Cambio data da parte del cliente (modulo Rinvio): date proponibili. */
  dateChange: Array<{ id: string; label: string }> | null;
  refund: { eligible: boolean; reason: string; refundableCents: number; pending: boolean };
};

/** Email parzialmente nascosta, per chi ha solo il link ("n***@gmail.com"). */
export const maskEmail = (e: string) => e.replace(/^(.)[^@]*(@.*)$/, '$1***$2');

/**
 * L'ordine dietro il link "I miei biglietti". Il token (24 byte casuali) è l'unica chiave:
 * la pagina mostra solo quello che serve a usare i biglietti.
 */
export async function getOrderByToken(token: string, now = new Date()): Promise<MyOrder | null> {
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(token)) return null;
  const db = getDb();
  const [row] = await db
    .select({ order: ordersV2, edition: editions, customer: { name: customers.name, email: customers.email } })
    .from(ordersV2)
    .innerJoin(editions, eq(editions.id, ordersV2.editionId))
    .leftJoin(customers, eq(customers.id, ordersV2.customerId))
    .where(eq(ordersV2.accessToken, token));
  if (!row || row.order.deletedAt) return null;
  const { order, edition } = row;

  const [lineRows, ticketRows, sessionRows, pay, ref] = await Promise.all([
    db.select({ line: orderLines, name: products.name }).from(orderLines).innerJoin(products, eq(products.id, orderLines.productId)).where(eq(orderLines.orderId, order.id)),
    db.select({ t: ticketsV2, name: products.name }).from(ticketsV2).innerJoin(products, eq(products.id, ticketsV2.productId)).where(eq(ticketsV2.orderId, order.id)).orderBy(asc(ticketsV2.createdAt)),
    db.select().from(sessions).where(eq(sessions.editionId, edition.id)).orderBy(asc(sessions.startsAt)),
    db.select({ status: payments.status, amountCents: payments.amountCents }).from(payments).where(eq(payments.orderId, order.id)),
    db.select({ status: refundsV2.status, amountCents: refundsV2.amountCents }).from(refundsV2).where(and(eq(refundsV2.orderId, order.id), inArray(refundsV2.status, ['requested', 'approved', 'paid']))),
  ]);
  const label = (id: string | null) => (id ? (sessionRows.find((s) => s.id === id)?.label ?? null) : null);
  const s = order.sessionId ? sessionRows.find((x) => x.id === order.sessionId) : undefined;

  let dateChange: MyOrder['dateChange'] = null;
  if (edition.enabledModules.includes('postponement') && order.status === 'paid' && order.sessionId) {
    const allow = (moduleSettings('postponement', edition.moduleSettings) as { allowCustomerChange: boolean }).allowCustomerChange;
    if (allow) dateChange = sessionRows.filter((x) => x.status === 'open' && x.id !== order.sessionId && x.startsAt.getTime() > now.getTime()).map((x) => ({ id: x.id, label: x.label }));
  }

  const money = summarizePayments(order.totalCents, pay, ref);
  const right = edition.enabledModules.includes('postponement') ? await postponementRefundRight(order.id) : { eligible: false, reason: '' };

  return {
    id: order.id,
    code: order.code,
    status: order.status,
    channel: order.channel,
    totalCents: order.totalCents,
    discountCents: order.discountCents,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    expiresAt: order.expiresAt,
    payable: order.status === 'pending' && (!order.expiresAt || order.expiresAt.getTime() > now.getTime()),
    accessToken: order.accessToken,
    edition: { slug: edition.slug, title: edition.title, location: edition.location, startsAt: edition.startsAt, endsAt: edition.endsAt, enabledModules: edition.enabledModules },
    session: s ? { id: s.id, label: s.label, startsAt: s.startsAt, endsAt: s.endsAt, status: s.status, rescheduledTo: label(s.rescheduledToSessionId) } : null,
    customer: row.customer?.email ? { name: row.customer.name, email: row.customer.email } : null,
    lines: lineRows.map(({ line, name }) => ({ name, quantity: line.quantity, unitPriceCents: line.unitPriceCents, totalCents: line.totalCents, sessionLabel: label(line.sessionId) })),
    tickets: ticketRows.map(({ t, name }) => ({ id: t.id, qrToken: t.qrToken, name, sessionLabel: label(t.sessionId), status: t.status })),
    dateChange,
    refund: {
      eligible: right.eligible && money.refundableCents > 0,
      reason: right.reason,
      refundableCents: money.refundableCents,
      pending: ref.some((r) => r.status === 'requested' || r.status === 'approved'),
    },
  };
}
