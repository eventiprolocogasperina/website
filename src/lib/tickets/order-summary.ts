// Righe di riepilogo dell'ordine per il PDF dei biglietti e l'email di conferma (ordini v2): codice
// sconto con l'importo scontato e totale (pagato). Valori letti dall'ordine sul server. Funzione pura.
import { formatMoney } from '@/lib/money';

export type OrderSummaryInput = { status: string; totalCents: number; discountCents: number; discountCode: string | null };
export type OrderSummary = { discountLabel: string | null; totalTitle: string; totalLabel: string };

const PAID = ['paid', 'partially_refunded', 'refunded'];

export function orderSummary(o: OrderSummaryInput): OrderSummary {
  const discountLabel = o.discountCents > 0 ? `${o.discountCode ? `Codice ${o.discountCode}` : 'Sconto'}: −${formatMoney(o.discountCents)}` : null;
  return { discountLabel, totalTitle: PAID.includes(o.status) ? 'Totale pagato' : 'Totale', totalLabel: formatMoney(o.totalCents) };
}
