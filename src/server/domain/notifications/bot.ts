import 'server-only';
import { and, count, desc, eq, inArray, isNull, ne } from 'drizzle-orm';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { getDb } from '@/server/db/client';
import { editions, ordersV2, ticketsV2 } from '@/server/db/schema';
import { EDITION_STATUS_LABELS } from '@/server/domain/editions/types';
import { editionStats, SOLD_STATUSES } from '@/server/domain/stats';
import { checkHealth, healthMessage } from './health';
import { escapeHtml } from './messages';
import { runningEditions, todayReport } from './reports';

// Comandi generici del bot Telegram (prompt 18): `/stats [edizione]`, `/ordini [edizione]`, `/edizioni`.
// Affiancano quelli di oggi (/statszuccaland, /stats senza argomento = A&P, …), che il webhook prova
// prima: qui arrivano solo i comandi che quelli non gestiscono. Solo numeri e codici, mai nomi (§18.11).

export type ParsedCommand = { cmd: string; arg: string };

export function parseCommand(text: string): ParsedCommand {
  const [raw = '', ...rest] = text.trim().split(/\s+/);
  return { cmd: raw.split('@')[0].toLowerCase(), arg: rest.join(' ').toLowerCase() };
}

/**
 * Il comando spetta ai comandi generici? Quelli di oggi restano invariati: `/stats` e `/ordini`
 * senza argomento, `/stats …zucca…` e i comandi con il nome dell'evento.
 */
export function isGenericCommand({ cmd, arg }: ParsedCommand): boolean {
  if (cmd === '/edizioni' || cmd === '/aiuto' || cmd === '/oggi' || cmd === '/stato') return true;
  if (cmd === '/stats') return !!arg && !arg.includes('zucca');
  if (cmd === '/ordini') return !!arg;
  return false;
}

type EditionRow = { id: string; slug: string; title: string; status: string; startsAt: Date | null };

/** L'edizione indicata: slug esatto, altrimenti la più recente il cui slug o titolo contiene il testo. */
export function matchEdition(rows: EditionRow[], arg: string): EditionRow | null {
  const q = arg.trim().toLowerCase();
  if (!q) return null;
  const exact = rows.find((r) => r.slug === q);
  if (exact) return exact;
  const hits = rows.filter((r) => r.slug.includes(q.replace(/\s+/g, '-')) || r.title.toLowerCase().includes(q));
  return hits.sort((a, b) => (b.startsAt?.getTime() ?? 0) - (a.startsAt?.getTime() ?? 0))[0] ?? null;
}

async function visibleEditions(): Promise<EditionRow[]> {
  const rows = await getDb().select({ id: editions.id, slug: editions.slug, title: editions.title, status: editions.status, startsAt: editions.startsAt }).from(editions);
  return rows.filter((r) => r.status !== 'draft');
}

const NOT_FOUND = (arg: string) => `ℹ️ Nessuna edizione trovata per “${escapeHtml(arg)}”. Scrivi /edizioni per l’elenco.`;

export const HELP_TEXT =
  `🤖 <b>Comandi per tutte le edizioni</b>\n\n` +
  `▪️ /edizioni — elenco delle edizioni e del loro stato\n` +
  `▪️ /stats &lt;edizione&gt; — ordini, biglietti e incasso (es. /stats zuccaland-2026)\n` +
  `▪️ /ordini &lt;edizione&gt; — ultimi 10 ordini pagati, solo codici e importi\n` +
  `▪️ /oggi [edizione] — la giornata di oggi: online, cassa per cassa e metodo, ingressi, posti\n` +
  `▪️ /stato — stato del sito: database, pulizia notturna, bot, configurazione, versione`;

