// Esportazione delle statistiche in un CSV a sezioni (una tabella dopo l'altra), per Excel.
import { csvMoney, toCsv, type CsvCell } from '@/lib/csv';
import { formatDateTime } from '@/lib/dates';
import type { EditionStats } from './index';

const CHANNEL: Record<string, string> = { online: 'Online', pos: 'Cassa', paylink: 'Link di pagamento', invite: 'Invito', admin: 'Admin' };
const METHOD: Record<string, string> = { nexi: 'Carta online (Nexi)', cash: 'Contanti', card_pos: 'Carta in cassa', complimentary: 'Omaggio', bank_transfer: 'Bonifico' };
export const channelLabel = (c: string) => CHANNEL[c] ?? c;
export const methodLabel = (m: string) => METHOD[m] ?? m;

/** Una sola tabella a 4 colonne: sezione, voce, quantità, importo. Si filtra bene in Excel. `extra`: righe in coda (rendiconto). */
export function statsCsv(stats: EditionStats, extra: CsvCell[][] = []): string {
  const rows: CsvCell[][] = [];
  const t = stats.totals;
  rows.push(
    ['Totali', 'Ordini', t.orders, null],
    ['Totali', 'Biglietti', t.tickets, null],
    ['Totali', 'Incasso lordo', null, csvMoney(t.grossCents)],
    ['Totali', 'Rimborsi pagati', null, csvMoney(t.refundedCents)],
    ['Totali', 'Incasso netto', null, csvMoney(t.netCents)],
    ['Totali', 'Ingressi registrati', t.checkins, null],
  );
  for (const c of stats.byChannel) rows.push(['Canale', channelLabel(c.channel), c.orders, csvMoney(c.cents)]);
  for (const m of stats.byMethod) rows.push(['Metodo di pagamento', methodLabel(m.method), null, csvMoney(m.cents)]);
  for (const p of stats.byProduct) rows.push(['Prodotto', p.name, p.quantity, csvMoney(p.cents)]);
  for (const s of stats.bySession) rows.push(['Data', `${s.label} (${formatDateTime(s.startsAt)})`, s.sold, null], ['Ingressi per data', s.label, s.checkins, null]);
  for (const d of stats.byDay) rows.push(['Giorno', d.day, d.orders, csvMoney(d.cents)]);
  for (const h of stats.byHour) rows.push(['Ora', `${String(h.hour).padStart(2, '0')}:00`, h.orders, csvMoney(h.cents)]);
  for (const h of stats.cashByHour) rows.push(['Cassa per ora', `${String(h.hour).padStart(2, '0')}:00`, h.orders, csvMoney(h.cents)]);
  for (const d of stats.cashByDepartment) rows.push(['Cassa per reparto', d.department, d.quantity, csvMoney(d.cents)]);
  return toCsv(['Sezione', 'Voce', 'Quantità', 'Importo (€)'], [...rows, ...extra]);
}
