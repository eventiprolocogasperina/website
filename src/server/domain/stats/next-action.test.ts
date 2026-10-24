import { describe, expect, it } from 'vitest';
import { lastDays, nextAction } from './next-action';

describe('panoramica', () => {
  it('riempie i giorni senza vendite', () => {
    const d = lastDays([{ day: '2026-10-18', orders: 3, cents: 1500 }], '2026-10-19', 3);
    expect(d).toEqual([
      { day: '2026-10-17', orders: 0, cents: 0 },
      { day: '2026-10-18', orders: 3, cents: 1500 },
      { day: '2026-10-19', orders: 0, cents: 0 },
    ]);
  });
  it('suggerisce la prossima azione in base allo stato', () => {
    expect(nextAction('z', 'draft', null)?.href).toBe('/admin/e/z/impostazioni');
    expect(nextAction('z', 'archived', null)).toBeNull();
    const item = { ok: false, skipped: null };
    expect(nextAction('z', 'concluded', { complete: false, items: [item, item] as never })?.text).toContain('2 controlli mancanti');
    expect(nextAction('z', 'concluded', { complete: true, items: [] })?.cta).toBe('Archivia');
  });
});
