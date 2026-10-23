import 'server-only';
import { and, asc, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { attendeeAnswers, customers, discountsV2, editions, orderLines, ordersV2, payments, products, refundsV2, sessions, ticketsV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { upsertByEmail, CustomerInput } from '@/server/domain/customers';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { summarizePayments } from '@/server/domain/payments/status';
import { ORDER_CHANNELS, priceCart, type OrderChannel } from '@/server/domain/pricing/cart';
import { MAX_OPEN_PRICE_CENTS } from '@/lib/cash/open-price';
// Collega gli handler dei moduli agli eventi pubblicati da qui (es. email del modulo rinvio).
import '@/modules/handlers';
import '@/server/notifications/handlers';
import '@/server/domain/editions/handlers';
import { validateActivities } from '@/modules/activities/server';
import { newOrderCode, randomToken } from './code';
import { moduleSettings } from '@/modules/registry';
import { publicCtx } from '@/server/auth/context-shared';
import { actorColumns, isUniqueViolation, lockEdition, lockOrder, pendingTtlMs, releaseDiscountUse, requireModule, reserveSeats, type EditionRow, type OrderRow } from './shared';

export type { OrderChannel } from '@/server/domain/pricing/cart';

/** Stati dell'edizione in cui ogni canale può vendere. */
export const SELLING_STATUSES: Record<OrderChannel, EditionRow['status'][]> = {
  online: ['on_sale', 'live'],
  paylink: ['on_sale', 'live', 'sold_out'],
  pos: ['on_sale', 'sold_out', 'live'],
  invite: ['published', 'on_sale', 'sold_out', 'live'],
  admin: ['published', 'on_sale', 'sold_out', 'live'],
};

/** Permesso richiesto per canale. Il sito pubblico non ne richiede: compra chiunque. */
const CHANNEL_PERMISSION: Record<OrderChannel, Permission | null> = {
  online: null,
  pos: 'pos.sell',
  paylink: 'orders.edit',
  invite: 'orders.edit',
  admin: 'orders.edit',
};

const LineInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int(),
  sessionId: z.string().uuid().nullish(),
  /** Solo per l'"Altro" della cassa (prodotto `openPrice`): lo controllano qui sotto e priceCart. */
  unitPriceCents: z.number().int().min(1).max(MAX_OPEN_PRICE_CENTS).nullish(),
});
export const LinesInput = z.array(LineInput).min(1, 'Il carrello è vuoto.').max(30);

const IMMEDIATE_METHODS = ['cash', 'card_pos', 'bank_transfer'] as const;
/** In cassa e dall'admin si può anche dare un omaggio, con il motivo (prompt 14). */
const POS_METHODS = [...IMMEDIATE_METHODS, 'complimentary'] as const;

function assertCanOn(ctx: Ctx, permission: Permission, edition: string) {
  if (!can(ctx, permission, { edition })) throw new DomainError('FORBIDDEN');
}

const uuid = z.string().uuid();

