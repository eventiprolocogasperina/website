import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { ScannerAction } from '@/modules/types';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb } from '@/server/db/client';
import { cashRegisters, cashSessions, editions, ordersV2, products } from '@/server/db/schema';
import { sell } from '@/server/domain/cash/sales';
import { DomainError } from '@/server/domain/errors';
import { answerCounts, applyScannerAction, incrementOnOrder, scannerActionsFor, type ScannerActionResult } from './actions';
import { assertCanOn } from './scan';

// Pulsanti dello scanner a pagamento (es. "+1 Bambino" con l'ingresso bambino): il tocco apre una
// piccola cassa. Prezzo e prodotto li decide il server (§18.1); la vendita è un ordine `pos` sul
// turno di cassa indicato, legato all'ordine letto, e il conteggio sale nella stessa transazione.

type PaidProduct = { id: string; name: string; priceCents: number; requiresSession: boolean };

/** Prodotto da incassare per il pulsante, se c'è ed è a pagamento; altrimenti il pulsante conta e basta. */
async function paidProduct(editionId: string, action: ScannerAction): Promise<PaidProduct | null> {
  if (!action.productId) return null;
  const [p] = await getDb()
    .select({ id: products.id, name: products.name, priceCents: products.priceCents, requiresSession: products.requiresSession })
    .from(products)
    .where(and(eq(products.id, action.productId), eq(products.editionId, editionId)));
  return p && p.priceCents > 0 ? p : null;
}

/** Prodotti a pagamento dei pulsanti, per mostrare il prezzo sul pulsante all'avvio. */
export async function paidActionProducts(editionId: string, actions: ScannerAction[]): Promise<Record<string, { name: string; priceCents: number }>> {
  const out: Record<string, { name: string; priceCents: number }> = {};
  for (const a of actions) {
    const p = await paidProduct(editionId, a);
    if (p) out[a.key] = { name: p.name, priceCents: p.priceCents };
  }
  return out;
}

/** Turno di cassa che riceve l'incasso: quello aperto della cassa indicata, o quello aperto da questo telefono. */
async function openCashSession(ctx: Ctx, editionId: string, action: ScannerAction): Promise<{ id: string; register: string } | { problem: string }> {
  const db = getDb();
  if (action.registerId) {
    const [register] = await db.select({ name: cashRegisters.name }).from(cashRegisters).where(and(eq(cashRegisters.id, action.registerId), eq(cashRegisters.editionId, editionId)));
    if (!register) return { problem: 'La cassa di questo pulsante non esiste più. Avvisa un responsabile.' };
    const [s] = await db.select({ id: cashSessions.id }).from(cashSessions).where(and(eq(cashSessions.registerId, action.registerId), isNull(cashSessions.closedAt)));
    return s ? { id: s.id, register: register.name } : { problem: `Nessun turno aperto sulla cassa «${register.name}». Aprilo dall’app Cassa prima di incassare.` };
  }
  if (!ctx.device) return { problem: 'Nessuna cassa indicata per questo pulsante: sceglila nelle impostazioni del modulo Attività.' };
  const [s] = await db
    .select({ id: cashSessions.id, register: cashRegisters.name })
    .from(cashSessions)
    .innerJoin(cashRegisters, eq(cashRegisters.id, cashSessions.registerId))
    .where(and(eq(cashSessions.editionId, editionId), eq(cashSessions.deviceId, ctx.device.id), isNull(cashSessions.closedAt)))
    .orderBy(desc(cashSessions.openedAt))
    .limit(1);
  return s ?? { problem: 'Questo telefono non ha un turno di cassa aperto. Apri un turno o chiedi a un responsabile di indicare la cassa del pulsante.' };
}

async function loadAction(ctx: Ctx, orderId: string, actionKey: string) {
  const [row] = await getDb()
    .select({ order: { id: ordersV2.id, sessionId: ordersV2.sessionId }, edition: editions })
    .from(ordersV2)
    .innerJoin(editions, eq(editions.id, ordersV2.editionId))
    .where(and(eq(ordersV2.id, orderId), isNull(ordersV2.deletedAt)));
  if (!row) throw new DomainError('NOT_FOUND');
  assertCanOn(ctx, 'checkin.scan', row.edition.slug);
  const action = scannerActionsFor(row.edition).find((a) => a.key === actionKey);
  if (!action) throw new DomainError('CONFLICT', { message: 'Questo pulsante non è più attivo. Ricarica lo scanner.' });
  return { ...row, action };
}

