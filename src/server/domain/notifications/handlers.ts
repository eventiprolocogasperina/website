import 'server-only';
import { and, count, eq, ne } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { editions, ordersV2, ticketsV2 } from '@/server/db/schema';
import { on, registerOnce } from '@/server/domain/events';
import { alertChatId, telegramClient } from '@/server/integrations/telegram';
import { amountMismatchMessage, cashDifferenceMessage, orderPaidMessage, paymentFailedMessage, refundRequestedMessage } from './messages';
import { isNotificationOn, type NotificationType } from './settings';

// Notifiche Telegram allo staff come handler degli eventi di dominio (§6): partono solo dagli ordini
// del nucleo nuovo. Le rotte di oggi (Zuccaland in vendita) mandano ancora i loro messaggi finché
// esistono. Ogni tipo si spegne per edizione; nei testi solo codici, quantità e importi (§18.11).

async function editionOf(slug: string) {
  const [e] = await getDb().select({ title: editions.title, settings: editions.notificationSettings }).from(editions).where(eq(editions.slug, slug));
  return e ?? null;
}

/** Invia il testo alla chat dello staff se il tipo è attivo per l'edizione. */
async function notify(slug: string, type: NotificationType, text: (title: string) => string | Promise<string | null> | null): Promise<void> {
  const e = await editionOf(slug);
  if (!e || !isNotificationOn(e.settings, type)) return;
  const body = await text(e.title);
  if (body) await telegramClient().sendMessage(await alertChatId(), body);
}

registerOnce('telegram-notifications', () => {
  on('order.paid', (event) =>
    notify(event.edition, 'orderPaid', async (edition) => {
      const db = getDb();
      const [o] = await db.select({ channel: ordersV2.channel }).from(ordersV2).where(eq(ordersV2.id, event.orderId));
      // La cassa fa decine di contributi l'ora: niente messaggio per ognuno.
      if (!o || o.channel === 'pos') return null;
      const [t] = await db.select({ n: count() }).from(ticketsV2).where(and(eq(ticketsV2.orderId, event.orderId), ne(ticketsV2.status, 'void')));
      return orderPaidMessage({ code: event.code, edition, totalCents: event.totalCents, tickets: t?.n ?? 0, channel: o.channel });
    }),
  );
  on('payment.failed', (event) => notify(event.edition, 'paymentProblem', (edition) => paymentFailedMessage({ ...event, edition })));
  on('payment.amount_mismatch', (event) => notify(event.edition, 'paymentProblem', (edition) => amountMismatchMessage({ ...event, edition })));
  on('refund.requested', (event) => notify(event.edition, 'refundRequested', (edition) => refundRequestedMessage({ ...event, edition })));
  on('cash.session_closed', (event) =>
    notify(event.edition, 'cashDifference', (edition) => (event.differenceCents === 0 ? null : cashDifferenceMessage({ ...event, edition }))),
  );
});