export const CreateOrderInput = z
  .object({
    editionId: uuid,
    channel: z.enum(ORDER_CHANNELS),
    lines: LinesInput,
    customer: CustomerInput.nullish(),
    sessionId: uuid.nullish(),
    /** Risposte alle domande del modulo activities. `ticket` è la posizione del biglietto nell'ordine (da 0). */
    answers: z
      .array(z.object({ questionKey: z.string().trim().min(1).max(60), value: z.unknown(), ticket: z.number().int().min(0).nullish() }))
      .max(200)
      .optional(),
    discountCode: z
      .string()
      .trim()
      .toUpperCase()
      .max(40)
      .nullish()
      .transform((v) => v || null),
    /** Chiave generata dal client per ogni tentativo di acquisto: un doppio invio restituisce lo stesso ordine. */
    idempotencyKey: z.string().trim().min(8).max(100),
    /** Totale mostrato al cliente: se il server calcola un importo diverso, PRICE_CHANGED. */
    expectedTotalCents: z.number().int().min(0).nullish(),
    /** Pagamento incassato subito (cassa e admin). In cassa il default è il contante; `complimentary` da cassa o admin. */
    payNow: z.enum(POS_METHODS).nullish(),
    /** Motivo dell'omaggio, obbligatorio con `payNow: 'complimentary'`. Finisce nel pagamento e nel registro. */
    complimentaryReason: z.string().trim().max(200).nullish(),
    /** Turno di cassa (solo canale `pos`). Lo controlla il servizio della cassa, che passa da qui (cash/sales). */
    cashSessionId: uuid.nullish(),
  })
  .superRefine((v, c) => {
    if (['online', 'paylink', 'invite'].includes(v.channel) && !v.customer) c.addIssue({ code: 'custom', path: ['customer'], message: 'Servono nome ed email.' });
    if (v.payNow && !['pos', 'admin'].includes(v.channel)) c.addIssue({ code: 'custom', path: ['payNow'], message: 'Pagamento immediato solo da cassa o admin.' });
    if (v.payNow === 'complimentary' && !['pos', 'admin'].includes(v.channel)) c.addIssue({ code: 'custom', path: ['payNow'], message: 'L’omaggio si registra solo dalla cassa o dall’admin.' });
    if (v.payNow === 'complimentary' && (v.complimentaryReason ?? '').length < 3) c.addIssue({ code: 'custom', path: ['complimentaryReason'], message: 'Scrivi il motivo dell’omaggio.' });
    if (v.cashSessionId && v.channel !== 'pos') c.addIssue({ code: 'custom', path: ['cashSessionId'], message: 'Il turno di cassa vale solo per il canale cassa.' });
    // Un importo scelto da chi vende solo dalla cassa, dentro un turno (il turno lo verifica cash/sales).
    if (v.lines.some((l) => l.unitPriceCents != null) && (v.channel !== 'pos' || !v.cashSessionId)) {
      c.addIssue({ code: 'custom', path: ['lines'], message: 'Un importo libero si registra solo in cassa, con il turno aperto.' });
    }
  });
export type CreateOrderInput = z.input<typeof CreateOrderInput>;

export type OrderResult = {
  id: string;
  code: string;
  status: OrderRow['status'];
  totalCents: number;
  accessToken: string;
  expiresAt: Date | null;
  /** false se l'ordine esisteva già con la stessa chiave di idempotenza. */
  created: boolean;
  /** true se l'ordine è stato accettato oltre le scorte (solo con `allowOversell`). */
  oversold?: boolean;
};

/** Dentro la transazione di createOrder, dopo aver scritto ordine, righe e pagamento (es. i dati della cassa). */
export type CreateOrderHook = (tx: Tx, created: { order: OrderRow; lines: Array<typeof orderLines.$inferSelect>; edition: EditionRow; oversold: boolean }) => Promise<void>;

export type CreateOrderOptions = {
  now?: Date;
  parentOrderId?: string;
  /**
   * Accetta l'ordine anche oltre le quote, segnandolo `oversold`. Solo per le vendite di cassa fatte
   * offline e sincronizzate dopo: i soldi sono già stati presi, va segnalato, non rifiutato (§12.1).
   */
  allowOversell?: boolean;
  inTransaction?: CreateOrderHook;
};

const toResult = (o: OrderRow, created: boolean): OrderResult => ({
  id: o.id,
  code: o.code,
  status: o.status,
  totalCents: o.totalCents,
  accessToken: o.accessToken,
  expiresAt: o.expiresAt,
  created,
});

async function findByIdempotencyKey(db: Tx | ReturnType<typeof getDb>, key: string, editionId: string): Promise<OrderResult | null> {
  const [existing] = await db.select().from(ordersV2).where(eq(ordersV2.idempotencyKey, key));
  if (!existing) return null;
  if (existing.editionId !== editionId) throw new DomainError('CONFLICT');
  return toResult(existing, false);
}

/**
 * Crea un ordine (§5.4), tutto in una transazione:
 * prezzi calcolati dal server, posti controllati con le quote bloccate, ordine, righe, biglietti e risposte.
 * - online e pay-link: `pending`, scade dopo 15 minuti (48 ore il pay-link) se non arriva il pagamento;
 * - cassa, pagamento immediato o totale a 0 €: `paid` subito, con il pagamento registrato;
 * - stessa `idempotencyKey`: restituisce l'ordine già creato.
 */
