import 'server-only';
import { and, eq, exists, inArray, isNull, notExists, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb } from '@/server/db/client';
import { checkins, customers, editions, orderLines, ordersV2, ticketsV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { requireModule } from '@/server/domain/orders/shared';

export const AudienceInput = z.object({
  editionId: z.string().uuid(),
  sessionId: z.string().uuid().nullish(),
  /** 'in': almeno un biglietto già entrato; 'out': nessuno; 'any': tutti. */
  checkedIn: z.enum(['any', 'in', 'out']).default('any'),
});

export type AudienceRow = { orderCode: string; name: string | null; email: string; phone: string | null };

/**
 * Destinatari di un messaggio WhatsApp o email: clienti con un ordine pagato, filtrati per data e per
 * ingresso. Contiene dati personali: solo per chi gestisce gli ordini dell'edizione, mai da sistema.
 */
export async function broadcastAudience(ctx: Ctx, input: z.input<typeof AudienceInput>): Promise<AudienceRow[]> {
  const data = AudienceInput.parse(input);
  const db = getDb();
  const [edition] = await db.select().from(editions).where(eq(editions.id, data.editionId));
  if (!edition) throw new DomainError('NOT_FOUND');
  if (!ctx.user || !can(ctx, 'orders.edit', { edition: edition.slug })) throw new DomainError('FORBIDDEN');
  requireModule(edition, 'broadcast');

  const enteredTicket = db
    .select({ x: sql`1` })
    .from(ticketsV2)
    .innerJoin(checkins, and(eq(checkins.ticketId, ticketsV2.id), isNull(checkins.revertedAt)))
    .where(eq(ticketsV2.orderId, ordersV2.id));
  const inSession = db
    .select({ x: sql`1` })
    .from(orderLines)
    .where(and(eq(orderLines.orderId, ordersV2.id), eq(orderLines.sessionId, data.sessionId ?? ordersV2.sessionId)));

  return db
    .selectDistinct({ orderCode: ordersV2.code, name: customers.name, email: customers.email, phone: customers.phone })
    .from(ordersV2)
    .innerJoin(customers, eq(customers.id, ordersV2.customerId))
    .where(
      and(
        eq(ordersV2.editionId, edition.id),
        inArray(ordersV2.status, ['paid', 'partially_refunded']),
        isNull(ordersV2.deletedAt),
        isNull(customers.deletedAt),
        data.sessionId ? exists(inSession) : undefined,
        data.checkedIn === 'in' ? exists(enteredTicket) : data.checkedIn === 'out' ? notExists(enteredTicket) : undefined,
      ),
    )
    .orderBy(ordersV2.code);
}