/** Risposta a un comando generico, in HTML per Telegram. */
export async function answerCommand(parsed: ParsedCommand): Promise<string> {
  const { cmd, arg } = parsed;
  if (cmd === '/aiuto') return HELP_TEXT;
  if (cmd === '/stato') return healthMessage(await checkHealth());
  const rows = await visibleEditions();

  if (cmd === '/oggi') {
    // Senza argomento: l'edizione in corso, altrimenti la prossima che vende.
    const edition = arg ? matchEdition(rows, arg) : (await runningEditions())[0];
    if (!edition) return arg ? NOT_FOUND(arg) : 'ℹ️ Nessuna edizione in corso o in vendita. Scrivi /oggi &lt;edizione&gt;.';
    return todayReport(edition);
  }

  if (cmd === '/edizioni') {
    if (!rows.length) return 'ℹ️ Nessuna edizione pubblicata.';
    const sorted = [...rows].sort((a, b) => (b.startsAt?.getTime() ?? 0) - (a.startsAt?.getTime() ?? 0));
    return `📅 <b>Edizioni</b>\n\n${sorted.map((r) => `▪️ <b>${escapeHtml(r.title)}</b> · ${EDITION_STATUS_LABELS[r.status as keyof typeof EDITION_STATUS_LABELS] ?? r.status}\n   <code>${r.slug}</code>`).join('\n')}`;
  }

  const edition = matchEdition(rows, arg);
  if (!edition) return NOT_FOUND(arg);

  if (cmd === '/stats') {
    const s = await editionStats(edition.id);
    const products = s.byProduct.slice(0, 8).map((p) => `▪️ ${escapeHtml(p.name)}: ${p.quantity}`).join('\n') || '<i>Nessuna vendita</i>';
    const sessions = s.bySession.map((x) => `▪️ ${escapeHtml(x.label)}: ${x.sold}${x.capacity ? `/${x.capacity}` : ''} · ingressi ${x.checkins}`).join('\n');
    return (
      `📊 <b>${escapeHtml(edition.title)}</b>\n\n` +
      `📦 Ordini pagati: <b>${s.totals.orders}</b>\n🎟 Biglietti: <b>${s.totals.tickets}</b>\n` +
      `💰 Incasso: <b>${formatMoney(s.totals.grossCents)}</b>${s.totals.refundedCents ? ` (rimborsati ${formatMoney(s.totals.refundedCents)})` : ''}\n` +
      `✅ Ingressi: <b>${s.totals.checkins}</b>\n\n<b>Prodotti</b>\n${products}` +
      (sessions ? `\n\n<b>Date</b>\n${sessions}` : '') +
      `\n\n<i>Solo gli ordini del sistema nuovo.</i>`
    );
  }

  // /ordini
  const db = getDb();
  const orders = await db
    .select({ id: ordersV2.id, code: ordersV2.code, totalCents: ordersV2.totalCents, channel: ordersV2.channel, paidAt: ordersV2.paidAt, createdAt: ordersV2.createdAt })
    .from(ordersV2)
    .where(and(eq(ordersV2.editionId, edition.id), inArray(ordersV2.status, [...SOLD_STATUSES]), isNull(ordersV2.deletedAt)))
    .orderBy(desc(ordersV2.paidAt))
    .limit(10);
  if (!orders.length) return `ℹ️ Nessun ordine pagato per ${escapeHtml(edition.title)}.`;
  const tickets = await db
    .select({ orderId: ticketsV2.orderId, n: count() })
    .from(ticketsV2)
    .where(and(inArray(ticketsV2.orderId, orders.map((o) => o.id)), ne(ticketsV2.status, 'void')))
    .groupBy(ticketsV2.orderId);
  const lines = orders.map((o, i) => {
    const n = tickets.find((t) => t.orderId === o.id)?.n ?? 0;
    return `<b>${i + 1}. ${o.code}</b> · ${formatDateTime(o.paidAt ?? o.createdAt)}\n   ${formatMoney(o.totalCents)} · ${n} ${n === 1 ? 'biglietto' : 'biglietti'} · ${o.channel}`;
  });
  return `📦 <b>Ultimi ordini · ${escapeHtml(edition.title)}</b>\n\n${lines.join('\n')}`;
}
