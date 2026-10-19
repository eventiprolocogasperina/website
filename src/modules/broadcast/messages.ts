import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { customers, editions, ordersV2 } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { requireModule } from '@/server/domain/orders/shared';
import { actionEmail, sendEmail } from '@/server/email/send';

export const OrdersMessageInput = z.object({
  editionId: z.string().uuid(),
  orderIds: z.array(z.string().uuid()).min(1).max(500),
  subject: z.string().trim().min(3, 'Scrivi l’oggetto.').max(150),
  body: z.string().trim().min(10, 'Scrivi il messaggio.').max(3000),
});

/**
 * Azione di massa "Invia messaggio" dell'elenco ordini (modulo broadcast): un'email a ogni cliente
 * degli ordini scelti, una sola per indirizzo. WhatsApp resta nella pagina Ordini di oggi finché il
 * modulo non avrà il suo invio. Nel registro solo quanti e quali ordini, mai gli indirizzi.
 */
export async function sendMessageToOrders(ctx: Ctx, input: z.input<typeof OrdersMessageInput>): Promise<{ sent: number; failed: number }> {
  const data = OrdersMessageInput.parse(input);
  const db = getDb();
  const [edition] = await db.select().from(editions).where(eq(editions.id, data.editionId));
  if (!edition) throw new DomainError('NOT_FOUND');
  if (!ctx.user || !can(ctx, 'orders.edit', { edition: edition.slug })) throw new DomainError('FORBIDDEN');
  requireModule(edition, 'broadcast');
  const rows = await db
    .selectDistinct({ email: customers.email, name: customers.name })
    .from(ordersV2)
    .innerJoin(customers, eq(customers.id, ordersV2.customerId))
    .where(and(eq(ordersV2.editionId, edition.id), inArray(ordersV2.id, data.orderIds), isNull(customers.deletedAt)));
  let sent = 0;
  for (const r of rows) {
    const ok = await sendEmail(actionEmail({ to: r.email, subject: data.subject, intro: `${r.name ? `Ciao ${r.name}, ` : ''}${data.body}`, outro: `Hai ricevuto questo messaggio perché hai un ordine per ${edition.title}.` }));
    if (ok) sent++;
  }
  await withTransaction((tx) =>
    audit(tx, ctx, 'order.message_sent', { entityType: 'edition', entityId: edition.id, edition: edition.slug, after: { orders: data.orderIds.length, recipients: rows.length, sent }, reason: data.subject }),
  );
  return { sent, failed: rows.length - sent };
}
