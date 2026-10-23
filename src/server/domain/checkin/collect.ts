import 'server-only';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { collectPayOnSite, type CollectResult } from '@/server/domain/cash/collect';
import { scan, type ScanResult } from './scan';

// Varco: un biglietto di un ordine "Paga in loco" non ancora pagato esce "Da pagare". Con il permesso
// checkin.collect_payment l'operatore incassa (contanti o POS, sul turno di una cassa aperta) e il
// biglietto entra subito; senza, l'esito dice di passare dalla cassa.

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
export type CollectAtGateResult = { collected: CollectResult | null; scan: ScanResult };

/**
 * Incassa al varco e fa entrare: prima si rilegge il biglietto (lista, data, blacklist valgono come
 * sempre), poi l'incasso (importo dal server), poi il check-in. Un reinvio dopo un incasso riuscito
 * non incassa di nuovo: il biglietto risulta pagato ed entra (o è già entrato).
 */
export async function collectAtGate(ctx: Ctx, input: z.input<typeof CollectAtGateInput>): Promise<CollectAtGateResult> {
  const data = CollectAtGateInput.parse(input);
  const target = { ticketId: data.ticketId, checkinListId: data.checkinListId, sessionId: data.sessionId };
  const before = await scan(ctx, target);
  if (before.result !== 'to_pay') return { collected: null, scan: before };
  const collected = await collectPayOnSite(
    ctx,
    { orderId: before.ticket.orderId, cashSessionId: data.cashSessionId, method: data.method, cashReceivedCents: data.cashReceivedCents, idempotencyKey: data.idempotencyKey, expectedDueCents: data.expectedDueCents },
    { via: 'varco' },
  );
  return { collected, scan: await scan(ctx, target) };
}
