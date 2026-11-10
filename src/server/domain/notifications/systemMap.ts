import 'server-only';
import { and, count, eq, gte, inArray, lte } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { alertThrottle, emailLog, payments, refundRequests, refundsV2 } from '@/server/db/schema';
import { ordersV2Enabled } from '@/server/admin/flags';
import { scannerV2Enabled } from '@/server/domain/checkin/flag';
import { newCheckoutEnabled, publicV2Enabled } from '@/server/public/flags';
import { nexiStatus } from '@/server/integrations/nexi';
import { type Check, database, environment, nightlyJob, telegramWebhook } from './health';

/*
 * Mappa del sistema in admin (Sistema › Mappa): i nodi della mappa logica (docs/mappa-logica.html)
 * con un semaforo. Segnali: i controlli di /stato, gli allarmi di errore degli ultimi 7 giorni
 * (alert_throttle, testo fisso del log, senza dati personali) e pochi conteggi. Solo conteggi e
 * testi tecnici (§18.11). Un nodo nuovo nella mappa va aggiunto anche qui (NODES e ERROR_RULES).
 */

export type NodeId = 'sito' | 'database' | 'ordini' | 'pagamenti' | 'email' | 'ingresso' | 'cassa' | 'rimborsi' | 'accessi' | 'automatismi' | 'telegram' | 'configurazione' | 'altro';
export type Level = 'ok' | 'warn' | 'error';
export type RecentError = { message: string; lastAt: string; more: number };
/** `warn`: il controllo fallito è da guardare, non un guasto (giallo invece di rosso). */
export type Signal = Check & { warn?: boolean };
export type MapNode = { id: NodeId; label: string; role: string; system?: string; level: Level; signals: Signal[]; errors: RecentError[] };

const NODES: Array<Pick<MapNode, 'id' | 'label' | 'role'>> = [
  { id: 'sito', label: 'Sito pubblico', role: 'Pagine, eventi, notizie, iscrizioni e contatti' },
  { id: 'ordini', label: 'Ordini', role: 'Carrello, posti, ordini e biglietti' },
  { id: 'pagamenti', label: 'Pagamenti Nexi', role: 'Pagamento con carta e conferma firmata' },
  { id: 'email', label: 'Email', role: 'Biglietti in PDF e conferme via Resend' },
  { id: 'ingresso', label: 'Ingresso', role: 'Scanner dei QR ai varchi' },
  { id: 'cassa', label: 'Cassa', role: 'Vendite in piazza, turni e chiusura Z' },
  { id: 'rimborsi', label: 'Rimborsi', role: 'Richieste, approvazione e bonifici' },
  { id: 'accessi', label: 'Accessi', role: 'Login admin, utenti, PIN e telefoni' },
  { id: 'automatismi', label: 'Automatismi', role: 'Pulizia notturna, riepiloghi, reazioni agli eventi' },
  { id: 'telegram', label: 'Telegram', role: 'Avvisi e comandi del direttivo' },
  { id: 'database', label: 'Database', role: 'Neon Postgres' },
  { id: 'configurazione', label: 'Configurazione', role: 'Variabili d’ambiente su Vercel' },
  { id: 'altro', label: 'Altro', role: 'Errori non collegati a un nodo' },
];

/** Testo del log → nodo. La prima regola che corrisponde vince; il resto va in "Altro". */
const ERROR_RULES: Array<[RegExp, NodeId]> = [
  [/email|resend/i, 'email'],
  [/nexi|pagamento/i, 'pagamenti'],
  [/scanner/i, 'ingresso'],
  [/cassa/i, 'cassa'],
  [/rimbors/i, 'rimborsi'],
  [/login|password|sessione admin|pin|utenti|auth_secret/i, 'accessi'],
  [/telegram|whatsapp|allarme/i, 'telegram'],
  [/scadenza degli ordini|riepilogo|handler|evento di dominio/i, 'automatismi'],
  [/ordin|zuccaland date|bookings|clienti|cliente|partecipanti/i, 'ordini'],
  [/sitemap|trasparenza|contatti|sito pubblico|news|events|page content/i, 'sito'],
];

export function nodeForError(message: string): NodeId {
  return ERROR_RULES.find(([re]) => re.test(message))?.[1] ?? 'altro';
}

