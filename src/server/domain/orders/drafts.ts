import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { actorLabel } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { customers, discountsV2, orderLines, orderNotes, ordersV2, payments, products, sessions, ticketsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { CustomerInput, upsertByEmail } from '@/server/domain/customers';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { priceCart } from '@/server/domain/pricing/cart';
import { sendOrderTickets } from '@/server/email/order-tickets';
import { sendPaylinkEmail } from '@/server/email/paylink';
import { log } from '@/server/log';
import { LinesInput, SELLING_STATUSES } from './index';
import { newOrderCode, randomToken } from './code';
import { actorColumns, isUniqueViolation, lockEdition, lockOrder, pendingTtlMs, requireModule, reserveSeats, type EditionRow, type OrderRow } from './shared';

// Ordini in bozza dall'admin. Una bozza non tiene posti né quote (soldCounts conta solo pagati e in
// attesa), non ha scadenza, biglietti, pagamenti o email, e non entra nelle statistiche (solo stati
// venduti). Gli importi della bozza sono indicativi: alla conferma il server li ricalcola, ricontrolla
// i posti e solo allora consuma il codice sconto. Una bozza non si cancella: si annulla (cancelOrder).

const uuid = z.string().uuid();
const Note = z.string().trim().max(2000).nullish().transform((v) => v || null);
const Code = z.string().trim().toUpperCase().max(40).nullish().transform((v) => v || null);
const DraftLines = LinesInput.refine((l) => l.every((x) => x.unitPriceCents == null), 'Un importo libero si registra solo in cassa.');

function assertCanOn(ctx: Ctx, permission: Permission, edition: string) {
  if (!can(ctx, permission, { edition })) throw new DomainError('FORBIDDEN');
}

type Catalog = { catalog: Array<typeof products.$inferSelect>; sessionRows: Array<{ id: string; status: (typeof sessions.$inferSelect)['status'] }> };

async function loadCatalog(tx: Tx, editionId: string): Promise<Catalog> {
  const [catalog, sessionRows] = await Promise.all([
    tx.select().from(products).where(eq(products.editionId, editionId)),
    tx.select({ id: sessions.id, status: sessions.status }).from(sessions).where(eq(sessions.editionId, editionId)),
  ]);
  return { catalog, sessionRows };
}

/** Prezzi indicativi della bozza (canale admin), con il codice sconto se c'è: nessun posto bloccato. */
async function priceDraft(tx: Tx, edition: EditionRow, data: { lines: z.output<typeof DraftLines>; sessionId?: string | null; discountCode: string | null }) {
  const { catalog, sessionRows } = await loadCatalog(tx, edition.id);
  if (data.sessionId && !sessionRows.some((s) => s.id === data.sessionId)) throw new DomainError('VALIDATION', { message: 'La data scelta non esiste.' });
  const [discount] = data.discountCode ? await tx.select().from(discountsV2).where(eq(discountsV2.code, data.discountCode)) : [];
  if (data.discountCode && !discount) throw new DomainError('DISCOUNT_INVALID');
  const priced = priceCart({ editionId: edition.id, channel: 'admin', lines: data.lines, products: catalog, sessions: sessionRows, sessionId: data.sessionId, discount: discount ?? null });
  const sessionId = data.sessionId ?? priced.lines.find((l) => l.sessionId)?.sessionId ?? null;
  return { priced, sessionId };
}

async function addNote(tx: Tx, ctx: Ctx, orderId: string, body: string | null) {
  if (body) await tx.insert(orderNotes).values({ orderId, authorUserId: ctx.user?.id ?? null, authorLabel: actorLabel(ctx), body });
}

// ─── Creazione e modifica ─────────────────────────────────────────────────────

export const CreateDraftInput = z.object({
  editionId: uuid,
  lines: DraftLines,
  customer: CustomerInput.nullish(),
  sessionId: uuid.nullish(),
  discountCode: Code,
  note: Note,
  idempotencyKey: z.string().trim().min(8).max(100),
});

/** "Salva in bozza" da "Nuovo ordine": stessi permessi della creazione admin. */
export async function createDraftOrder(ctx: Ctx, input: z.input<typeof CreateDraftInput>): Promise<{ id: string; code: string; status: OrderRow['status']; totalCents: number }> {
  const data = CreateDraftInput.parse(input);
  const existing = async () => {
    const [o] = await getDb().select().from(ordersV2).where(eq(ordersV2.idempotencyKey, data.idempotencyKey));
    if (o && o.editionId !== data.editionId) throw new DomainError('CONFLICT');
    return o ? { id: o.id, code: o.code, status: o.status, totalCents: o.totalCents } : null;
  };
  const already = await existing();
  if (already) return already;
  for (let attempt = 0; ; attempt++) {
    try {
      return await withTransaction(async (tx) => {
        const edition = await lockEdition(tx, data.editionId);
        assertCanOn(ctx, 'orders.edit', edition.slug);
        if (!SELLING_STATUSES.admin.includes(edition.status)) throw new DomainError('SALES_CLOSED');
        const { priced, sessionId } = await priceDraft(tx, edition, data);
        const customer = data.customer ? await upsertByEmail(tx, data.customer) : null;
        const [order] = await tx
          .insert(ordersV2)
          .values({
            code: newOrderCode(edition.slug, edition.year),
            editionId: edition.id,
            customerId: customer?.id ?? null,
            channel: 'admin',
            status: 'draft',
            sessionId,
            subtotalCents: priced.subtotalCents,
            discountCents: priced.discountCents,
            totalCents: priced.totalCents,
            discountId: priced.discountId,
            ...actorColumns(ctx),
            accessToken: randomToken(),
            idempotencyKey: data.idempotencyKey,
          })
          .returning();
        await tx.insert(orderLines).values(priced.lines.map((l) => ({ orderId: order.id, ...l })));
        await addNote(tx, ctx, order.id, data.note);
        await audit(tx, ctx, 'order.draft_created', { entityType: 'order', entityId: order.id, edition: edition.slug, after: { code: order.code, status: 'draft', totalCents: order.totalCents, lines: priced.lines.length } });
        return { id: order.id, code: order.code, status: order.status, totalCents: order.totalCents };
      });
    } catch (error) {
      if (isUniqueViolation(error, 'orders_v2_idempotency_unique')) {
        const o = await existing();
        if (o) return o;
      }
      if (isUniqueViolation(error, 'orders_v2_code_unique') && attempt < 3) continue;
      throw error;
    }
  }
}

async function lockDraft(tx: Tx, ctx: Ctx, orderId: string) {
  const locked = await lockOrder(tx, orderId);
  assertCanOn(ctx, 'orders.edit', locked.edition.slug);
  if (locked.order.status !== 'draft') throw new DomainError('CONFLICT', { message: 'L’ordine non è più una bozza.' });
  return locked;
}

export const UpdateDraftInput = z.object({
  orderId: uuid,
  lines: DraftLines,
  /** null toglie il cliente dalla bozza. */
  customer: CustomerInput.nullish(),
  sessionId: uuid.nullish(),
  discountCode: Code,
});

/** Modifica righe, cliente, data e codice sconto di una bozza. Le righe della bozza si riscrivono da capo. */
export async function updateDraftOrder(ctx: Ctx, input: z.input<typeof UpdateDraftInput>): Promise<{ totalCents: number }> {
  const data = UpdateDraftInput.parse(input);
  return withTransaction(async (tx) => {
    const { order, edition } = await lockDraft(tx, ctx, data.orderId);
    const { priced, sessionId } = await priceDraft(tx, edition, data);
    const customer = data.customer ? await upsertByEmail(tx, data.customer) : null;
    if (customer && data.customer?.name !== undefined) await tx.update(customers).set({ name: data.customer.name ?? null, phone: data.customer.phone ?? null, updatedAt: new Date() }).where(eq(customers.id, customer.id));
    // Le righe di una bozza non hanno biglietti né pagamenti: si sostituiscono (§5.1, bozze mai confermate).
    await tx.delete(orderLines).where(eq(orderLines.orderId, order.id));
    await tx.insert(orderLines).values(priced.lines.map((l) => ({ orderId: order.id, ...l })));
    await tx
      .update(ordersV2)
      .set({ customerId: customer?.id ?? null, sessionId, subtotalCents: priced.subtotalCents, discountCents: priced.discountCents, totalCents: priced.totalCents, discountId: priced.discountId, updatedAt: new Date() })
      .where(eq(ordersV2.id, order.id));
    await audit(tx, ctx, 'order.draft_updated', {
      entityType: 'order',
      entityId: order.id,
      edition: edition.slug,
      before: { totalCents: order.totalCents, sessionId: order.sessionId, customerId: order.customerId },
      after: { totalCents: priced.totalCents, sessionId, customerId: customer?.id ?? null, lines: priced.lines.length },
    });
    return { totalCents: priced.totalCents };
  });
}

// ─── Conferma ─────────────────────────────────────────────────────────────────

export const DRAFT_CONFIRM_MODES = ['paylink', 'on_site', 'cash', 'complimentary'] as const;
export type DraftConfirmMode = (typeof DRAFT_CONFIRM_MODES)[number];

export const ConfirmDraftInput = z
  .object({
    orderId: uuid,
    mode: z.enum(DRAFT_CONFIRM_MODES),
    /** Motivo dell'omaggio: obbligatorio con `complimentary`. */
    reason: z.string().trim().max(200).nullish(),
    note: Note,
    /** Conferma anche se i posti sono finiti (date esaurite): resta nel registro come `oversold`. */
    overCapacity: z.boolean().nullish(),
  })
  .refine((v) => v.mode !== 'complimentary' || (v.reason ?? '').length >= 3, { path: ['reason'], message: 'Scrivi il motivo dell’omaggio.' });

/** Permessi in più per modo, oltre a orders.edit: come i pagamenti registrati a mano (payments.METHOD_PERMISSION). */
const MODE_PERMISSION: Partial<Record<DraftConfirmMode, Permission>> = { cash: 'pos.sell' };

export type ConfirmDraftResult = { code: string; status: OrderRow['status']; totalCents: number; emailSent: boolean | null };

/**
 * Conferma una bozza, in una transazione: prezzi ricalcolati dal server, posti ricontrollati con le
 * quote bloccate (SOLD_OUT se non ci sono più), biglietti emessi e codice sconto consumato.
 * - `paylink`: canale pay-link, in attesa con la scadenza del modulo; il link parte per email;
 * - `on_site`: in attesa senza scadenza (tiene i posti), da incassare all'evento con "Segna come pagato";
 * - `cash` / `complimentary`: pagato subito; i biglietti partono per email se c'è il cliente.
 */
export async function confirmDraftOrder(ctx: Ctx, input: z.input<typeof ConfirmDraftInput>, opts: { now?: Date } = {}): Promise<ConfirmDraftResult> {
  const data = ConfirmDraftInput.parse(input);
  const now = opts.now ?? new Date();
  const events: DomainEvent[] = [];
  const result = await withTransaction(async (tx) => {
    const { order, edition } = await lockDraft(tx, ctx, data.orderId);
    const extra = MODE_PERMISSION[data.mode];
    if (extra) assertCanOn(ctx, extra, edition.slug);
    const channel = data.mode === 'paylink' ? 'paylink' : 'admin';
    if (channel === 'paylink') requireModule(edition, 'paylink');
    if (!SELLING_STATUSES[channel].includes(edition.status)) throw new DomainError(edition.status === 'sold_out' ? 'SOLD_OUT' : 'SALES_CLOSED');

    const [customer] = order.customerId ? await tx.select().from(customers).where(eq(customers.id, order.customerId)) : [];
    if (data.mode === 'paylink' && !customer) throw new DomainError('VALIDATION', { message: 'Per mandare il link di pagamento serve l’email del cliente: aggiungila alla bozza.' });

    const { catalog, sessionRows } = await loadCatalog(tx, edition.id);
    const draftLines = await tx.select().from(orderLines).where(eq(orderLines.orderId, order.id));
    const [discount] = order.discountId ? await tx.select().from(discountsV2).where(eq(discountsV2.id, order.discountId)).for('update') : [];
    const priced = priceCart({
      editionId: edition.id,
      channel,
      lines: draftLines.map((l) => ({ productId: l.productId, quantity: l.quantity, sessionId: l.sessionId })),
      products: catalog,
      sessions: sessionRows,
      sessionId: order.sessionId,
      discount: discount ?? null,
      now,
    });
    let oversold = false;
    try {
      await reserveSeats(tx, edition.id, priced.lines, { now, excludeOrderId: order.id });
    } catch (error) {
      if (!(error instanceof DomainError && error.code === 'SOLD_OUT')) throw error;
      if (!data.overCapacity) throw new DomainError('SOLD_OUT', { message: 'Non ci sono più abbastanza posti per confermare la bozza. Spunta “Conferma anche oltre i posti” oppure cambia data o quantità.' });
      oversold = true;
    }

    const paidNow = data.mode === 'cash' || data.mode === 'complimentary' || priced.totalCents === 0;
    const ttl = data.mode === 'paylink' ? pendingTtlMs(edition, 'paylink') : undefined;
    await tx.delete(orderLines).where(eq(orderLines.orderId, order.id));
    const lineRows = await tx.insert(orderLines).values(priced.lines.map((l) => ({ orderId: order.id, ...l }))).returning();
    const ticketValues = lineRows.flatMap((line) => {
      if (!catalog.find((p) => p.id === line.productId)?.issuesTicket) return [];
      return Array.from({ length: line.quantity }, () => ({ orderId: order.id, orderLineId: line.id, editionId: edition.id, productId: line.productId, sessionId: line.sessionId, qrToken: randomToken() }));
    });
    if (ticketValues.length) await tx.insert(ticketsV2).values(ticketValues);
    if (discount) await tx.update(discountsV2).set({ usedCount: sql`${discountsV2.usedCount} + 1` }).where(eq(discountsV2.id, discount.id));

    const status: OrderRow['status'] = paidNow ? 'paid' : 'pending';
    await tx
      .update(ordersV2)
      .set({
        status,
        channel,
        subtotalCents: priced.subtotalCents,
        discountCents: priced.discountCents,
        totalCents: priced.totalCents,
        discountId: priced.discountId,
        expiresAt: !paidNow && ttl ? new Date(now.getTime() + ttl) : null,
        payOnSite: data.mode === 'on_site' && !paidNow,
        paidAt: paidNow ? now : null,
        updatedAt: now,
      })
      .where(eq(ordersV2.id, order.id));
    if (paidNow) {
      const method = data.mode === 'cash' && priced.totalCents > 0 ? 'cash' : 'complimentary';
      await tx.insert(payments).values({ orderId: order.id, method, amountCents: priced.totalCents, status: 'succeeded', receivedAt: now, raw: data.mode === 'complimentary' ? { reason: data.reason } : null });
    }
    await addNote(tx, ctx, order.id, data.note);
    await audit(tx, ctx, 'order.draft_confirmed', {
      entityType: 'order',
      entityId: order.id,
      edition: edition.slug,
      before: { status: 'draft', totalCents: order.totalCents },
      after: { status, mode: data.mode, channel, totalCents: priced.totalCents, tickets: ticketValues.length, ...(oversold ? { oversold } : {}) },
      reason: data.mode === 'complimentary' ? data.reason : null,
    });
    events.push({ type: 'order.created', orderId: order.id, code: order.code, edition: edition.slug, status });
    if (paidNow) events.push({ type: 'order.paid', orderId: order.id, code: order.code, edition: edition.slug, totalCents: priced.totalCents });
    return { order, status, totalCents: priced.totalCents, hasCustomer: !!customer };
  });
  await publish(events);

  // Email dopo il commit: un invio non riuscito non annulla la conferma (resta "Reinvia biglietti").
  let emailSent: boolean | null = null;
  try {
    if (result.status === 'pending' && data.mode === 'paylink') emailSent = await sendPaylinkEmail(result.order.id);
    // Pay-link a 0 €: i biglietti li manda già l'handler di order.paid (canale paylink).
    else if (result.status === 'paid' && result.hasCustomer && data.mode !== 'paylink') emailSent = await sendOrderTickets(result.order.id, { reason: 'paid' });
  } catch (error) {
    log.error('Email della bozza confermata non inviata', { code: result.order.code, error });
    emailSent = false;
  }
  return { code: result.order.code, status: result.status, totalCents: result.totalCents, emailSent };
}
