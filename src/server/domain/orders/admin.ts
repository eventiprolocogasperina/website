import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { actorLabel } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { customers, orderNotes, ordersV2, payments, refundsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { CustomerInput, upsertByEmail } from '@/server/domain/customers';
import { DomainError, isDomainError } from '@/server/domain/errors';
import { moveSession, resendTickets } from '@/server/domain/orders';
import { recordPayment } from '@/server/domain/payments';
import { summarizePayments } from '@/server/domain/payments/status';
import { createRefund, markRefundPaid } from '@/server/domain/refunds';
import { lockOrder } from './shared';

// Azioni dell'admin sulla pagina ordine (prompt 12): note interne, blacklist, dati del cliente,
// pagamento registrato a mano, rimborso dal dettaglio e azioni di massa. Stessa forma dei servizi
// del nucleo: permesso → zod → transazione → blocco → scrittura → registro.

const uuid = z.string().uuid();

function assertCanOn(ctx: Ctx, permission: Permission, edition: string) {
  if (!can(ctx, permission, { edition })) throw new DomainError('FORBIDDEN');
}

export const AddNoteInput = z.object({ orderId: uuid, body: z.string().trim().min(2, 'Scrivi la nota.').max(2000) });

/** Nota interna sull'ordine: la vedono solo gli operatori, non si modifica e non si cancella. */
export async function addOrderNote(ctx: Ctx, input: z.input<typeof AddNoteInput>): Promise<{ id: string }> {
  const data = AddNoteInput.parse(input);
  return withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, data.orderId);
    assertCanOn(ctx, 'orders.edit', edition.slug);
    const [row] = await tx.insert(orderNotes).values({ orderId: order.id, authorUserId: ctx.user?.id ?? null, authorLabel: actorLabel(ctx), body: data.body }).returning({ id: orderNotes.id });
    await audit(tx, ctx, 'order.note_added', { entityType: 'order', entityId: order.id, edition: edition.slug });
    return row;
  });
}

export const BlacklistInput = z
  .object({ orderId: uuid, blacklisted: z.boolean(), reason: z.string().trim().max(500).nullish() })
  .refine((v) => !v.blacklisted || (v.reason?.length ?? 0) >= 3, { path: ['reason'], message: 'Scrivi il motivo.' });

/**
 * Mette o toglie un ordine dalla blacklist. In blacklist l'ordine esce dai conteggi dell'elenco
 * (vista "Tutti" esclusa) e lo scanner lo segnala. Nessun cambiamento a biglietti o pagamenti.
 */
export async function setOrderBlacklist(ctx: Ctx, input: z.input<typeof BlacklistInput>): Promise<void> {
  const data = BlacklistInput.parse(input);
  await withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, data.orderId);
    assertCanOn(ctx, 'orders.edit', edition.slug);
    if (order.isBlacklisted === data.blacklisted) throw new DomainError('CONFLICT', { message: data.blacklisted ? 'L’ordine è già in blacklist.' : 'L’ordine non è in blacklist.' });
    await tx
      .update(ordersV2)
      .set({ isBlacklisted: data.blacklisted, blacklistReason: data.blacklisted ? data.reason! : null, updatedAt: new Date() })
      .where(eq(ordersV2.id, order.id));
    await audit(tx, ctx, data.blacklisted ? 'order.blacklisted' : 'order.unblacklisted', {
      entityType: 'order',
      entityId: order.id,
      edition: edition.slug,
      before: { isBlacklisted: order.isBlacklisted },
      after: { isBlacklisted: data.blacklisted },
      reason: data.reason ?? null,
    });
  });
}

export const UpdateCustomerInput = z.object({ orderId: uuid, customer: CustomerInput.required({ name: true }) });

/**
 * "Modifica cliente" dall'ordine. Email diversa: l'ordine passa al cliente con quella email (creato se
 * non esiste), gli altri ordini del cliente di prima non cambiano. Nome e telefono si aggiornano sul cliente.
 */
export async function updateOrderCustomer(ctx: Ctx, input: z.input<typeof UpdateCustomerInput>): Promise<void> {
  const data = UpdateCustomerInput.parse(input);
  const c = CustomerInput.parse(data.customer);
  await withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, data.orderId);
    assertCanOn(ctx, 'orders.edit', edition.slug);
    const [before] = order.customerId ? await tx.select().from(customers).where(eq(customers.id, order.customerId)) : [];
    const target = before && before.email === c.email ? { id: before.id } : await upsertByEmail(tx, { email: c.email });
    await tx.update(customers).set({ name: c.name ?? null, phone: c.phone ?? null, updatedAt: new Date() }).where(eq(customers.id, target.id));
    if (target.id !== order.customerId) await tx.update(ordersV2).set({ customerId: target.id, updatedAt: new Date() }).where(eq(ordersV2.id, order.id));
    await audit(tx, ctx, 'order.customer_updated', {
      entityType: 'order',
      entityId: order.id,
      edition: edition.slug,
      before: before ? { customerId: before.id, name: before.name, email: before.email, phone: before.phone } : null,
      after: { customerId: target.id, name: c.name, email: c.email, phone: c.phone ?? null },
    });
  });
}