export async function createOrder(ctx: Ctx, input: CreateOrderInput, opts: CreateOrderOptions = {}): Promise<OrderResult> {
  const data = CreateOrderInput.parse(input);
  const now = opts.now ?? new Date();
  const already = await findByIdempotencyKey(getDb(), data.idempotencyKey, data.editionId);
  if (already) return already;

  for (let attempt = 0; ; attempt++) {
    const events: DomainEvent[] = [];
    try {
      const result = await withTransaction((tx) => createOrderTx(tx, ctx, data, now, events, opts));
      await publish(events);
      return result;
    } catch (error) {
      // Due invii con la stessa chiave nello stesso istante: vince il primo, il secondo lo restituisce.
      if (isUniqueViolation(error, 'orders_v2_idempotency_unique')) {
        const existing = await findByIdempotencyKey(getDb(), data.idempotencyKey, data.editionId);
        if (existing) return existing;
      }
      // Codice leggibile già usato (raro): si riprova con un altro.
      if (isUniqueViolation(error, 'orders_v2_code_unique') && attempt < 3) continue;
      throw error;
    }
  }
}

async function createOrderTx(tx: Tx, ctx: Ctx, data: z.output<typeof CreateOrderInput>, now: Date, events: DomainEvent[], opts: CreateOrderOptions): Promise<OrderResult> {
  const parentOrderId = opts.parentOrderId ?? null;
  const edition = await lockEdition(tx, data.editionId);
  const permission = CHANNEL_PERMISSION[data.channel];
  if (permission) assertCanOn(ctx, permission, edition.slug);
  if (data.channel === 'invite') requireModule(edition, 'invites');
  if (data.channel === 'paylink') requireModule(edition, 'paylink');
  if (!SELLING_STATUSES[data.channel].includes(edition.status)) {
    throw new DomainError(edition.status === 'sold_out' ? 'SOLD_OUT' : 'SALES_CLOSED');
  }

  const [catalog, sessionRows] = await Promise.all([
    tx.select().from(products).where(eq(products.editionId, edition.id)),
    tx.select({ id: sessions.id, status: sessions.status }).from(sessions).where(eq(sessions.editionId, edition.id)),
  ]);
  if (data.sessionId && !sessionRows.some((s) => s.id === data.sessionId)) throw new DomainError('VALIDATION', { message: 'La data scelta non esiste.' });

  let discount = null;
  if (data.discountCode) {
    [discount] = await tx.select().from(discountsV2).where(eq(discountsV2.code, data.discountCode)).for('update');
    if (!discount) throw new DomainError('DISCOUNT_INVALID');
  }

  const priced = priceCart({
    editionId: edition.id,
    channel: data.channel,
    lines: data.lines,
    products: catalog,
    sessions: sessionRows,
    sessionId: data.sessionId,
    discount,
    now,
  });
  if (data.expectedTotalCents != null && data.expectedTotalCents !== priced.totalCents) throw new DomainError('PRICE_CHANGED');

  let oversold = false;
  try {
    await reserveSeats(tx, edition.id, priced.lines, { now });
  } catch (error) {
    if (!(opts.allowOversell && data.channel === 'pos' && error instanceof DomainError && error.code === 'SOLD_OUT')) throw error;
    oversold = true;
  }
  if (edition.enabledModules.includes('activities') && data.answers?.length) {
    const admissions = priced.lines.reduce((s, l) => s + (catalog.find((p) => p.id === l.productId)?.kind === 'ticket' ? l.quantity : 0), 0);
    const sessionForCheck = data.sessionId ?? priced.lines.find((l) => l.sessionId)?.sessionId ?? null;
    await validateActivities(tx, edition, { sessionId: sessionForCheck, admissions, answers: data.answers, now });
  }

  const customer = data.customer ? await upsertByEmail(tx, data.customer) : null;
  const payNow = data.channel === 'pos' ? (data.payNow ?? 'cash') : data.payNow;
  const paidNow = priced.totalCents === 0 || !!payNow;
  const ttl = pendingTtlMs(edition, data.channel);
  const sessionId = data.sessionId ?? priced.lines.find((l) => l.sessionId)?.sessionId ?? null;

  const [order] = await tx
    .insert(ordersV2)
    .values({
      code: newOrderCode(edition.slug, edition.year),
      editionId: edition.id,
      customerId: customer?.id ?? null,
      channel: data.channel,
      status: paidNow ? 'paid' : 'pending',
      sessionId,
      subtotalCents: priced.subtotalCents,
      discountCents: priced.discountCents,
      totalCents: priced.totalCents,
      discountId: priced.discountId,
      ...actorColumns(ctx),
      parentOrderId,
      accessToken: randomToken(),
      idempotencyKey: data.idempotencyKey,
      expiresAt: !paidNow && ttl ? new Date(now.getTime() + ttl) : null,
      paidAt: paidNow ? now : null,
      cashSessionId: data.cashSessionId ?? null,
    })
    .returning();

  const lineRows = await tx
    .insert(orderLines)
    .values(priced.lines.map((l) => ({ orderId: order.id, ...l })))
    .returning();

  const ticketValues = lineRows.flatMap((line) => {
    const product = catalog.find((p) => p.id === line.productId)!;
    if (!product.issuesTicket) return [];
    return Array.from({ length: line.quantity }, () => ({
      orderId: order.id,
      orderLineId: line.id,
      editionId: edition.id,
      productId: line.productId,
      sessionId: line.sessionId,
      qrToken: randomToken(),
    }));
  });
  const ticketRows = ticketValues.length ? await tx.insert(ticketsV2).values(ticketValues).returning({ id: ticketsV2.id }) : [];

  if (data.answers?.length) {
    await tx.insert(attendeeAnswers).values(
      data.answers.map((a) => {
        if (a.ticket != null && !ticketRows[a.ticket]) throw new DomainError('VALIDATION', { message: 'Risposta riferita a un biglietto che non esiste.' });
        return { orderId: order.id, ticketId: a.ticket != null ? ticketRows[a.ticket].id : null, questionKey: a.questionKey, value: (a.value ?? null) as object };
      }),
    );
  }

  if (discount) await tx.update(discountsV2).set({ usedCount: sql`${discountsV2.usedCount} + 1` }).where(eq(discountsV2.id, discount.id));

  if (paidNow) {
    await tx.insert(payments).values({
      orderId: order.id,
      method: priced.totalCents === 0 && !payNow ? 'complimentary' : payNow!,
      amountCents: priced.totalCents,
      status: 'succeeded',
      receivedAt: now,
      cashSessionId: data.cashSessionId ?? null,
      raw: payNow === 'complimentary' ? { reason: data.complimentaryReason } : null,
    });
  }

  if (opts.inTransaction) await opts.inTransaction(tx, { order, lines: lineRows, edition, oversold });
  const openPriceCents = lineRows.filter((l) => catalog.find((p) => p.id === l.productId)?.openPrice).reduce((sum, l) => sum + l.totalCents, 0);

  await audit(tx, ctx, 'order.created', {
    entityType: 'order',
    entityId: order.id,
    edition: edition.slug,
    after: { code: order.code, channel: order.channel, status: order.status, totalCents: order.totalCents, lines: lineRows.length, tickets: ticketRows.length, parentOrderId, ...(oversold ? { oversold } : {}), ...(openPriceCents ? { openPriceCents } : {}) },
    reason: payNow === 'complimentary' ? data.complimentaryReason : null,
  });
  events.push({ type: 'order.created', orderId: order.id, code: order.code, edition: edition.slug, status: order.status });
  if (paidNow) events.push({ type: 'order.paid', orderId: order.id, code: order.code, edition: edition.slug, totalCents: order.totalCents });
  return { ...toResult(order, true), ...(oversold ? { oversold } : {}) };
}

