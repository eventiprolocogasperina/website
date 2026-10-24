// Funzioni pure della panoramica: la prossima azione suggerita e i giorni di vendita.
import { addDaysToKey } from '@/lib/dates';
import type { ClosingChecklist } from '@/server/domain/editions/closing';
import type { EditionStatus } from '@/server/domain/editions/types';

export type NextAction = { text: string; href: string; cta: string };
type Day = { day: string; orders: number; cents: number };

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

/** Cosa fare adesso, dato lo stato. Funzione pura. */
export function nextAction(slug: string, status: EditionStatus, closing: Pick<ClosingChecklist, 'items' | 'complete'> | null): NextAction | null {
  const base = `/admin/e/${slug}`;
  switch (status) {
    case 'draft':
      return { text: 'L’edizione è in bozza: controlla date e catalogo, poi pubblicala.', href: `${base}/impostazioni`, cta: 'Vai allo stato' };
    case 'published':
      return { text: 'L’edizione è visibile ma non vende: apri le vendite quando il catalogo è pronto.', href: `${base}/impostazioni`, cta: 'Apri le vendite' };
    case 'on_sale':
      return { text: 'Le vendite sono aperte. Il giorno dell’evento segna l’edizione come in corso.', href: `${base}/ordini`, cta: 'Vedi gli ordini' };
    case 'sold_out':
      return { text: 'I posti online sono finiti. Se aggiungi posti o si libera un ordine, la vendita riapre da sola.', href: `${base}/date`, cta: 'Vedi le date' };
    case 'live':
      return { text: 'L’edizione è in corso. A fine evento dichiarala conclusa per aprire la checklist di chiusura.', href: `${base}/check-in`, cta: 'Check-in' };
    case 'suspended':
      return { text: 'L’edizione è sospesa: riprendila o dichiarala conclusa.', href: `${base}/impostazioni`, cta: 'Vai allo stato' };
    case 'concluded': {
      const left = closing ? closing.items.filter((i) => !i.ok && !i.skipped).length : 0;
      return closing?.complete
        ? { text: 'La checklist di chiusura è completa: puoi archiviare l’edizione.', href: `${base}/impostazioni`, cta: 'Archivia' }
        : { text: `Completa la checklist di chiusura: ${plural(left, 'controllo mancante', 'controlli mancanti')}.`, href: `${base}/impostazioni`, cta: 'Apri la checklist' };
    }
    default:
      return null;
  }
}

export function lastDays(byDay: Day[], today: string, n = 14): Day[] {
  return Array.from({ length: n }, (_, i) => {
    const day = addDaysToKey(today, i - n + 1);
    return byDay.find((d) => d.day === day) ?? { day, orders: 0, cents: 0 };
  });
}

