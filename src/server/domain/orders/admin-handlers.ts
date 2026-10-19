import 'server-only';
import { on } from '@/server/domain/events';
import { sendOrderTickets } from '@/server/email/order-tickets';

// Handler degli eventi usati dalle pagine ordini dell'admin (prompt 12). Lo importano le Server
// Action che pubblicano questi eventi; la registrazione avviene una volta sola per processo.
const g = globalThis as { __adminOrderHandlers?: boolean };
if (!g.__adminOrderHandlers) {
  g.__adminOrderHandlers = true;
  // "Reinvia biglietti" (resendTickets): l'email con i biglietti la costruisce il servizio comune.
  on('order.tickets_resent', async (event) => {
    await sendOrderTickets(event.orderId, { reason: 'resent' });
  });
}