// ─── Annullamento e scadenza ─────────────────────────────────────────────────

export async function voidTickets(tx: Tx, orderId: string) {
  await tx.update(ticketsV2).set({ status: 'void', updatedAt: new Date() }).where(eq(ticketsV2.orderId, orderId));
}

export const CancelOrderInput = z.object({ orderId: uuid, reason: z.string().trim().min(3, 'Scrivi il motivo.').max(500) });

/**
 * Annulla un ordine: i biglietti non valgono più e i posti si liberano.
 * Se c'è ancora un importo pagato, prima va rimborsato (CONFLICT).
 */
export async function cancelOrder(ctx: Ctx, input: z.input<typeof CancelOrderInput>): Promise<void> {
  const data = CancelOrderInput.parse(input);
  const events: DomainEvent[] = [];
  await withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, data.orderId);
    assertCanOn(ctx, order.channel === 'pos' ? 'pos.void' : 'orders.cancel', edition.slug);
    if (order.status === 'cancelled' || order.status === 'expired') throw new DomainError('CONFLICT', { message: 'L’ordine è già annullato o scaduto.' });
    const [pay, ref] = await Promise.all([
      tx.select().from(payments).where(eq(payments.orderId, order.id)),
      tx.select().from(refundsV2).where(eq(refundsV2.orderId, order.id)),
    ]);
    const s = summarizePayments(order.totalCents, pay, ref);
    if (s.paidCents - s.refundedCents > 0) throw new DomainError('CONFLICT', { message: 'L’ordine ha un importo pagato: rimborsalo prima di annullarlo.' });

    await tx.update(ordersV2).set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() }).where(eq(ordersV2.id, order.id));
    await voidTickets(tx, order.id);
    // Una bozza non ha mai consumato il codice sconto: niente da restituire.
    if (s.paidCents === 0 && order.status !== 'draft') await releaseDiscountUse(tx, order.discountId);
    await audit(tx, ctx, 'order.cancelled', { entityType: 'order', entityId: order.id, edition: edition.slug, before: { status: order.status }, after: { status: 'cancelled' }, reason: data.reason });
    events.push({ type: 'order.cancelled', orderId: order.id, code: order.code, edition: edition.slug });
  });
  await publish(events);
}

