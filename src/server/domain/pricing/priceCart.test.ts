import { describe, expect, it } from 'vitest';
import { priceCart, PricingError, type Catalog, type DiscountRow } from './priceCart';

const catalog: Catalog = {
  eventId: 'zuccaland-2026',
  products: [
    { id: 'ingresso', label: 'Ingresso Ordinario', unitPriceCents: 500 },
    { id: 'laboratorio', label: 'You Pick Lab', unitPriceCents: 300 },
    { id: 'omaggio', label: 'Ingresso Omaggio', unitPriceCents: 0 },
  ],
  acceptedDiscountScopes: ['ALL', 'ZUCCALAND_ONLY'],
};

const now = new Date('2026-10-20T10:00:00Z');

const discount = (over: Partial<DiscountRow> = {}): DiscountRow => ({
  id: 'd1', code: 'PROVA', type: 'PERCENTAGE', value: 10, max_uses: 0, current_uses: 0,
  expiry_date: null, active: true, applies_to: 'ALL', ...over,
});

const errorCode = (fn: () => unknown) => {
  try { fn(); } catch (e) { return e instanceof PricingError ? e.code : 'OTHER'; }
  return 'NONE';
};

describe('priceCart', () => {
  it('prezzo normale', () => {
    const r = priceCart({ lines: [{ type: 'Ingresso Ordinario', quantity: 3 }] }, catalog, null, now);
    expect(r).toEqual({
      lines: [{ type: 'Ingresso Ordinario', quantity: 3, unitPriceCents: 500, totalCents: 1500 }],
      subtotalCents: 1500, discountCents: 0, totalCents: 1500, discountId: undefined,
    });
  });

  it('più righe, riconosce anche l\'id e ignora maiuscole e spazi', () => {
    const r = priceCart({ lines: [{ type: ' ingresso ordinario ', quantity: 2 }, { type: 'laboratorio', quantity: 1 }] }, catalog, null, now);
    expect(r.subtotalCents).toBe(1300);
    expect(r.lines.map((l) => l.type)).toEqual(['Ingresso Ordinario', 'You Pick Lab']);
  });

  it('righe ripetute dello stesso prodotto vengono unite', () => {
    const r = priceCart({ lines: [{ type: 'You Pick Lab', quantity: 1 }, { type: 'You Pick Lab', quantity: 2 }] }, catalog, null, now);
    expect(r.lines).toEqual([{ type: 'You Pick Lab', quantity: 3, unitPriceCents: 300, totalCents: 900 }]);
  });

  it('sconto percentuale', () => {
    const r = priceCart({ lines: [{ type: 'Ingresso Ordinario', quantity: 3 }], discountCode: 'PROVA' }, catalog, discount(), now);
    expect([r.subtotalCents, r.discountCents, r.totalCents, r.discountId]).toEqual([1500, 150, 1350, 'd1']);
  });

  it('sconto percentuale con arrotondamento al centesimo', () => {
    const r = priceCart({ lines: [{ type: 'You Pick Lab', quantity: 1 }], discountCode: 'X' }, catalog, discount({ value: '33.3' }), now);
    expect(r.discountCents).toBe(100);
    expect(r.totalCents).toBe(200);
  });

  it('sconto del 100% valido rende l\'ordine gratuito', () => {
    const r = priceCart({ lines: [{ type: 'Ingresso Ordinario', quantity: 2 }], discountCode: 'X' }, catalog, discount({ value: 100 }), now);
    expect(r.totalCents).toBe(0);
  });

  it('sconto fisso maggiore del totale non va sotto zero', () => {
    const r = priceCart({ lines: [{ type: 'Ingresso Ordinario', quantity: 1 }], discountCode: 'X' }, catalog, discount({ type: 'FIXED', value: 20 }), now);
    expect([r.discountCents, r.totalCents]).toEqual([500, 0]);
  });

  it('sconto scaduto', () => {
    const d = discount({ expiry_date: '2026-10-01T00:00:00Z' });
    expect(errorCode(() => priceCart({ lines: [{ type: 'ingresso', quantity: 1 }], discountCode: 'X' }, catalog, d, now))).toBe('INVALID_DISCOUNT');
  });

  it('sconto esaurito', () => {
    const d = discount({ max_uses: 5, current_uses: 5 });
    expect(errorCode(() => priceCart({ lines: [{ type: 'ingresso', quantity: 1 }], discountCode: 'X' }, catalog, d, now))).toBe('INVALID_DISCOUNT');
  });

  it('sconto non attivo, inesistente o di un altro evento', () => {
    const lines = [{ type: 'ingresso', quantity: 1 }];
    expect(errorCode(() => priceCart({ lines, discountCode: 'X' }, catalog, discount({ active: false }), now))).toBe('INVALID_DISCOUNT');
    expect(errorCode(() => priceCart({ lines, discountCode: 'X' }, catalog, null, now))).toBe('INVALID_DISCOUNT');
    expect(errorCode(() => priceCart({ lines, discountCode: 'X' }, catalog, discount({ applies_to: 'FULL_TICKET' }), now))).toBe('INVALID_DISCOUNT');
  });

  it('prodotto sconosciuto', () => {
    expect(errorCode(() => priceCart({ lines: [{ type: 'Biglietto VIP', quantity: 1 }] }, catalog, null, now))).toBe('UNKNOWN_PRODUCT');
  });

  it('quantità 0, negativa, decimale, troppo alta o non numerica', () => {
    for (const quantity of [0, -1, 1.5, 51, '2', null]) {
      expect(errorCode(() => priceCart({ lines: [{ type: 'ingresso', quantity }] }, catalog, null, now))).toBe('INVALID_QUANTITY');
    }
  });

  it('carrello vuoto', () => {
    expect(errorCode(() => priceCart({ lines: [] }, catalog, null, now))).toBe('EMPTY_CART');
  });

  it('il prezzo manomesso dal client viene ignorato', () => {
    const tampered = [{ type: 'Ingresso Ordinario', quantity: 2, price: 0, totalAmount: 0 }];
    const r = priceCart({ lines: tampered }, catalog, null, now);
    expect(r.totalCents).toBe(1000);
  });

  it('prodotti a prezzo zero danno un totale zero legittimo', () => {
    const r = priceCart({ lines: [{ type: 'Ingresso Omaggio', quantity: 2 }] }, catalog, null, now);
    expect(r.totalCents).toBe(0);
  });
});
