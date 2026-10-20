import 'server-only';
import { log } from '@/server/log';

/**
 * Client del bot Telegram. Quello vero chiama l'API solo con TELEGRAM_BOT_TOKEN impostato: in locale
 * e nei test il token è vuoto e non parte nessuna chiamata. I test sostituiscono il client con
 * `setTelegramClient`. Il token non compare mai nei log (§18.8).
 */
export type TelegramClient = { sendMessage(chatId: string, text: string): Promise<boolean> };

const httpClient: TelegramClient = {
  async sendMessage(chatId, text) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !chatId) {
      log.debug('Telegram non configurato: messaggio non inviato');
      return false;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      });
      // Solo warn: un errore qui farebbe partire un allarme, che passerebbe di nuovo da qui.
      if (!res.ok) log.warn('Invio Telegram non riuscito', { status: res.status });
      return res.ok;
    } catch (error) {
      log.warn('Invio Telegram non riuscito', { error: error instanceof Error ? error.name : 'errore' });
      return false;
    }
  },
};

let current: TelegramClient = httpClient;

export const telegramClient = (): TelegramClient => current;

/** Solo per i test: sostituisce il client (null = quello vero). */
export function setTelegramClient(client: TelegramClient | null): void {
  current = client ?? httpClient;
}

/** La chat degli allarmi: quella scelta in Sistema → Notifiche, altrimenti TELEGRAM_CHAT_ID. */
export async function alertChatId(): Promise<string> {
  const { getSettings } = await import('@/server/domain/settings');
  try {
    return (await getSettings('telegram')).telegram_alert_chat_id || process.env.TELEGRAM_CHAT_ID || '';
  } catch {
    return process.env.TELEGRAM_CHAT_ID || '';
  }
}

/**
 * Allarme per lo staff sulla chat admin. Solo codici e importi, mai dati personali (§18.11).
 * Senza Telegram configurato (sviluppo, test) resta la riga di log.
 */
export async function sendAlert(text: string): Promise<void> {
  log.warn('Allarme', { text });
  await telegramClient().sendMessage(await alertChatId(), `⚠️ ${text}`);
}
