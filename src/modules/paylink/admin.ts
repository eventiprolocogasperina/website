import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb } from '@/server/db/client';
import { customers, ordersV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { addLines, type OrderResult } from '@/server/domain/orders';
import { createPaylinkOrder } from './server';

export const PaylinkFromOrderInput = z.object({
  orderId: z.string().uuid(),
  lines: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(50) })).min(1, 'Scegli almeno un prodotto.').max(30),
  idempotencyKey: z.string().trim().min(8).max(100),
});

/**
 * Azione "Crea link di pagamento" della pagina ordine (modulo paylink). Con un ordine pagato nasce
 * un'integrazione collegata (addLines, canale paylink); altrimenti un ordine pay-link nuovo per lo
 * stesso cliente e la stessa data. Prezzi e scadenza li decide il server. La pagina che il cliente
 * apre per pagare arriva con il prompt 13: qui si restituisce il codice dell'ordine creato.
 */
export async function createPaylinkFromOrder(ctx: Ctx, input: z.input<typeof PaylinkFromOrderInput>): Promise<OrderResult> {
  const data = PaylinkFromOrderInput.parse(input);
  const db = getDb();
  const [order] = await db.select().from(ordersV2).where(eq(ordersV2.id, data.orderId));
  if (!order) throw new DomainError('NOT_FOUND');
  const lines = data.lines.map((l) => ({ ...l, sessionId: order.sessionId }));
  if (order.status === 'paid' || order.status === 'partially_refunded') {
    return addLines(ctx, { orderId: order.id, lines, channel: 'paylink', idempotencyKey: data.idempotencyKey });
  }
  const [customer] = order.customerId ? await db.select().from(customers).where(eq(customers.id, order.customerId)) : [];
  if (!customer) throw new DomainError('VALIDATION', { message: 'L’ordine non ha un cliente a cui mandare il link.' });
  return createPaylinkOrder(ctx, {
    editionId: order.editionId,
    lines,
    sessionId: order.sessionId,
    customer: { email: customer.email, name: customer.name, phone: customer.phone },
    idempotencyKey: data.idempotencyKey,
  });
}