/**
 * Segna come scaduti gli ordini in attesa oltre `expires_at` (Vercel Cron ogni 5 minuti).
 * I posti si liberano comunque allo scadere, perché il conteggio ignora gli ordini scaduti:
 * questo passaggio aggiorna lo stato, annulla i biglietti e restituisce gli utilizzi dei codici sconto.
 */
export async function expirePendingOrders(ctx: Ctx, opts: { now?: Date; limit?: number } = {}): Promise<{ expired: number }> {
  if (!ctx.system && !can(ctx, 'orders.cancel')) throw new DomainError('FORBIDDEN');
  const now = opts.now ?? new Date();
  const events: DomainEvent[] = [];
  const expired = await withTransaction(async (tx) => {
    const rows = await tx
      .select()
      .from(ordersV2)
      .where(and(eq(ordersV2.status, 'pending'), lte(ordersV2.expiresAt, now), isNull(ordersV2.deletedAt)))
      .orderBy(asc(ordersV2.expiresAt))
      .limit(opts.limit ?? 500)
      .for('update', { skipLocked: true });
    if (!rows.length) return 0;
    const ids = rows.map((r) => r.id);
    await tx.update(ordersV2).set({ status: 'expired', updatedAt: now }).where(inArray(ordersV2.id, ids));
    await tx.update(ticketsV2).set({ status: 'void', updatedAt: now }).where(inArray(ticketsV2.orderId, ids));
    const editionSlugs = await editionSlugsById(tx, [...new Set(rows.map((r) => r.editionId))]);
    for (const o of rows) {
      await releaseDiscountUse(tx, o.discountId);
      const edition = editionSlugs.get(o.editionId) ?? null;
      await audit(tx, ctx, 'order.expired', { entityType: 'order', entityId: o.id, edition, before: { status: 'pending' }, after: { status: 'expired' } });
      events.push({ type: 'order.expired', orderId: o.id, code: o.code, edition: edition ?? '' });
    }
    return rows.length;
  });
  await publish(events);
  return { expired };
}

async function editionSlugsById(tx: Tx, ids: string[]): Promise<Map<string, string>> {
  const rows = ids.length ? await tx.select({ id: editions.id, slug: editions.slug }).from(editions).where(inArray(editions.id, ids)) : [];
  return new Map(rows.map((r) => [r.id, r.slug]));
}

