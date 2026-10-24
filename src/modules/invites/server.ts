import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb } from '@/server/db/client';
import { editions } from '@/server/db/schema';
import { DomainError, isDomainError } from '@/server/domain/errors';
import { createOrder, type OrderResult } from '@/server/domain/orders';
import { requireModule } from '@/server/domain/orders/shared';
import { moduleSettings } from '../registry';

export const SendInvitesInput = z.object({
  editionId: z.string().uuid(),
  productId: z.string().uuid(),
  sessionId: z.string().uuid().nullish(),
  /** Chiave dell'invio: rilanciare lo stesso invio non crea ordini doppi. */
  batchKey: z.string().trim().min(8).max(60),
  recipients: z
    .array(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().email('Email non valida.'), quantity: z.number().int().min(1) }))
    .min(1, 'Aggiungi almeno un invitato.')
    .max(500),
});

export type InviteOutcome = { email: string; ok: true; order: OrderResult } | { email: string; ok: false; error: string };

/**
 * Inviti in blocco (sostituisce /admin/zuccaland-inviti): un ordine a 0 € con canale `invite` per
 * invitato, che occupa i posti come un biglietto venduto. Un invitato che non va a buon fine non
 * ferma gli altri: l'esito torna riga per riga.
 */
export async function sendInvites(ctx: Ctx, input: z.input<typeof SendInvitesInput>): Promise<InviteOutcome[]> {
  const data = SendInvitesInput.parse(input);
  const [edition] = await getDb().select().from(editions).where(eq(editions.id, data.editionId));
  if (!edition) throw new DomainError('NOT_FOUND');
  requireModule(edition, 'invites');
  const { maxPerRecipient } = moduleSettings('invites', edition.moduleSettings) as { maxPerRecipient: number };
  const results: InviteOutcome[] = [];
  for (const r of data.recipients) {
    if (r.quantity > maxPerRecipient) {
      results.push({ email: r.email, ok: false, error: `Al massimo ${maxPerRecipient} biglietti per invitato.` });
      continue;
    }
    try {
      const order = await createOrder(ctx, {
        editionId: edition.id,
        channel: 'invite',
        lines: [{ productId: data.productId, quantity: r.quantity, sessionId: data.sessionId }],
        sessionId: data.sessionId,
        customer: { email: r.email, name: r.name },
        idempotencyKey: `invite:${data.batchKey}:${r.email}`,
      });
      results.push({ email: r.email, ok: true, order });
    } catch (error) {
      if (!isDomainError(error) || error.code === 'FORBIDDEN') throw error;
      results.push({ email: r.email, ok: false, error: error.message });
    }
  }
  return results;
}
