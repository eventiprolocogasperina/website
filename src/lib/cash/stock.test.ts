import { describe, expect, it } from 'vitest';
import { isLowStock, LOW_STOCK, piecesLeft, stockLabel } from './stock';

describe('pezzi rimasti in cassa', () => {
  it('toglie quelli nel carrello, mai sotto zero; senza limite resta null', () => {
    expect(piecesLeft(12)).toBe(12);
    expect(piecesLeft(12, 3)).toBe(9);
    expect(piecesLeft(2, 5)).toBe(0);
    expect(piecesLeft(null, 4)).toBeNull();
  });

  it('etichetta: rimasti, rimasto, esaurito', () => {
    expect(stockLabel(12)).toBe('12 rimasti');
    expect(stockLabel(1)).toBe('1 rimasto');
    expect(stockLabel(0)).toBe('Esaurito');
    expect(stockLabel(null)).toBeNull();
  });

  it('rosso da LOW_STOCK in giù, esauriti compresi', () => {
    expect(isLowStock(LOW_STOCK)).toBe(true);
    expect(isLowStock(LOW_STOCK + 1)).toBe(false);
    expect(isLowStock(0)).toBe(true);
    expect(isLowStock(null)).toBe(false);
  });
});
