import { describe, expect, it } from 'vitest';
import { icsEvent } from './ics';

describe('icsEvent', () => {
  const base = { uid: 'ZC26-7F3K@prolocogasperina.it', title: 'Zuccaland 2026, sab 17 ott', start: new Date('2026-10-17T13:00:00Z'), now: new Date('2026-10-01T10:00:00Z') };

  it('scrive un evento valido in UTC, con testo protetto', () => {
    const ics = icsEvent({ ...base, location: 'Gasperina (CZ); piazza', end: new Date('2026-10-17T18:00:00Z') });
    expect(ics).toContain('DTSTART:20261017T130000Z\r\n');
    expect(ics).toContain('DTEND:20261017T180000Z\r\n');
    expect(ics).toContain('SUMMARY:Zuccaland 2026\\, sab 17 ott\r\n');
    expect(ics).toContain('LOCATION:Gasperina (CZ)\; piazza\r\n');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('senza fine usa tre ore e spezza le righe lunghe', () => {
    const ics = icsEvent({ ...base, description: 'à'.repeat(100) });
    expect(ics).toContain('DTEND:20261017T160000Z');
    for (const line of ics.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
  });
});
