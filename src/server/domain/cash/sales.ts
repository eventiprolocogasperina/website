import 'server-only';
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, type Tx } from '@/server/db/client';
import { cashRegisters, cashSales, cashSessions, editions, orderLines, ordersV2, products } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { createOrder, type CreateOrderHook } from '@/server/domain/orders';
import { nextCounter } from './shared';

/** Una vendita fatta offline si accetta con la sua ora solo se è recente (orologi del telefono sballati). */
const MAX_OFFLINE_AGE_MS = 48 * 60 * 60_000;

export const SellInput = z
  .object({
    cashSessionId: z.uuid(),
    lines: z
      .array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(50) }))
      .min(1, 'Il carrello è vuoto.')
      .max(30),
    method: z.enum(['cash', 'card_pos', 'complimentary']),
    /** Contante ricevuto, per il resto. Facoltativo: senza, si assume l'importo esatto. */
    cashReceivedCents: z.number().int().min(0).max(1_000_000).nullish(),
    complimentaryReason: z.string().trim().max(200).nullish(),
    /** Generata dal telefono per ogni vendita: la stessa vendita reinviata (rete ballerina, coda offline) non si duplica. */
    idempotencyKey: z.string().trim().min(8).max(100),
    /** Totale mostrato sul telefono: se il server calcola altro, PRICE_CHANGED (solo online). */
    expectedTotalCents: z.number().int().min(0).nullish(),
    /** Ora della vendita sul telefono, se è stata fatta senza rete. */
    offlineAt: z.coerce.date().nullish(),
  })
  .superRefine((v, c) => {
    if (v.method === 'complimentary' && (v.complimentaryReason ?? '').length < 3) c.addIssue({ code: 'custom', path: ['complimentaryReason'], message: 'Scrivi il motivo dell’omaggio.' });
  });
export type SellInput = z.input<typeof SellInput>;

export type SaleLine = { productId: string; name: string; quantity: number; unitPriceCents: number; totalCents: number; department: string | null };

export type SaleResult = {
  orderId: string;
  code: string;
  number: number | null;
  totalCents: number;
  method: 'cash' | 'card_pos' | 'complimentary';
  cashReceivedCents: number | null;
  changeCents: number | null;
  complimentaryReason: string | null;
  registerName: string;
  lines: SaleLine[];
  at: string;
  /** false se la vendita era già registrata con la stessa chiave (reinvio). */
  created: boolean;
  oversold: boolean;
  afterClose: boolean;
};

/**
 * Vendita in cassa (§12.1): un ordine `pos` pagato subito, legato al turno.
 * Prezzi e scorte li decide createOrder (§18.1), con le quote bloccate: due telefoni sull'ultima
 * porzione → uno vende, l'altro riceve SOLD_OUT. Le vendite offline (offlineAt) non si rifiutano per
 * le scorte né per il turno chiuso: i soldi sono già in cassa, si segnalano in admin.
 */
export type SellOptions = {
  now?: Date;
  /** Data della vendita, per i prodotti che la richiedono (es. ingresso bambino dallo scanner). */
  sessionId?: string | null;
  /** Ordine a cui la vendita si aggiunge (lo scanner: il biglietto appena letto). */
  parentOrderId?: string;
  /** Lavoro in più nella stessa transazione della vendita (es. il "+1 Bambino" dello scanner). */
  afterSale?: CreateOrderHook;
};

