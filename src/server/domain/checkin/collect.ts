import 'server-only';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { collectPayOnSite, type CollectResult } from '@/server/domain/cash/collect';
import { previewOrder, type OrderPreview } from './group';

// Varco: un biglietto di un ordine "Paga in loco" non ancora pagato esce "Da pagare". Con il permesso
// checkin.collect_payment l'operatore incassa (contanti o POS, sul turno di una cassa aperta) e il
// l'ordine si apre per la conferma di gruppo ("Fai entrare N"); senza, l'esito dice di passare dalla cassa.

export const CollectAtGateInput = z.object({
  ticketId: z.uuid(),
  checkinListId: z.uuid(),
  sessionId: z.uuid().nullish(),
  cashSessionId: z.uuid().nullish(),
  method: z.enum(['cash', 'card_pos']),
  cashReceivedCents: z.number().int().min(0).max(1_000_000).nullish(),
  idempotencyKey: z.string().trim().min(8).max(100),
  expectedDueCents: z.number().int().min(0),
});

/** `collected` null: niente da incassare (già pagato nel frattempo, o un altro esito): vale `scan`. */
export type CollectAtGateResult = { collected: CollectResult | null; scan: OrderPreview };

/**
 * Incassa al varco: prima si rilegge il biglietto (lista, data, blacklist valgono come sempre), poi
 * l'incasso (importo dal server), poi si rilegge l'ordine: nessuno entra ancora, l'operatore conferma
 * chi c'è con la conferma di gruppo (`checkinGroup`). Un reinvio dopo un incasso riuscito non incassa
 * di nuovo: l'ordine risulta pagato e torna l'elenco da confermare (o "già entrato").
 */
export async function collectAtGate(ctx: Ctx, input: z.input<typeof CollectAtGateInput>): Promise<CollectAtGateResult> {
  const data = CollectAtGateInput.parse(input);
  const target = { ticketId: data.ticketId, checkinListId: data.checkinListId, sessionId: data.sessionId };
  const before = await previewOrder(ctx, target);
  if (before.result !== 'to_pay') return { collected: null, scan: before };
  const collected = await collectPayOnSite(
    ctx,
    { orderId: before.ticket.orderId, cashSessionId: data.cashSessionId, method: data.method, cashReceivedCents: data.cashReceivedCents, idempotencyKey: data.idempotencyKey, expectedDueCents: data.expectedDueCents },
    { via: 'varco' },
  );
  return { collected, scan: await previewOrder(ctx, target) };
}
