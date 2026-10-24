import { describe, expect, it } from 'vitest';
import { adjustmentDelta, balanceCents, costTotals } from './costs';

describe('costi', () => {
  it('totali per categoria nell’ordine dell’elenco, senza le voci annullate', () => {
    const t = costTotals([
      { category: 'Altro', amountCents: 100 },
      { category: 'Noleggi', amountCents: 200 },
      { category: 'Materiali', amountCents: 50 },
      { category: 'Noleggi', amountCents: 300 },
      { category: 'Materiali', amountCents: 999, voidedAt: new Date() },
    ]);
    expect(t).toEqual({
      byCategory: [
        { category: 'Materiali', cents: 50 },
        { category: 'Noleggi', cents: 500 },
        { category: 'Altro', cents: 100 },
      ],
      totalCents: 650,
    });
    expect(balanceCents(1000, t.totalCents)).toBe(350);
    expect(balanceCents(100, t.totalCents)).toBe(-550);
  });

  it('segno delle rettifiche', () => {
    expect(adjustmentDelta('lost', 2)).toBe(-2);
    expect(adjustmentDelta('broken', -1)).toBe(-1);
    expect(adjustmentDelta('added', 3)).toBe(3);
    expect(adjustmentDelta('correction', -4)).toBe(-4);
  });
});
