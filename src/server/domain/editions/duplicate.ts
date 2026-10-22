// Duplicazione di un'edizione: le date si spostano di N anni restando nello stesso giorno della
// settimana (Zuccaland di sabato e domenica resta di sabato e domenica). Funzioni pure.
import { addDaysToKey, romeDateKey, romeDateTime, romeTime } from '@/lib/dates';

/** Giorni da aggiungere per andare avanti di `years` anni restando nello stesso giorno della settimana. */
export function weekdayPreservingShift(dateKey: string, years: number): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const from = Date.UTC(y, m - 1, d);
  // 29 febbraio → 28 febbraio negli anni non bisestili.
  const target = new Date(Date.UTC(y + years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) target.setUTCDate(0);
  const days = Math.round((target.getTime() - from) / 86_400_000);
  return Math.round(days / 7) * 7;
}

/** Sposta un istante di `days` giorni mantenendo l'ora locale di Roma (anche a cavallo dell'ora legale). */
export function shiftInstant(instant: Date, days: number): Date {
  return romeDateTime(addDaysToKey(romeDateKey(instant), days), romeTime(instant));
}

export type DuplicableSession = { id: string; label: string; startsAt: Date; endsAt: Date | null };

/** Data e ora delle sessioni copiate; l'etichetta si aggiorna se conteneva il giorno ("Dom 25 ott"). */
export function shiftSession<S extends DuplicableSession>(session: S, days: number): S {
  const startsAt = shiftInstant(session.startsAt, days);
  return { ...session, startsAt, endsAt: session.endsAt ? shiftInstant(session.endsAt, days) : null, label: relabel(session.label, session.startsAt, startsAt) };
}

const shortDay = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', day: 'numeric', month: 'short' });
const longDay = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long' });

function relabel(label: string, before: Date, after: Date): string {
  for (const f of [longDay, shortDay]) {
    const old = f.format(before).replace(/\./g, '');
    if (label.toLowerCase().includes(old.toLowerCase())) {
      const fresh = f.format(after).replace(/\./g, '');
      const at = label.toLowerCase().indexOf(old.toLowerCase());
      const replacement = label[at] === label[at].toUpperCase() ? fresh.charAt(0).toUpperCase() + fresh.slice(1) : fresh;
      return label.slice(0, at) + replacement + label.slice(at + old.length);
    }
  }
  return label;
}

/** "Zuccaland 2026" → "Zuccaland 2027"; "zuccaland-2026" → "zuccaland-2027". */
export function bumpYear(text: string, from: number | null, to: number): string {
  if (from && text.includes(String(from))) return text.split(String(from)).join(String(to));
  return text;
}

/**
 * Sostituisce in profondità ogni stringa che è un ID copiato (date, prodotti, casse, liste) con l'ID
 * della copia: impostazioni dei moduli e blocchi della pagina puntano così alla nuova edizione.
 */
export function remapIds<T>(value: T, map: ReadonlyMap<string, string>): T {
  if (typeof value === 'string') return (map.get(value) ?? value) as T;
  if (Array.isArray(value)) return value.map((v) => remapIds(v, map)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remapIds(v, map)])) as T;
  return value;
}

const HERO_TEXT = ['badge', 'title', 'subtitle'] as const;

/**
 * Blocchi della pagina per la copia: l'anno nei testi della copertina passa al nuovo, il conto alla
 * rovescia si sposta come le date. Il resto (programma, numeri dell'anno scorso…) resta da rivedere.
 */
export function prepareCopiedBlocks(blocks: unknown, opts: { fromYear: number | null; toYear: number; days: number }): unknown[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b) => {
    if (!b || typeof b !== 'object') return b;
    const block = b as { type?: unknown; props?: Record<string, unknown> };
    if (!block.props || typeof block.props !== 'object') return b;
    const props = { ...block.props };
    if (block.type === 'Hero') {
      for (const k of HERO_TEXT) if (typeof props[k] === 'string') props[k] = bumpYear(props[k] as string, opts.fromYear, opts.toYear);
    }
    if (block.type === 'Countdown' && typeof props.target === 'string') {
      const m = (props.target as string).match(/^(\d{4}-\d{2}-\d{2})(.*)$/);
      if (m) props.target = addDaysToKey(m[1], opts.days) + m[2];
    }
    return { ...block, props };
  });
}
