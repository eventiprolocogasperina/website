import 'server-only';
import { and, count, eq, isNull, lte, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { ordersV2 } from '@/server/db/schema';
import { escapeHtml } from './messages';

/*
 * Stato del sito per `/stato` e per il controllo serale del cron. Solo sì/no, tempi e conteggi:
 * nessun valore di variabili d'ambiente, nessun dato di clienti (§18.8, §18.11).
 */

export type Check = { name: string; ok: boolean; detail: string };

/** Variabili senza le quali una parte del sito non funziona. Si controlla solo che ci siano. */
const REQUIRED_ENV: Array<[string, string]> = [
  ['POSTGRES_URL', 'database'],
  ['AUTH_SECRET', 'accessi admin'],
  ['CRON_SECRET', 'operazioni notturne'],
  ['TELEGRAM_BOT_TOKEN', 'bot Telegram'],
  ['TELEGRAM_WEBHOOK_SECRET', 'comandi del bot'],
  ['RESEND_API_KEY', 'email'],
  ['REFUND_ENCRYPTION_KEY', 'rimborsi'],
  ['NEXI_ALIAS', 'pagamenti Nexi'],
  ['NEXI_MAC_KEY', 'pagamenti Nexi'],
];

/** Il database risponde, e in quanto tempo. */
async function database(): Promise<Check> {
  const start = Date.now();
  try {
    await getDb().execute(sql`select 1`);
    const ms = Date.now() - start;
    return { name: 'Database', ok: ms < 3000, detail: `risponde in ${ms} ms` };
  } catch {
    return { name: 'Database', ok: false, detail: 'non risponde' };
  }
}

/** Ordini in attesa scaduti da più di 2 giorni: il cron notturno che li chiude non sta girando. */
async function nightlyJob(): Promise<Check> {
  try {
    const [r] = await getDb()
      .select({ n: count() })
      .from(ordersV2)
      .where(and(eq(ordersV2.status, 'pending'), lte(ordersV2.expiresAt, new Date(Date.now() - 2 * 86_400_000)), isNull(ordersV2.deletedAt)));
    return { name: 'Pulizia notturna', ok: r.n === 0, detail: r.n === 0 ? 'regolare' : `${r.n} ordini scaduti ancora aperti` };
  } catch {
    return { name: 'Pulizia notturna', ok: false, detail: 'non verificabile' };
  }
}

/** Il webhook del bot: indirizzo registrato, messaggi in coda e ultimo errore di consegna. */
async function telegramWebhook(): Promise<Check> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { name: 'Bot Telegram', ok: false, detail: 'token mancante' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const { result } = (await res.json()) as { result?: { url?: string; pending_update_count?: number; last_error_date?: number; last_error_message?: string } };
    if (!result?.url) return { name: 'Bot Telegram', ok: false, detail: 'webhook non registrato: apri /api/telegram/setup' };
    const recentError = result.last_error_date && Date.now() / 1000 - result.last_error_date < 86_400 ? result.last_error_message : null;
    const pending = result.pending_update_count ?? 0;
    return {
      name: 'Bot Telegram',
      ok: !recentError && pending < 5,
      detail: recentError ? `errore nelle ultime 24 ore: ${recentError}` : pending ? `${pending} messaggi in coda` : 'regolare',
    };
  } catch {
    return { name: 'Bot Telegram', ok: false, detail: 'Telegram non risponde' };
  }
}

function environment(): Check {
  const missing = REQUIRED_ENV.filter(([key]) => !process.env[key]);
  return {
    name: 'Configurazione',
    ok: missing.length === 0,
    detail: missing.length ? `mancano: ${missing.map(([key, what]) => `${key} (${what})`).join(', ')}` : 'completa',
  };
}

export async function checkHealth(): Promise<Check[]> {
  const [db, job, bot] = await Promise.all([database(), nightlyJob(), telegramWebhook()]);
  return [db, job, bot, environment()];
}

/** Versione pubblicata: ramo, commit e ambiente di Vercel. */
export function deployInfo(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'sconosciuto';
  const message = process.env.VERCEL_GIT_COMMIT_MESSAGE?.split('\n')[0];
  return [env, sha, message && escapeHtml(message.slice(0, 80))].filter(Boolean).join(' · ');
}

export function healthMessage(checks: Check[], title = '🩺 <b>Stato del sito</b>'): string {
  const lines = checks.map((c) => `${c.ok ? '✅' : '⚠️'} <b>${c.name}</b>: ${escapeHtml(c.detail)}`);
  return `${title}\n\n${lines.join('\n')}\n\n🚀 Versione: ${deployInfo() || 'sconosciuta'}`;
}
