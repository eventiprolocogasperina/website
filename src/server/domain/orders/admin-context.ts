import 'server-only';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb } from '@/server/db/client';
import { customers, editions, orderLines, ordersV2, products, sessions } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import type { OrderFilters } from '@/lib/admin/order-filters';
import { isReadOnly } from '@/server/domain/editions/lifecycle';
import { checkinCounts, orderConditions, readableEditions } from './admin-list';

// Dati di contorno delle pagine Ordini (prompt 12): date e prodotti per i filtri e per "Nuovo ordine",
// cosa può fare l'utente, ed esportazione CSV con gli stessi filtri dell'elenco.

export type OrderEditionContext = {
  edition: { id: string; slug: string; title: string; status: string; readOnly: boolean };
  sessions: Array<{ id: string; label: string; status: string }>;
  /** Prodotti vendibili dall'admin (attivi). `paylink`: vendibili anche con il link di pagamento. */
  products: Array<{ id: string; name: string; kind: string; priceCents: number; requiresSession: boolean; paylink: boolean }>;
  can: { create: boolean; paylink: boolean; message: boolean; move: boolean; resend: boolean };
};

export async function orderEditionContext(ctx: Ctx, slug: string): Promise<OrderEditionContext> {
  if (!can(ctx, 'orders.read', { edition: slug })) throw new DomainError('FORBIDDEN');
  const db = getDb();
  const [ed] = await db.select().from(editions).where(eq(editions.slug, slug));
  if (!ed) throw new DomainError('NOT_FOUND');
  const [s, p] = await Promise.all([
    db.select({ id: sessions.id, label: sessions.label, status: sessions.status }).from(sessions).where(eq(sessions.editionId, ed.id)).orderBy(asc(sessions.startsAt), asc(sessions.sort)),
    db
      .select({ id: products.id, name: products.name, kind: products.kind, priceCents: products.priceCents, requiresSession: products.requiresSession, channels: products.channels })
      .from(products)
      .where(and(eq(products.editionId, ed.id), eq(products.active, true)))
      .orderBy(asc(products.sort), asc(products.name)),
  ]);
  const readOnly = isReadOnly(ed.status);
  const edit = !readOnly && can(ctx, 'orders.edit', { edition: slug });
  const mod = (k: string) => ed.enabledModules.includes(k as never);
  return {
    edition: { id: ed.id, slug: ed.slug, title: ed.title, status: ed.status, readOnly },
    sessions: s,
    products: p.map(({ channels, ...x }) => ({ ...x, paylink: channels.includes('paylink') })),
    can: {
      create: edit,
      paylink: edit && mod('paylink'),
      message: edit && !!ctx.user && mod('broadcast'),
      move: edit && mod('postponement'),
      resend: !readOnly && can(ctx, 'orders.resend', { edition: slug }),
    },
  };
}

/** Righe dell'esportazione CSV: gli ordini che rispettano i filtri, o solo `ids` se indicati (al massimo 20.000). */
export async function exportOrders(ctx: Ctx, edition: string | null, f: OrderFilters, ids: string[] = []) {
  const scope = readableEditions(ctx, edition);
  const db = getDb();
  const rows = await db
    .select({
      id: ordersV2.id,
      code: ordersV2.code,
      createdAt: ordersV2.createdAt,
      paidAt: ordersV2.paidAt,
      edition: editions.title,
      session: sessions.label,
      channel: ordersV2.channel,
      status: ordersV2.status,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      subtotalCents: ordersV2.subtotalCents,
      discountCents: ordersV2.discountCents,
      totalCents: ordersV2.totalCents,
      blacklisted: ordersV2.isBlacklisted,
    })
    .from(ordersV2)
    .innerJoin(editions, eq(editions.id, ordersV2.editionId))
    .leftJoin(customers, eq(customers.id, ordersV2.customerId))
    .leftJoin(sessions, eq(sessions.id, ordersV2.sessionId))
    .where(and(orderConditions(scope, { ...f, page: 0 }), ids.length ? inArray(ordersV2.id, ids) : undefined))
    .orderBy(asc(ordersV2.createdAt), asc(ordersV2.id))
    .limit(20_000);
  const found = rows.map((r) => r.id);
  const [checkin, detail] = await Promise.all([
    checkinCounts(found),
    found.length
      ? db
          .select({ orderId: orderLines.orderId, text: sql<string>`string_agg(${orderLines.quantity} || ' × ' || ${products.name}, ', ' order by ${orderLines.createdAt})` })
          .from(orderLines)
          .innerJoin(products, eq(products.id, orderLines.productId))
          .where(inArray(orderLines.orderId, found))
          .groupBy(orderLines.orderId)
      : [],
  ]);
  const lines = new Map(detail.map((d) => [d.orderId, d.text]));
  return rows.map((r) => ({ ...r, lines: lines.get(r.id) ?? '', tickets: checkin.get(r.id)?.tickets ?? 0, checkedIn: checkin.get(r.id)?.checkedIn ?? 0 }));
}