const HOUR = 3_600_000;
/** Errore nell'ultima ora: rosso; negli ultimi 7 giorni: giallo. */
export function errorLevel(lastAt: Date, now = new Date()): Level {
  return now.getTime() - lastAt.getTime() < HOUR ? 'error' : 'warn';
}

const worst = (levels: Level[]): Level => (levels.includes('error') ? 'error' : levels.includes('warn') ? 'warn' : 'ok');

const safe = async <T>(fn: () => Promise<T>, fallback: T) => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

export async function systemMap(now = new Date()): Promise<MapNode[]> {
  const db = getDb();
  const day = new Date(now.getTime() - 24 * HOUR);
  const week = new Date(now.getTime() - 7 * 24 * HOUR);
  const [dbCheck, nightly, bot, alerts, failedEmails, failedPayments, oldRefundsV2, oldRefundsLegacy, ordersV2, scannerV2, publicV2] = await Promise.all([
    database(),
    nightlyJob(),
    telegramWebhook(),
    safe(() => db.select().from(alertThrottle).where(gte(alertThrottle.lastSentAt, week)), null),
    safe(() => db.select({ n: count() }).from(emailLog).where(and(eq(emailLog.status, 'failed'), eq(emailLog.isTest, false), gte(emailLog.createdAt, day))).then(([r]) => r.n), null),
    safe(() => db.select({ n: count() }).from(payments).where(and(eq(payments.status, 'failed'), gte(payments.createdAt, day))).then(([r]) => r.n), null),
    safe(() => db.select({ n: count() }).from(refundsV2).where(and(inArray(refundsV2.status, ['requested', 'approved']), lte(refundsV2.requestedAt, week))).then(([r]) => r.n), null),
    safe(() => db.select({ n: count() }).from(refundRequests).where(and(eq(refundRequests.status, 'pending'), lte(refundRequests.createdAt, week.toISOString()))).then(([r]) => r.n), null),
    ordersV2Enabled(),
    scannerV2Enabled(),
    publicV2Enabled(),
  ]);

  const nexi = nexiStatus();
  const counted = (name: string, n: number | null, what: string): Check =>
    n === null ? { name, ok: false, detail: 'non verificabile' } : { name, ok: n === 0, detail: n === 0 ? 'nessuno' : `${n} ${what}` };

  const signals: Partial<Record<NodeId, Signal[]>> = {
    database: [dbCheck],
    configurazione: [environment()],
    telegram: [bot],
    automatismi: [nightly],
    pagamenti: [
      { name: 'Collegamento', ok: nexi.ready, detail: nexi.ready ? `ambiente ${nexi.mode}` : 'Nexi non configurato' },
      counted('Pagamenti falliti (24 ore, sistema nuovo)', failedPayments, 'falliti'),
    ],
    email: [counted('Invii falliti (24 ore)', failedEmails, 'non inviate')],
    rimborsi: [{ ...counted('Richieste ferme da più di 7 giorni', oldRefundsV2 === null || oldRefundsLegacy === null ? null : oldRefundsV2 + oldRefundsLegacy, 'da lavorare'), warn: true }],
  };
  if (alerts === null) signals.altro = [{ name: 'Allarmi di errore', ok: false, detail: 'non leggibili' }];

  const system: Partial<Record<NodeId, string>> = {
    sito: publicV2 ? 'calendario nuovo' : 'calendario di oggi',
    ordini: newCheckoutEnabled() ? 'checkout nuovo a Zuccaland' : 'checkout di oggi',
    ingresso: scannerV2 ? 'scanner nuovo' : 'scanner di oggi',
    rimborsi: ordersV2 ? 'pagine nuove' : 'pagine di oggi',
  };

  const errors = new Map<NodeId, Array<RecentError & { level: Level }>>();
  for (const a of alerts ?? []) {
    const id = nodeForError(a.key);
    errors.set(id, [...(errors.get(id) ?? []), { message: a.key, lastAt: a.lastSentAt.toISOString(), more: a.suppressed, level: errorLevel(a.lastSentAt, now) }]);
  }

  return NODES.map((n) => {
    const s = signals[n.id] ?? [];
    const e = (errors.get(n.id) ?? []).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    const level = worst([...s.map((c): Level => (c.ok ? 'ok' : c.warn ? 'warn' : 'error')), ...e.map((x) => x.level)]);
    return { ...n, system: system[n.id], level, signals: s, errors: e };
  }).filter((n) => n.id !== 'altro' || n.level !== 'ok');
}
