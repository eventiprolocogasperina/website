// Tutte le date mostrate all'utente sono nel fuso Europe/Rome, qualunque sia il fuso del server.

export const TIME_ZONE = 'Europe/Rome';

type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Data non valida: ${String(input)}`);
  return date;
}

const shortDate = new Intl.DateTimeFormat('it-IT', {
  timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
});
const longDate = new Intl.DateTimeFormat('it-IT', {
  timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const time = new Intl.DateTimeFormat('it-IT', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const relative = new Intl.RelativeTimeFormat('it-IT', { numeric: 'auto' });

// Intl mette il punto nelle abbreviazioni ("dom", "ott" restano senza, ma alcuni runtime aggiungono "."):
// le togliamo per avere sempre "dom 25 ott 2026".
const stripDots = (s: string) => s.replace(/\./g, '').replace(/,/g, '');

/** "domenica 25 ottobre 2026" (style 'long', default) oppure "dom 25 ott 2026" (style 'short'). */
export function formatDate(input: DateInput, style: 'long' | 'short' = 'long'): string {
  const date = toDate(input);
  return style === 'short' ? stripDots(shortDate.format(date)) : longDate.format(date).replace(/,/g, '');
}

/** "dom 25 ott 2026, 10:30" */
export function formatDateTime(input: DateInput): string {
  const date = toDate(input);
  return `${formatDate(date, 'short')}, ${time.format(date)}`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "3 minuti fa", "tra 2 giorni", "ora". */
export function formatRelative(input: DateInput, now: DateInput = new Date()): string {
  const seconds = Math.round((toDate(input).getTime() - toDate(now).getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.trunc(seconds / size), unit);
  }
  return 'ora';
}

/** Data di calendario "YYYY-MM-DD" a Roma, utile per confrontare giorni di evento. */
export function romeDateKey(input: DateInput): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(toDate(input));
  return parts;
}
