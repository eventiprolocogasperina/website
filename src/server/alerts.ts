import 'server-only';
import { sql } from 'drizzle-orm';
import { maskString } from '@/server/log';

// Allarmi per gli errori (prompt 18, al posto di un servizio di monitoraggio, §19): ogni `log.error`
// dei servizi di dominio e delle integrazioni arriva su Telegram alla chat admin. Raggruppati: al
// massimo un messaggio ogni 10 minuti per lo stesso tipo di errore, con quanti ne sono arrivati nel
// frattempo. Nel messaggio solo il testo fisso del log e campi tecnici scelti, mai il contesto intero
// (potrebbe contenere dati personali, §18.11) e mai il messaggio dell'errore.

export const ALERT_WINDOW_MS = 10 * 60 * 1000;

/** Campi del contesto che possono finire nell'allarme: codici e nomi tecnici. */
const SAFE_FIELDS = ['event', 'code', 'edition', 'status', 'source', 'module'] as const;
const SAFE_VALUE = /^[A-Za-z0-9._:-]{1,60}$/;

type Context = Record<string, unknown> | undefined;

function errorKind(context: Context): string | null {
  const e = context?.error;
  if (!e || typeof e !== 'object') return null;
  const code = (e as { code?: unknown }).code;
  if (typeof code === 'string' && SAFE_VALUE.test(code)) return code;
  const name = (e as { name?: unknown }).name;
  return typeof name === 'string' && SAFE_VALUE.test(name) ? name : null;
}

/** Tipo di errore per il raggruppamento: testo del log + nome o codice dell'errore. */
export function alertKey(msg: string, context?: Context): string {
  const kind = errorKind(context);
  return `${msg}${kind ? ` · ${kind}` : ''}`.slice(0, 200);
}

export function alertMessage(msg: string, context: Context, opts: { suppressed: number; logsUrl: string; env: string }): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  const fields = SAFE_FIELDS.flatMap((k) => {
    const v = context?.[k];
    return typeof v === 'string' && SAFE_VALUE.test(v) ? [`${k}: <code>${esc(v)}</code>`] : [];
  });
  const kind = errorKind(context);
  return [
    `🚨 <b>Errore</b> (${esc(opts.env)})`,
    esc(maskString(msg)),
    kind ? `tipo: <code>${esc(kind)}</code>` : '',
    ...fields,
    opts.suppressed > 0 ? `<i>+${opts.suppressed} dello stesso tipo negli ultimi 10 minuti</i>` : '',
    `<a href="${esc(opts.logsUrl)}">Apri i log di Vercel</a>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Link ai log: ALERT_LOGS_URL (es. la pagina Logs del progetto su Vercel), altrimenti la dashboard. */
export const logsUrl = () => process.env.ALERT_LOGS_URL || 'https://vercel.com/dashboard';

const recent = new Map<string, number>();

/**
 * Manda l'allarme se per questo tipo non ne è partito uno negli ultimi 10 minuti. Il conto vale tra
 * tutte le istanze (tabella alert_throttle); la mappa in memoria evita di interrogare il database a
 * ogni errore ripetuto sulla stessa istanza. Senza TELEGRAM_BOT_TOKEN non fa nulla.
 */
export async function reportError(msg: string, context?: Context, now = new Date()): Promise<boolean> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return false;
  const key = alertKey(msg, context);
  const last = recent.get(key);
  if (last && now.getTime() - last < ALERT_WINDOW_MS) {
    await countSuppressed(key).catch(() => {});
    return false;
  }
  const { getDb } = await import('@/server/db/client');
  const cutoff = new Date(now.getTime() - ALERT_WINDOW_MS);
  const res = await getDb().execute(sql`
    WITH prev AS (SELECT suppressed FROM alert_throttle WHERE key = ${key})
    INSERT INTO alert_throttle (key, last_sent_at, suppressed) VALUES (${key}, ${now.toISOString()}, 0)
    ON CONFLICT (key) DO UPDATE SET
      last_sent_at = CASE WHEN alert_throttle.last_sent_at < ${cutoff.toISOString()} THEN EXCLUDED.last_sent_at ELSE alert_throttle.last_sent_at END,
      suppressed = CASE WHEN alert_throttle.last_sent_at < ${cutoff.toISOString()} THEN 0 ELSE alert_throttle.suppressed + 1 END
    RETURNING (last_sent_at = ${now.toISOString()}) AS send, (SELECT suppressed FROM prev) AS before`);
  const row = (res as unknown as { rows: Array<{ send: boolean; before: number | null }> }).rows[0];
  if (!row?.send) return false;
  recent.set(key, now.getTime());
  const { alertChatId, telegramClient } = await import('@/server/integrations/telegram');
  const text = alertMessage(msg, context, { suppressed: row.before ?? 0, logsUrl: logsUrl(), env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'sviluppo' });
  return telegramClient().sendMessage(await alertChatId(), text);
}

async function countSuppressed(key: string) {
  const { getDb } = await import('@/server/db/client');
  await getDb().execute(sql`UPDATE alert_throttle SET suppressed = suppressed + 1 WHERE key = ${key}`);
}

/** Solo per i test. */
export const resetAlertMemory = () => recent.clear();
