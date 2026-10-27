// Testi delle notifiche Telegram (prompt 18). Funzioni pure, testate a parte. Ricevono solo codici,
// quantità, importi e nomi di edizioni o casse: mai nome, email o telefono di un cliente (§18.11).
import { formatMoney } from '@/lib/money';

/** Il bot scrive in HTML: i titoli delle edizioni vanno protetti. */
export const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

const CHANNEL_LABELS: Record<string, string> = { online: 'online', paylink: 'link di pagamento', invite: 'invito', admin: 'admin', pos: 'cassa' };

export function orderPaidMessage(p: { code: string; edition: string; totalCents: number; tickets: number; channel: string }): string {
  const what = p.tickets === 1 ? '1 biglietto' : `${p.tickets} biglietti`;
  return `🎟 <b>Nuovo ordine ${escapeHtml(p.code)}</b> · ${escapeHtml(p.edition)}\n${what} · ${formatMoney(p.totalCents)} · ${CHANNEL_LABELS[p.channel] ?? p.channel}`;
}

export function paymentFailedMessage(p: { code: string; edition: string; amountCents: number }): string {
  return `❌ <b>Pagamento non riuscito</b> · ordine ${escapeHtml(p.code)} (${escapeHtml(p.edition)}), ${formatMoney(p.amountCents)}.`;
}

export function amountMismatchMessage(p: { code: string; edition: string; paidCents: number; totalCents: number }): string {
  return (
    `⚠️ <b>Importo diverso dal totale</b> · ordine ${escapeHtml(p.code)} (${escapeHtml(p.edition)})\n` +
    `Pagati ${formatMoney(p.paidCents)}, totale ${formatMoney(p.totalCents)}. L'ordine NON è stato segnato come pagato: controllalo nell'admin.`
  );
}

export function refundRequestedMessage(p: { code: string; edition: string; amountCents: number }): string {
  return `↩️ <b>Richiesta di rimborso</b> · ordine ${escapeHtml(p.code)} (${escapeHtml(p.edition)}), ${formatMoney(p.amountCents)}.`;
}

export function cashDifferenceMessage(p: { edition: string; registerName: string; zReportNumber: number; expectedCashCents: number; countedCashCents: number; differenceCents: number }): string {
  const sign = p.differenceCents > 0 ? '+' : '−';
  return (
    `💶 <b>Turno chiuso con differenza</b> · ${escapeHtml(p.registerName)} (${escapeHtml(p.edition)}), Z n. ${p.zReportNumber}\n` +
    `Atteso ${formatMoney(p.expectedCashCents)}, contato ${formatMoney(p.countedCashCents)}: ${sign}${formatMoney(Math.abs(p.differenceCents))}.`
  );
}

export const CAPACITY_THRESHOLDS = [0.8, 1] as const;

/**
 * Soglia di riempimento superata da questo ordine, per data: 80% e tutto esaurito. Confronta i posti
 * usati prima e dopo i biglietti dell'ordine, così ogni soglia si annuncia una volta sola.
 */
export function crossedThresholds(used: number, added: number, capacity: number): number[] {
  if (capacity <= 0 || added <= 0) return [];
  const before = used - added;
  // Se un ordine le supera tutte e due insieme basta "tutto esaurito".
  return CAPACITY_THRESHOLDS.filter((t) => before < Math.ceil(capacity * t) && used >= Math.ceil(capacity * t)).slice(-1);
}

export function capacityMessage(p: { edition: string; session: string; used: number; capacity: number; threshold: number }): string {
  return p.threshold >= 1
    ? `🔴 <b>Tutto esaurito</b> · ${escapeHtml(p.session)} (${escapeHtml(p.edition)}): ${p.used}/${p.capacity} posti.`
    : `🟠 <b>Data quasi piena</b> · ${escapeHtml(p.session)} (${escapeHtml(p.edition)}): ${p.used}/${p.capacity} posti, liberi ${Math.max(p.capacity - p.used, 0)}.`;
}
