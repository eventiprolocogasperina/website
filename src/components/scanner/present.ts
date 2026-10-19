// Come si mostra un esito dello scanner (§12.3): colore, titolo grande e righe sotto. Senza React,
// così si prova con i test unitari.
import type { Outcome } from './types';

export type Tone = 'success' | 'warning' | 'danger';
export type Presented = { tone: Tone; title: string; lines: string[] };

const time = (iso: string) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(iso));

export function present(outcome: Outcome): Presented {
  if (outcome.source === 'offline') {
    const r = outcome.data;
    switch (r.result) {
      case 'valid':
        return { tone: 'success', title: 'VALIDO', lines: ['Offline: l’ingresso si registra quando torna la rete.'] };
      case 'already_used':
        return { tone: 'warning', title: 'GIÀ ENTRATO', lines: ['Offline: risulta già entrato.'] };
      case 'wrong_session':
        return { tone: 'warning', title: `ALTRA DATA: ${r.validOn ?? '—'}`, lines: ['Offline: il biglietto vale in un altro giorno.'] };
      case 'no_manifest':
        return { tone: 'danger', title: 'NESSUNA RETE', lines: ['Non c’è l’elenco offline: scaricalo quando torna la connessione.'] };
      default:
        return { tone: 'danger', title: 'NON TROVATO', lines: ['Offline: il biglietto non è nell’elenco scaricato. Ricontrollalo quando torna la rete.'] };
    }
  }

  const r = outcome.data;
  if (r.result === 'unknown') return { tone: 'danger', title: 'NON VALIDO', lines: ['QR sconosciuto o di un altro evento.'] };
  const t = r.ticket;
  const who = [t.holderName, `${t.productName}${t.validOn ? ` · ${t.validOn}` : ''}`, `Ordine ${t.orderCode}`].filter(Boolean) as string[];
  const moved = t.sessionLabel && t.validOn && t.sessionLabel !== t.validOn ? [`Biglietto del ${t.sessionLabel}, data rinviata: vale oggi.`] : [];
  switch (r.result) {
    case 'valid':
      return { tone: 'success', title: 'VALIDO', lines: [...who, ...moved] };
    case 'already_used':
      return { tone: 'warning', title: `GIÀ ENTRATO alle ${time(r.at)}`, lines: [...(r.by ? [`Da ${r.by}`] : []), ...who] };
    case 'wrong_session':
      return { tone: 'warning', title: `ALTRA DATA: ${t.validOn ?? t.sessionLabel ?? '—'}`, lines: who };
    case 'wrong_list':
      return { tone: 'danger', title: 'LISTA SBAGLIATA', lines: [`${t.productName}: non entra da questa lista.`, ...who.slice(0, 1)] };
    case 'blocked':
      return { tone: 'danger', title: 'BLOCCATO', lines: ['Ordine in blacklist: ingresso non consentito. Chiama un responsabile.', `Ordine ${t.orderCode}`] };
    case 'void':
      return { tone: 'danger', title: 'ANNULLATO', lines: ['Biglietto annullato, rimborsato o non pagato.', ...who] };
  }
}
