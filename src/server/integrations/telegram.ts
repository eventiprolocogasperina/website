import 'server-only';
import { sendTelegramNotification } from '@/lib/telegram';
import { log } from '@/server/log';

/**
 * Allarme per lo staff sul gruppo Telegram. Solo codici e importi, mai dati personali (§18.11).
 * Senza Telegram configurato (sviluppo, test) resta la riga di log.
 */
export async function sendAlert(text: string): Promise<void> {
  log.warn('Allarme', { text });
  await sendTelegramNotification(`⚠️ ${text}`);
}