// ─── Biglietti, integrazioni, rinvio ─────────────────────────────────────────

/** Rimanda i biglietti al cliente. L'invio vero lo fa l'handler di `order.tickets_resent` (prompt 12). */
export async function resendTickets(ctx: Ctx, input: { orderId: string }): Promise<void> {
  const orderId = uuid.parse(input.orderId);
  const events: DomainEvent[] = [];
  await withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, orderId);
    assertCanOn(ctx, 'orders.resend', edition.slug);
    if (order.status !== 'paid' && order.status !== 'partially_refunded') throw new DomainError('CONFLICT', { message: 'Si possono rimandare solo i biglietti di ordini pagati.' });
    if (!order.customerId) throw new DomainError('VALIDATION', { message: 'L’ordine non ha un’email a cui mandare i biglietti.' });
    await audit(tx, ctx, 'order.tickets_resent', { entityType: 'order', entityId: order.id, edition: edition.slug });
    events.push({ type: 'order.tickets_resent', orderId: order.id, code: order.code, edition: edition.slug });
  });
  await publish(events);
}

export const AddLinesInput = z.object({
  orderId: uuid,
  lines: LinesInput,
  channel: z.enum(['admin', 'paylink']).default('admin'),
  payNow: z.enum(IMMEDIATE_METHODS).nullish(),
  idempotencyKey: z.string().trim().min(8).max(100),
});

/**
 * Integrazione di un ordine già pagato (es. due laboratori in più).
 * Scelta: un ordine nuovo collegato (`parent_order_id`) con il suo pagamento, invece di righe aggiunte
 * all'ordine pagato. Così totale e pagamenti di ogni ordine restano coerenti (§5.4) e un pay-link
 * dell'integrazione non tocca l'ordine originale.
 */
export async function addLines(ctx: Ctx, input: z.input<typeof AddLinesInput>, opts: { now?: Date } = {}): Promise<OrderResult> {
  const data = AddLinesInput.parse(input);
  const [parent] = await getDb().select().from(ordersV2).where(eq(ordersV2.id, data.orderId));
  if (!parent) throw new DomainError('NOT_FOUND');
  if (parent.status !== 'paid' && parent.status !== 'partially_refunded') throw new DomainError('CONFLICT', { message: 'Si può integrare solo un ordine pagato.' });
  const [customer] = parent.customerId ? await getDb().select({ email: customers.email }).from(customers).where(eq(customers.id, parent.customerId)) : [];
  return createOrder(
    ctx,
    {
      editionId: parent.editionId,
      channel: data.channel,
      lines: data.lines,
      sessionId: parent.sessionId,
      customer: customer ? { email: customer.email } : null,
      idempotencyKey: data.idempotencyKey,
      payNow: data.payNow,
    },
    { now: opts.now, parentOrderId: parent.id },
  );
}

export const MoveSessionInput = z.object({
  orderId: uuid,
  toSessionId: uuid,
  /** Data da cui spostare; di default quella dell'ordine. */
  fromSessionId: uuid.nullish(),
  reason: z.string().trim().max(500).nullish(),
});

/** Sposta righe e biglietti di un ordine su un'altra data della stessa edizione (modulo rinvio). */
export async function moveSession(ctx: Ctx, input: z.input<typeof MoveSessionInput>, opts: { now?: Date } = {}): Promise<{ moved: number }> {
  const data = MoveSessionInput.parse(input);
  const now = opts.now ?? new Date();
  const events: DomainEvent[] = [];
  const moved = await withTransaction(async (tx) => {
    const { order, edition } = await lockOrder(tx, data.orderId);
    assertCanOn(ctx, 'orders.edit', edition.slug);
    return moveSessionTx(tx, ctx, order, edition, data, now, events);
  });
  await publish(events);
  return { moved };
}

/**
 * Cambio data chiesto dal cliente da "I miei biglietti" (solo con il token dell'ordine), se il modulo
 * Rinvio lo consente. Solo verso una data ancora in vendita e futura, solo per ordini pagati.
 */
