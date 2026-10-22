import 'server-only';
import { and, asc, count, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb } from '@/server/db/client';
import { auditLog, checkinLists, checkins, customers, discountsV2, editions, orderLines, orderNotes, ordersV2, payments, products, refundsV2, sessions, ticketsV2 } from '@/server/db/schema';
import { extensionPoints } from '@/modules/registry';
import { isReadOnly } from '@/server/domain/editions/lifecycle';
import { DomainError } from '@/server/domain/errors';
import { summarizePayments, type PaymentSummary } from '@/server/domain/payments/status';
import { decryptIban } from '@/server/domain/refunds/crypto';
import { loadPanels, type LoadedPanel } from './admin-panels';

/** "IT60X0542811101000000123456" → "IT60 •••• •••• 3456" (§11, prompt 12). */
export function maskIbanDisplay(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

/** IBAN mascherato di un rimborso; null se manca o non si decifra (chiave cambiata). */
export function maskedIbanOf(encrypted: string | null): string | null {
  if (!encrypted) return null;
  try {
    return maskIbanDisplay(decryptIban(encrypted));
  } catch {
    return '••••';
  }
}

export type OrderDetail = Awaited<ReturnType<typeof getOrderDetail>>;

/**
 * Tutto quello che serve alla pagina di dettaglio (§10.5), letto solo dal nucleo nuovo.
 * `edition` limita la ricerca a un'edizione (rotta /admin/e/…); null per la vista globale.
 */
export async function getOrderDetail(ctx: Ctx, code: string, edition: string | null) {
  const db = getDb();
  const [order] = await db.select().from(ordersV2).where(and(eq(ordersV2.code, code.toUpperCase()), isNull(ordersV2.deletedAt)));
  if (!order) throw new DomainError('NOT_FOUND');
  const [ed] = await db.select().from(editions).where(eq(editions.id, order.editionId));
  if (edition && ed.slug !== edition) throw new DomainError('NOT_FOUND');
  if (!can(ctx, 'orders.read', { edition: ed.slug })) throw new DomainError('FORBIDDEN');

  const [customer, lines, tickets, pays, refunds, notes, related, sessionRow, discount] = await Promise.all([
    order.customerId ? db.select().from(customers).where(eq(customers.id, order.customerId)).then((r) => r[0] ?? null) : null,
    db
      .select({ id: orderLines.id, productName: products.name, productKind: products.kind, quantity: orderLines.quantity, unitPriceCents: orderLines.unitPriceCents, discountCents: orderLines.discountCents, totalCents: orderLines.totalCents, sessionLabel: sessions.label })
      .from(orderLines)
      .innerJoin(products, eq(products.id, orderLines.productId))
      .leftJoin(sessions, eq(sessions.id, orderLines.sessionId))
      .where(eq(orderLines.orderId, order.id))
      .orderBy(asc(orderLines.createdAt), asc(orderLines.id)),
    db
      .select({ id: ticketsV2.id, lineId: ticketsV2.orderLineId, productName: products.name, sessionLabel: sessions.label, status: ticketsV2.status, attendeeName: ticketsV2.attendeeName })
      .from(ticketsV2)
      .innerJoin(products, eq(products.id, ticketsV2.productId))
      .leftJoin(sessions, eq(sessions.id, ticketsV2.sessionId))
      .where(eq(ticketsV2.orderId, order.id))
      .orderBy(asc(ticketsV2.createdAt), asc(ticketsV2.id)),
    db.select().from(payments).where(eq(payments.orderId, order.id)).orderBy(asc(payments.receivedAt)),
    db.select().from(refundsV2).where(eq(refundsV2.orderId, order.id)).orderBy(asc(refundsV2.requestedAt)),
    db.select().from(orderNotes).where(eq(orderNotes.orderId, order.id)).orderBy(desc(orderNotes.createdAt)),
    db
      .select({ id: ordersV2.id, code: ordersV2.code, status: ordersV2.status, totalCents: ordersV2.totalCents, channel: ordersV2.channel, parentOrderId: ordersV2.parentOrderId })
      .from(ordersV2)
      .where(and(isNull(ordersV2.deletedAt), or(eq(ordersV2.parentOrderId, order.id), order.parentOrderId ? eq(ordersV2.id, order.parentOrderId) : undefined))),
    order.sessionId ? db.select().from(sessions).where(eq(sessions.id, order.sessionId)).then((r) => r[0] ?? null) : null,
    order.discountId ? db.select({ code: discountsV2.code }).from(discountsV2).where(eq(discountsV2.id, order.discountId)).then((r) => r[0] ?? null) : null,
  ]);

  const ticketIds = tickets.map((t) => t.id);
  const [entries, customerOrders, history, editionSessions] = await Promise.all([
    ticketIds.length
      ? db
          .select({ id: checkins.id, ticketId: checkins.ticketId, at: checkins.at, list: checkinLists.name })
          .from(checkins)
          .innerJoin(checkinLists, eq(checkinLists.id, checkins.checkinListId))
          .where(and(inArray(checkins.ticketId, ticketIds), isNull(checkins.revertedAt)))
          .orderBy(asc(checkins.at))
      : [],
    customer ? db.select({ n: count() }).from(ordersV2).where(and(eq(ordersV2.customerId, customer.id), isNull(ordersV2.deletedAt))).then((r) => r[0].n) : 0,
    db
      .select()
      .from(auditLog)
      .where(
        or(
          and(eq(auditLog.entityType, 'order'), eq(auditLog.entityId, order.id)),
          refunds.length ? and(eq(auditLog.entityType, 'refund'), inArray(auditLog.entityId, refunds.map((r) => r.id))) : undefined,
          // Ingressi e annulli dei biglietti dell'ordine (scanner e admin).
          ticketIds.length ? and(eq(auditLog.entityType, 'ticket'), inArray(auditLog.entityId, ticketIds)) : undefined,
        ),
      )
      .orderBy(desc(auditLog.at))
      .limit(100),
    db.select({ id: sessions.id, label: sessions.label, status: sessions.status, startsAt: sessions.startsAt }).from(sessions).where(eq(sessions.editionId, ed.id)).orderBy(asc(sessions.startsAt)),
  ]);

  const slug = ed.slug;
  const allowed = (p: Parameters<typeof can>[1]) => can(ctx, p, { edition: slug });
  const readOnly = isReadOnly(ed.status);
  const panels: LoadedPanel[] = await loadPanels(
    extensionPoints.orderPanels(ed).filter((p) => allowed(p.permission)),
    order,
    ed,
  );
  const summary: PaymentSummary = summarizePayments(order.totalCents, pays, refunds);

  return {
    order: {
      id: order.id,
      code: order.code,
      status: order.status,
      channel: order.channel,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      expiresAt: order.expiresAt?.toISOString() ?? null,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      discountCode: discount?.code ?? null,
      isBlacklisted: order.isBlacklisted,
      blacklistReason: order.blacklistReason,
      legacyNotes: order.legacyNotes,
      sessionId: order.sessionId,
      session: sessionRow ? { label: sessionRow.label, startsAt: sessionRow.startsAt.toISOString() } : null,
    },
    edition: { id: ed.id, slug, title: ed.title, status: ed.status, readOnly, modules: ed.enabledModules },
    customer: customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, orders: customerOrders } : null,
    lines,
    tickets: tickets.map((t) => {
      const first = entries.find((e) => e.ticketId === t.id);
      return { ...t, checkinId: first?.id ?? null, checkedInAt: first?.at.toISOString() ?? null, checkinList: first?.list ?? null };
    }),
    payments: pays.map((p) => ({ id: p.id, method: p.method, status: p.status, amountCents: p.amountCents, receivedAt: p.receivedAt.toISOString() })),
    refunds: refunds.map((r) => ({ id: r.id, status: r.status, method: r.method, amountCents: r.amountCents, reason: r.reason, holderName: r.holderName, iban: maskedIbanOf(r.ibanEncrypted), requestedAt: r.requestedAt.toISOString() })),
    notes: notes.map((n) => ({ id: n.id, author: n.authorLabel, body: n.body, createdAt: n.createdAt.toISOString() })),
    parent: related.find((r) => r.id === order.parentOrderId) ?? null,
    children: related.filter((r) => r.parentOrderId === order.id),
    history: history.map((h) => ({ id: h.id, at: h.at.toISOString(), actor: h.actorLabel ?? 'sistema', action: h.action, reason: h.reason, before: h.before, after: h.after })),
    sessions: editionSessions.map((s) => ({ id: s.id, label: s.label, status: s.status, startsAt: s.startsAt.toISOString() })),
    summary,
    panels,
    moduleActions: readOnly ? [] : extensionPoints.orderActions(ed).filter((a) => allowed(a.permission)),
    can: {
      edit: !readOnly && allowed('orders.edit'),
      cancel: !readOnly && allowed(order.channel === 'pos' ? 'pos.void' : 'orders.cancel'),
      refund: !readOnly && allowed('orders.refund'),
      resend: !readOnly && allowed('orders.resend'),
      markPaid: !readOnly && allowed('orders.edit') && allowed('pos.sell'),
      viewIban: allowed('refunds.view_iban'),
      revertCheckin: !readOnly && allowed('checkin.revert'),
      customer: can(ctx, 'customers.read'),
    },
  };
}
