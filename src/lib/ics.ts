// File .ics ("Aggiungi al calendario"), RFC 5545. Funzione pura.

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escapeText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Le righe oltre 75 byte vanno spezzate e continuate con uno spazio. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, 'utf8') > 75) {
    let n = 75;
    while (Buffer.byteLength(rest.slice(0, n), 'utf8') > 75) n--;
    out.push(rest.slice(0, n));
    rest = ` ${rest.slice(n)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

export function icsEvent(e: { uid: string; title: string; start: Date; end?: Date | null; location?: string | null; description?: string | null; url?: string | null; now?: Date }): string {
  const end = e.end && e.end > e.start ? e.end : new Date(e.start.getTime() + 3 * 3600_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pro Loco Gasperina//Biglietti//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(e.now ?? new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(e.title)}`,
    e.location ? `LOCATION:${escapeText(e.location)}` : null,
    e.description ? `DESCRIPTION:${escapeText(e.description)}` : null,
    e.url ? `URL:${e.url}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((l): l is string => l !== null);
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
