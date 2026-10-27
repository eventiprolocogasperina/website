// Testi delle notifiche Telegram e comandi del bot: nessun dato personale, comandi di oggi intatti.
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { amountMismatchMessage, capacityMessage, cashDifferenceMessage, crossedThresholds, escapeHtml, orderPaidMessage, refundRequestedMessage } = await import('./messages');
const { isGenericCommand, matchEdition, parseCommand } = await import('./bot');

describe('messaggi Telegram', () => {
  it('date quasi piene: ogni soglia si annuncia una volta sola', () => {
    expect(crossedThresholds(79, 2, 100)).toEqual([]);
    expect(crossedThresholds(80, 2, 100)).toEqual([0.8]);
    expect(crossedThresholds(82, 2, 100)).toEqual([]);
    expect(crossedThresholds(100, 25, 100)).toEqual([1]);
    expect(crossedThresholds(5, 0, 100)).toEqual([]);
    expect(capacityMessage({ edition: 'E', session: 'Sab', used: 100, capacity: 100, threshold: 1 })).toContain('Tutto esaurito');
    expect(capacityMessage({ edition: 'E', session: 'Sab', used: 81, capacity: 100, threshold: 0.8 })).toContain('liberi 19');
  });
  it('nuovo ordine: codice, quantità, importo e canale', () => {
    const m = orderPaidMessage({ code: 'ZK26-7F3K', edition: 'Zuccaland <2026>', totalCents: 1500, tickets: 3, channel: 'online' });
    expect(m).toContain('ZK26-7F3K');
    expect(m).toContain('3 biglietti');
    expect(m).toMatch(/15,00\s€/);
    expect(m).toContain('Zuccaland &lt;2026&gt;');
  });
  it('importo diverso, rimborso e differenza di cassa', () => {
    expect(amountMismatchMessage({ code: 'A-1', edition: 'E', paidCents: 900, totalCents: 1000 })).toMatch(/9,00\s€[\s\S]*10,00\s€/);
    expect(refundRequestedMessage({ code: 'A-1', edition: 'E', amountCents: 500 })).toContain('A-1');
    expect(cashDifferenceMessage({ edition: 'E', registerName: 'Bar', zReportNumber: 4, expectedCashCents: 10000, countedCashCents: 9850, differenceCents: -150 })).toMatch(/−1,50\s€/);
    expect(cashDifferenceMessage({ edition: 'E', registerName: 'Bar', zReportNumber: 4, expectedCashCents: 100, countedCashCents: 300, differenceCents: 200 })).toMatch(/\+2,00\s€/);
  });
  it('escape dell’HTML del bot', () => expect(escapeHtml('a & <b>')).toBe('a &amp; &lt;b&gt;'));
});

describe('comandi del bot', () => {
  it('i comandi di oggi restano a chi li gestiva', () => {
    for (const t of ['/stats', '/stats zuccaland', '/statszuccaland', '/zuccalandperdata', '/ordini', '/ordinizuccaland', '/start', '/help']) {
      expect(isGenericCommand(parseCommand(t)), t).toBe(false);
    }
  });
  it('i comandi generici', () => {
    for (const t of ['/edizioni', '/aiuto', '/stats assaggia-e-passeggia-2026', '/ordini zuccaland-2026', '/stats@ProlocoBot a&p']) {
      expect(isGenericCommand(parseCommand(t)), t).toBe(true);
    }
    expect(parseCommand('/Stats@Bot  Zuccaland 2026')).toEqual({ cmd: '/stats', arg: 'zuccaland 2026' });
  });
  it('trova l’edizione per slug o per parte del nome, la più recente prima', () => {
    const rows = [
      { id: '1', slug: 'zuccaland-2025', title: 'Zuccaland 2025', status: 'archived', startsAt: new Date('2025-10-10') },
      { id: '2', slug: 'zuccaland-2026', title: 'Zuccaland 2026', status: 'on_sale', startsAt: new Date('2026-10-10') },
      { id: '3', slug: 'assaggia-e-passeggia-2026', title: 'Assaggia e Passeggia 2026', status: 'concluded', startsAt: new Date('2026-08-01') },
    ];
    expect(matchEdition(rows, 'zuccaland-2025')?.id).toBe('1');
    expect(matchEdition(rows, 'zuccaland')?.id).toBe('2');
    expect(matchEdition(rows, 'assaggia')?.id).toBe('3');
    expect(matchEdition(rows, 'baguette')).toBeNull();
  });
});