export const MarkPaidInput = z.object({ orderId: uuid, method: z.enum(['cash', 'card_pos', 'bank_transfer']) });

/** "Segna come pagato": registra un pagamento per quanto manca, calcolato dal server. */
export async function markOrderPaid(ctx: Ctx, input: z.input<typeof MarkPaidInput>): Promise<{ orderStatus: string }> {
  const data = MarkPaidInput.parse(input);
  const db = getDb();
  const [order] = await db.select().from(ordersV2).where(eq(ordersV2.id, data.orderId));
  if (!order) throw new DomainError('NOT_FOUND');
  if (order.status !== 'pending') throw new DomainError('CONFLICT', { message: 'Si può segnare come pagato solo un ordine in attesa.' });
  const [pay, ref] = await Promise.all([db.select().from(payments).where(eq(payments.orderId, order.id)), db.select().from(refundsV2).where(eq(refundsV2.orderId, order.id))]);
  const due = summarizePayments(order.totalCents, pay, ref).dueCents;
  const r = await recordPayment(ctx, { orderId: order.id, method: data.method, amountCents: due, status: 'succeeded' });
  return { orderStatus: r.orderStatus };
}

/** Sopra questa cifra il rimborso va confermato scrivendo il codice dell'ordine (§11.7). */
export const REFUND_CONFIRM_THRESHOLD_CENTS = 10_000;

export const RefundOrderInput = z.object({
  orderId: uuid,
  amountCents: z.number().int().positive(),
  method: z.enum(['bank_transfer', 'nexi', 'cash']),
  reason: z.string().trim().min(3, 'Scrivi il motivo.').max(1000),
  /** Il codice dell'ordine, scritto dall'operatore: obbligatorio sopra i 100 €. */
  confirmCode: z.string().trim().max(20).nullish(),
  /** Rimborso già eseguito (es. contanti restituiti): segnato subito come pagato. */
  paidNow: z.boolean().default(false),
  iban: z.string().trim().max(40).nullish(),
  holderName: z.string().trim().max(120).nullish(),
});

/**
 * Rimborso dal dettaglio ordine: il controllo della conferma digitata si ripete sul server, poi
 * createRefund (importo entro il rimborsabile) e, se richiesto, markRefundPaid.
 */
export async function refundOrder(ctx: Ctx, input: z.input<typeof RefundOrderInput>): Promise<{ refundId: string; orderStatus: string | null }> {
  const data = RefundOrderInput.parse(input);
  const [order] = await getDb().select({ code: ordersV2.code }).from(ordersV2).where(eq(ordersV2.id, data.orderId));
  if (!order) throw new DomainError('NOT_FOUND');
  if (data.amountCents > REFUND_CONFIRM_THRESHOLD_CENTS && data.confirmCode?.toUpperCase() !== order.code) {
    throw new DomainError('VALIDATION', { message: `Per rimborsare più di 100 € scrivi il codice dell’ordine (${order.code}).` });
  }
  const { refundId } = await createRefund(ctx, {
    orderId: data.orderId,
    amountCents: data.amountCents,
    method: data.method,
    reason: data.reason,
    iban: data.iban || null,
    holderName: data.holderName || null,
  });
  if (!data.paidNow) return { refundId, orderStatus: null };
  const r = await markRefundPaid(ctx, { refundId });
  return { refundId, orderStatus: r.orderStatus };
}

export type BulkOutcome = { done: string[]; failed: Array<{ id: string; error: string }> };

/** Esegue un'azione su più ordini: un ordine che non va non ferma gli altri; i permessi sì. */
async function forEachOrder(ids: string[], fn: (id: string) => Promise<unknown>): Promise<BulkOutcome> {
  const out: BulkOutcome = { done: [], failed: [] };
  for (const id of z.array(uuid).min(1).max(200).parse(ids)) {
    try {
      await fn(id);
      out.done.push(id);
    } catch (error) {
      if (!isDomainError(error) || error.code === 'FORBIDDEN' || error.code === 'EDITION_ARCHIVED') throw error;
      out.failed.push({ id, error: error.message });
    }
  }
  return out;
}

export function resendTicketsBulk(ctx: Ctx, orderIds: string[]): Promise<BulkOutcome> {
  return forEachOrder(orderIds, (orderId) => resendTickets(ctx, { orderId }));
}

/** Azione di massa del modulo rinvio: ogni ordine passa alla data scelta, con il controllo dei posti. */
export function moveSessionBulk(ctx: Ctx, orderIds: string[], toSessionId: string, reason?: string | null): Promise<BulkOutcome> {
  return forEachOrder(orderIds, (orderId) => moveSession(ctx, { orderId, toSessionId, reason: reason ?? null }));
}
