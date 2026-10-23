// Come si mostra un esito dello scanner (§12.3): colore, titolo grande e righe sotto. Senza React,
// così si prova con i test unitari.
import { formatMoney } from '@/lib/money';
import type { Outcome } from './types';

export type Tone = 'success' | 'warning' | 'danger';
export type Presented = { tone: Tone; title: string; lines: string[] };

/** "2× Intero, 1× You-Pick Lab" (nell'ordine in cui compaiono). */
export function summarize(names: string[]): string {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts].map(([n, c]) => `${c}× ${n}`).join(', ');
}

/** Perché un biglietto dell'ordine non si può spuntare. */
export function stateReason(t: { state: string; at?: string; by?: string | null; validOn?: string | null; sessionLabel?: string | null }): string | null {
  switch (t.state) {
    case 'ready':
      return null;
    case 'already_used':
      return t.at ? `Già entrato alle ${time(t.at)}${t.by ? ` (${t.by})` : ''}` : 'Già entrato';
    case 'wrong_session':
      return `Vale un altro giorno: ${t.validOn ?? t.sessionLabel ?? '—'}`;
    case 'wrong_list':
      return 'Non entra da questa lista';
    default:
      return 'Annullato o rimborsato';
  }
}

const SKIPPED: Record<string, string> = { already_used: 'già entrato da un altro telefono', wrong_session: 'altra data', wrong_list: 'lista sbagliata', void: 'annullato', blocked: 'ordine bloccato', to_pay: 'da pagare' };

const time = (iso: string) => new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(iso));

/** `canCollect`: chi usa lo scanner può incassare gli ordini "Paga in loco" (checkin.collect_payment). */
export function present(outcome: Outcome, opts: { canCollect?: boolean } = {}): Presented {
  if (outcome.source === 'offline') {
    const r = outcome.data;
    switch (r.result) {
      case 'valid':
        return { tone: 'success', title: 'VALIDO', lines: ['Offline: l’ingresso si registra quando torna la rete.'] };
      case 'already_used':
        return { tone: 'warning', title: 'GIÀ ENTRATO', lines: ['Offline: risulta già entrato.'] };
      case 'wrong_session':
        return { tone: 'warning', title: `ALTRA DATA: ${r.validOn ?? '—'}`, lines: ['Offline: il biglietto vale in un altro giorno.'] };
      case 'order':
        return { tone: 'success', title: 'CONFERMA INGRESSO', lines: ['Offline: scegli chi entra.'] };
      case 'entered':
        return { tone: 'success', title: r.count === 1 ? 'VALIDO' : `ENTRANO IN ${r.count}`, lines: [summarize(r.products), 'Offline: gli ingressi si registrano quando torna la rete.'] };
      case 'no_manifest':
        return { tone: 'danger', title: 'NESSUNA RETE', lines: ['Non c’è l’elenco offline: scaricalo quando torna la connessione.'] };
      default:
        return { tone: 'danger', title: 'NON TROVATO', lines: ['Offline: il biglietto non è nell’elenco scaricato. Ricontrollalo quando torna la rete.'] };
    }
  }

  const r = outcome.data;
  if (r.result === 'unknown') return { tone: 'danger', title: 'NON VALIDO', lines: ['QR sconosciuto o di un altro evento.'] };
  if (r.result === 'entered') {
    const t = r.ticket;
    const done = new Set(r.entered.map((e) => e.ticketId));
    const names = r.tickets.filter((x) => done.has(x.id)).map((x) => x.productName);
    const skipped = r.skipped.map((x) => {
      const name = r.tickets.find((y) => y.id === x.ticketId)?.productName ?? 'Biglietto';
      return `Non entrato: ${name}, ${SKIPPED[x.result] ?? 'non valido'}.`;
    });
    const head = [t.holderName, `Ordine ${t.orderCode}`].filter(Boolean) as string[];
    if (!r.entered.length) return { tone: 'warning', title: 'NESSUNO ENTRATO', lines: [...head, ...skipped] };
    return { tone: 'success', title: r.entered.length === 1 ? 'VALIDO' : `ENTRANO IN ${r.entered.length}`, lines: [...head, summarize(names), ...skipped] };
  }
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
    case 'order':
      return { tone: 'success', title: 'CONFERMA INGRESSO', lines: who };
    case 'to_pay':
      return {
        tone: 'warning',
        title: `DA PAGARE: ${formatMoney(r.dueCents)}`,
        lines: [...who, opts.canCollect ? 'Paga in loco: incassa qui sotto, poi entra.' : 'Da pagare in cassa: entra solo dopo aver pagato.'],
      };
  }
}