export async function sell(ctx: Ctx, input: SellInput, opts: SellOptions = {}): Promise<SaleResult> {
  const data = SellInput.parse(input);
  const serverNow = opts.now ?? new Date();
  const offline = !!data.offlineAt;
  const soldAt = data.offlineAt && serverNow.getTime() - data.offlineAt.getTime() < MAX_OFFLINE_AGE_MS && data.offlineAt <= serverNow ? data.offlineAt : serverNow;

  const [session] = await getDb()
    .select({ editionId: cashSessions.editionId, allowed: cashRegisters.productIds, register: cashRegisters.name })
    .from(cashSessions)
    .innerJoin(cashRegisters, eq(cashRegisters.id, cashSessions.registerId))
    .where(eq(cashSessions.id, data.cashSessionId));
  if (!session) throw new DomainError('NOT_FOUND', { message: 'Turno di cassa non trovato. Riapri il turno.' });
  // Controllo anticipato (si ripete nella transazione): un prodotto di un'altra cassa non è un "esaurito".
  if (session.allowed && data.lines.some((l) => !session.allowed!.includes(l.productId))) {
    throw new DomainError('VALIDATION', { message: `Uno dei prodotti non si vende da ${session.register}.` });
  }

  const hook: CreateOrderHook = async (tx, { order, lines, edition, oversold }) => {
    if (ctx.device && ctx.device.edition !== edition.slug) throw new DomainError('FORBIDDEN');
    const [s] = await tx.select().from(cashSessions).where(eq(cashSessions.id, data.cashSessionId)).for('share');
    if (!s || s.editionId !== edition.id) throw new DomainError('VALIDATION', { message: 'Il turno non è di questa edizione.' });
    if (s.closedAt && !offline) throw new DomainError('CONFLICT', { message: 'Il turno è stato chiuso. Apri un nuovo turno per continuare.' });
    const [register] = await tx.select().from(cashRegisters).where(eq(cashRegisters.id, s.registerId));
    if (register.productIds && lines.some((l) => !register.productIds!.includes(l.productId))) {
      throw new DomainError('VALIDATION', { message: `Uno dei prodotti non si vende da ${register.name}.` });
    }
    let received: number | null = null;
    let change: number | null = null;
    if (data.method === 'cash') {
      received = data.cashReceivedCents ?? order.totalCents;
      if (received < order.totalCents) throw new DomainError('VALIDATION', { message: 'Il contante ricevuto è meno del totale.' });
      change = received - order.totalCents;
    }
    await tx.insert(cashSales).values({
      orderId: order.id,
      editionId: edition.id,
      cashSessionId: s.id,
      registerId: register.id,
      number: register.issuesNumbers ? await nextCounter(tx, edition.id, 'order_number') : null,
      cashReceivedCents: received,
      changeCents: change,
      complimentaryReason: data.method === 'complimentary' ? data.complimentaryReason : null,
      offlineAt: data.offlineAt ?? null,
      oversold,
      afterClose: !!s.closedAt,
    });
    // Comande: le righe con un reparto partono "da preparare" se il modulo è attivo.
    if (edition.enabledModules.includes('departments')) {
      await tx.update(orderLines).set({ prepStatus: 'pending' }).where(and(eq(orderLines.orderId, order.id), isNotNull(orderLines.department)));
    }
    await opts.afterSale?.(tx, { order, lines, edition, oversold });
  };

  const result = await createOrder(
    ctx,
    {
      editionId: session.editionId,
      channel: 'pos',
      lines: data.lines,
      payNow: data.method,
      complimentaryReason: data.complimentaryReason,
      cashSessionId: data.cashSessionId,
      idempotencyKey: data.idempotencyKey,
      expectedTotalCents: offline ? null : data.expectedTotalCents,
      sessionId: opts.sessionId ?? null,
    },
    { now: soldAt, allowOversell: offline, inTransaction: hook, parentOrderId: opts.parentOrderId },
  );
  const sale = await loadSale(getDb(), result.id);
  if (!sale) throw new DomainError('CONFLICT', { message: 'Questa chiave è già stata usata per un ordine che non è di cassa.' });
  return { ...sale, created: result.created };
}

/** Una vendita di cassa con le sue righe, come la stampa lo scontrino. */
export async function loadSale(db: Tx | ReturnType<typeof getDb>, orderId: string): Promise<Omit<SaleResult, 'created'> | null> {
  const [row] = await db
    .select({ s: cashSales, o: ordersV2, register: cashRegisters.name })
    .from(cashSales)
    .innerJoin(ordersV2, eq(ordersV2.id, cashSales.orderId))
    .innerJoin(cashRegisters, eq(cashRegisters.id, cashSales.registerId))
    .where(eq(cashSales.orderId, orderId));
  if (!row) return null;
  const lines = await db
    .select({ productId: orderLines.productId, name: products.name, quantity: orderLines.quantity, unitPriceCents: orderLines.unitPriceCents, totalCents: orderLines.totalCents, department: orderLines.department })
    .from(orderLines)
    .innerJoin(products, eq(products.id, orderLines.productId))
    .where(eq(orderLines.orderId, orderId));
  const method = row.s.complimentaryReason ? 'complimentary' : row.s.cashReceivedCents !== null ? 'cash' : 'card_pos';
  return {
    orderId,
    code: row.o.code,
    number: row.s.number,
    totalCents: row.o.totalCents,
    method,
    cashReceivedCents: row.s.cashReceivedCents,
    changeCents: row.s.changeCents,
    complimentaryReason: row.s.complimentaryReason,
    registerName: row.register,
    lines,
    at: (row.o.paidAt ?? row.o.createdAt).toISOString(),
    oversold: row.s.oversold,
    afterClose: row.s.afterClose,
  };
}

export type RecentSale = { orderId: string; code: string; number: number | null; totalCents: number; at: string; voided: boolean; summary: string };

/** Ultime vendite di un turno, per la lista "Ultime vendite" e l'annullo. */
export async function recentSales(editionSlug: string, sessionId: string, limit = 30): Promise<RecentSale[]> {
  const [own] = await getDb().select({ slug: editions.slug }).from(cashSessions).innerJoin(editions, eq(editions.id, cashSessions.editionId)).where(eq(cashSessions.id, sessionId));
  if (!own) throw new DomainError('NOT_FOUND');
  if (own.slug !== editionSlug) throw new DomainError('FORBIDDEN');
  const rows = await getDb()
    .select({ s: cashSales, o: ordersV2 })
    .from(cashSales)
    .innerJoin(ordersV2, eq(ordersV2.id, cashSales.orderId))
    .where(eq(cashSales.cashSessionId, sessionId))
    .orderBy(desc(ordersV2.createdAt))
    .limit(limit);
  const ids = rows.map((r) => r.o.id);
  const lines = ids.length
    ? await getDb().select({ orderId: orderLines.orderId, name: products.name, quantity: orderLines.quantity }).from(orderLines).innerJoin(products, eq(products.id, orderLines.productId)).where(inArray(orderLines.orderId, ids))
    : [];
  return rows.map(({ s, o }) => ({
    orderId: o.id,
    code: o.code,
    number: s.number,
    totalCents: o.totalCents,
    at: (o.paidAt ?? o.createdAt).toISOString(),
    voided: !!s.voidedAt,
    summary: lines
      .filter((l) => l.orderId === o.id)
      .map((l) => `${l.quantity}× ${l.name}`)
      .join(', '),
  }));
}
