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