export async function customerMoveSession(ip: string | null, input: { accessToken: string; toSessionId: string }, opts: { now?: Date } = {}): Promise<{ moved: number }> {
  const token = z.string().trim().min(16).max(100).parse(input.accessToken);
  const toSessionId = uuid.parse(input.toSessionId);
  const now = opts.now ?? new Date();
  const ctx = publicCtx(ip);
  const events: DomainEvent[] = [];
  const moved = await withTransaction(async (tx) => {
    const [found] = await tx.select({ id: ordersV2.id }).from(ordersV2).where(eq(ordersV2.accessToken, token));
    if (!found) throw new DomainError('NOT_FOUND');
    const { order, edition } = await lockOrder(tx, found.id);
    requireModule(edition, 'postponement');
    if (!(moduleSettings('postponement', edition.moduleSettings) as { allowCustomerChange: boolean }).allowCustomerChange) {
      throw new DomainError('FORBIDDEN', { message: 'Per cambiare data scrivici: da qui non si può.' });
    }
    if (order.status !== 'paid') throw new DomainError('CONFLICT', { message: 'Si può cambiare data solo a un ordine pagato.' });
    const [target] = await tx.select().from(sessions).where(and(eq(sessions.id, toSessionId), eq(sessions.editionId, edition.id)));
    if (!target || target.status !== 'open' || target.startsAt.getTime() <= now.getTime()) throw new DomainError('VALIDATION', { message: 'La nuova data non è disponibile.' });
    return moveSessionTx(tx, ctx, order, edition, { orderId: order.id, toSessionId, fromSessionId: null, reason: 'Cambio data dal cliente' }, now, events);
  });
  await publish(events);
  return { moved };
}

async function moveSessionTx(tx: Tx, ctx: Ctx, order: OrderRow, edition: EditionRow, data: z.output<typeof MoveSessionInput>, now: Date, events: DomainEvent[]): Promise<number> {
  requireModule(edition, 'postponement');
  if (!['pending', 'paid', 'partially_refunded'].includes(order.status)) throw new DomainError('CONFLICT', { message: 'Questo ordine non ha più posti da spostare.' });
  const from = data.fromSessionId ?? order.sessionId;
  if (!from) throw new DomainError('VALIDATION', { message: 'L’ordine non ha una data.' });
  if (from === data.toSessionId) return 0;
  const [target] = await tx.select().from(sessions).where(and(eq(sessions.id, data.toSessionId), eq(sessions.editionId, edition.id)));
  if (!target) throw new DomainError('VALIDATION', { message: 'La nuova data non è di questa edizione.' });
  if (target.status === 'cancelled') throw new DomainError('VALIDATION', { message: 'La nuova data è annullata.' });

  const lines = await tx.select().from(orderLines).where(eq(orderLines.orderId, order.id));
  const moving = lines.filter((l) => l.sessionId === from);
  if (!moving.length) return 0;
  const after = lines.map((l) => ({ productId: l.productId, quantity: l.quantity, sessionId: l.sessionId === from ? data.toSessionId : l.sessionId }));
  await reserveSeats(tx, edition.id, after, { now, excludeOrderId: order.id });

  const ids = moving.map((l) => l.id);
  await tx.update(orderLines).set({ sessionId: data.toSessionId, updatedAt: now }).where(inArray(orderLines.id, ids));
  await tx.update(ticketsV2).set({ sessionId: data.toSessionId, updatedAt: now }).where(inArray(ticketsV2.orderLineId, ids));
  if (order.sessionId === from) await tx.update(ordersV2).set({ sessionId: data.toSessionId, updatedAt: now }).where(eq(ordersV2.id, order.id));
  await audit(tx, ctx, 'order.session_moved', {
    entityType: 'order',
    entityId: order.id,
    edition: edition.slug,
    before: { sessionId: from },
    after: { sessionId: data.toSessionId, lines: ids.length },
    reason: data.reason ?? null,
  });
  events.push({ type: 'order.session_moved', orderId: order.id, code: order.code, edition: edition.slug, fromSessionId: from, toSessionId: data.toSessionId });
  return ids.length;
}

