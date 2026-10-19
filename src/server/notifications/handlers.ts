import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { ordersV2 } from '@/server/db/schema';
import { on, registerOnce } from '@/server/domain/events';
import { sendOrderTickets } from '@/server/email/order-tickets';

// Notifiche ai clienti collegate agli eventi di dominio (§6). Le importano i servizi che pubblicano
// gli eventi; la registrazione avviene una volta sola anche con il ricaricamento a caldo.

/** Canali in cui il cliente riceve i biglietti per email appena l'ordine è pagato. */
const EMAIL_ON_PAID = ['online', 'paylink'];

registerOnce('notifications', () => {
  on('order.paid', async (event) => {
    const [o] = await getDb().select({ channel: ordersV2.channel }).from(ordersV2).where(eq(ordersV2.id, event.orderId));
    if (o && EMAIL_ON_PAID.includes(o.channel)) await sendOrderTickets(event.orderId, { reason: 'paid' });
  });
});