export const ActionQuoteInput = z.object({ orderId: z.uuid(), actionKey: z.string().trim().min(1).max(60) });

export type ActionQuote =
  | { paid: false }
  | { paid: true; product: { name: string; priceCents: number }; register: string | null; cashSessionId: string | null; problem: string | null };

/** Cosa mostra il popup di cassa: prodotto e prezzo dal server, cassa e motivo se non si può incassare. */
export async function scannerActionQuote(ctx: Ctx, input: z.input<typeof ActionQuoteInput>): Promise<ActionQuote> {
  const data = ActionQuoteInput.parse(input);
  const { edition, action } = await loadAction(ctx, data.orderId, data.actionKey);
  const product = await paidProduct(edition.id, action);
  if (!product) return { paid: false };
  const base = { paid: true as const, product: { name: product.name, priceCents: product.priceCents } };
  if (!can(ctx, 'pos.sell', { edition: edition.slug })) return { ...base, register: null, cashSessionId: null, problem: NO_SELL };
  const session = await openCashSession(ctx, edition.id, action);
  if ('problem' in session) return { ...base, register: null, cashSessionId: null, problem: session.problem };
  return { ...base, register: session.register, cashSessionId: session.id, problem: null };
}

const NO_SELL = 'Il tuo profilo non può incassare: serve anche il ruolo Cassa. Chiedi a un responsabile.';

export const PayActionInput = ActionQuoteInput.extend({
  method: z.enum(['cash', 'card_pos']),
  /** Generata dal telefono a ogni apertura del popup: un reinvio non incassa due volte. */
  idempotencyKey: z.string().trim().min(8).max(100),
  /** Prezzo mostrato nel popup: se nel frattempo è cambiato, PRICE_CHANGED e si mostra quello nuovo. */
  expectedTotalCents: z.number().int().min(0),
});

export type PayActionResult = ScannerActionResult & { sale: { code: string; number: number | null; totalCents: number; method: 'cash' | 'card_pos'; register: string } | null };

/**
 * Tocco su un pulsante a pagamento: vendita `pos` (prezzo dal catalogo, turno di cassa aperto) e
 * conteggio in una sola transazione. Prodotto gratuito o tolto nel frattempo: solo conteggio.
 * Serve la rete: le vendite offline restano della cassa, che ha la sua coda.
 */
export async function payScannerAction(ctx: Ctx, input: z.input<typeof PayActionInput>): Promise<PayActionResult> {
  const data = PayActionInput.parse(input);
  const { order, edition, action } = await loadAction(ctx, data.orderId, data.actionKey);
  const product = await paidProduct(edition.id, action);
  if (!product) return { ...(await applyScannerAction(ctx, data)), sale: null };
  if (!can(ctx, 'pos.sell', { edition: edition.slug })) throw new DomainError('FORBIDDEN', { message: NO_SELL });
  const session = await openCashSession(ctx, edition.id, action);
  if ('problem' in session) throw new DomainError('CONFLICT', { message: session.problem });

  let counted: ScannerActionResult | null = null;
  const sale = await sell(
    ctx,
    { cashSessionId: session.id, lines: [{ productId: product.id, quantity: 1 }], method: data.method, idempotencyKey: data.idempotencyKey, expectedTotalCents: data.expectedTotalCents },
    {
      sessionId: product.requiresSession ? order.sessionId : null,
      parentOrderId: order.id,
      afterSale: async (tx, created) => {
        counted = await incrementOnOrder(tx, ctx, order.id, action.key, { vendita: created.order.code, importo: created.order.totalCents });
      },
    },
  );
  // Reinvio della stessa vendita: il conteggio era già salito la prima volta, si legge quello attuale.
  let result: ScannerActionResult | null = counted;
  if (!result) {
    const now = (await answerCounts(order.id, [action.questionKey]))[action.questionKey];
    result = { questionKey: action.questionKey, label: action.label, before: now, after: now };
  }
  return { ...result, sale: { code: sale.code, number: sale.number, totalCents: sale.totalCents, method: data.method, register: sale.registerName } };
}
