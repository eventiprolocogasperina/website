import { describe, expect, it } from 'vitest';
import { answerCount, effectiveSession, incrementAnswer, listAcceptsProduct, offlineScanTime, quarterHours, sessionGraph, sessionMatches } from './rules';

const graph = sessionGraph([
  { id: 'sab10', label: 'Sab 10 ott', status: 'postponed', rescheduledToSessionId: 'sab17' },
  { id: 'sab17', label: 'Sab 17 ott', status: 'postponed', rescheduledToSessionId: 'sab24' },
  { id: 'sab24', label: 'Sab 24 ott', status: 'open', rescheduledToSessionId: null },
  { id: 'dom25', label: 'Dom 25 ott', status: 'open', rescheduledToSessionId: null },
  { id: 'loop', label: 'Ciclo', status: 'postponed', rescheduledToSessionId: 'loop' },
]);

describe('date rinviate', () => {
  it('segue la data di recupero, anche dopo due rinvii', () => {
    expect(effectiveSession(graph, 'sab10')).toBe('sab24');
    expect(effectiveSession(graph, 'dom25')).toBe('dom25');
    expect(effectiveSession(graph, null)).toBeNull();
    expect(effectiveSession(graph, 'sconosciuta')).toBe('sconosciuta');
    expect(effectiveSession(graph, 'loop')).toBe('loop');
  });

  it('un biglietto della data rinviata vale alla data di recupero, non in un’altra', () => {
    expect(sessionMatches(graph, 'sab10', 'sab24')).toBe(true);
    expect(sessionMatches(graph, 'sab10', 'sab10')).toBe(true);
    expect(sessionMatches(graph, 'sab10', 'dom25')).toBe(false);
    expect(sessionMatches(graph, 'dom25', 'sab24')).toBe(false);
    expect(sessionMatches(graph, null, 'sab24')).toBe(true);
    expect(sessionMatches(graph, 'dom25', null)).toBe(true);
  });
});

describe('liste', () => {
  it('senza prodotti accetta tutto', () => {
    expect(listAcceptsProduct({ productIds: [] }, 'x')).toBe(true);
    expect(listAcceptsProduct({ productIds: ['a'] }, 'x')).toBe(false);
  });
});

describe('azioni dello scanner', () => {
  it('somma ai numeri e alle risposte migrate', () => {
    expect(incrementAnswer(undefined, 'bambini', 1)).toEqual({ ok: true, stored: 1, before: 0, after: 1 });
    expect(incrementAnswer(2, 'bambini', 1)).toMatchObject({ stored: 3 });
    expect(incrementAnswer('4', 'bambini', 1)).toMatchObject({ stored: 5 });
    expect(incrementAnswer({ bambini: 2, iscritti: 5 }, 'bambini', 1)).toMatchObject({ stored: { bambini: 3, iscritti: 5 }, before: 2, after: 3 });
    expect(incrementAnswer({ iscritti: 5 }, 'bambini', 1)).toMatchObject({ stored: { iscritti: 5, bambini: 1 } });
  });

  it('rifiuta testi e valori sotto zero', () => {
    expect(incrementAnswer('tanti', 'bambini', 1).ok).toBe(false);
    expect(incrementAnswer(['a'], 'bambini', 1).ok).toBe(false);
    expect(incrementAnswer(0, 'bambini', -1)).toEqual({ ok: false, error: 'Il conteggio non può scendere sotto zero.' });
    expect(incrementAnswer({ bambini: 'x' }, 'bambini', 1).ok).toBe(false);
  });

  it('legge il conteggio nei due formati', () => {
    expect(answerCount(3, 'bambini')).toBe(3);
    expect(answerCount({ bambini: 2 }, 'bambini')).toBe(2);
    expect(answerCount('nulla', 'bambini')).toBeNull();
  });
});

describe('offline e grafico', () => {
  it('accetta l’orario del telefono solo se plausibile', () => {
    const now = new Date('2026-10-25T10:00:00Z');
    expect(offlineScanTime(new Date('2026-10-25T09:30:00Z'), now).toISOString()).toBe('2026-10-25T09:30:00.000Z');
    expect(offlineScanTime(new Date('2026-10-20T09:30:00Z'), now)).toBe(now);
    expect(offlineScanTime(new Date('2026-10-25T11:00:00Z'), now)).toBe(now);
    expect(offlineScanTime(null, now)).toBe(now);
  });

  it('riempie i quarti d’ora vuoti', () => {
    const q = quarterHours([
      { start: new Date('2026-10-25T09:45:00Z'), count: 1 },
      { start: new Date('2026-10-25T09:00:00Z'), count: 2 },
    ]);
    expect(q.map((x) => [x.start.toISOString().slice(11, 16), x.count])).toEqual([
      ['09:00', 2],
      ['09:15', 0],
      ['09:30', 0],
      ['09:45', 1],
    ]);
    expect(quarterHours([])).toEqual([]);
  });
});
