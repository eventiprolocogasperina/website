import { describe, expect, it } from 'vitest';
import { orderSummary } from './order-summary';

const nbsp = (s: string) => s.replace(/ /g, ' ');

describe('riepilogo dell’ordine nei biglietti e nell’email', () => {
  it('con un codice sconto: codice, importo scontato e totale pagato', () => {
    const r = orderSummary({ status: 'paid', totalCents: 1500, discountCents: 500, discountCode: 'SPONSOR26' });
    expect(nbsp(r.discountLabel!)).toBe('Codice SPONSOR26: −5,00 €');
    expect(r.totalTitle).toBe('Totale pagato');
    expect(nbsp(r.totalLabel)).toBe('15,00 €');
  });

  it('senza sconto nessuna riga; un ordine non pagato dice solo "Totale"', () => {
    expect(orderSummary({ status: 'pending', totalCents: 1000, discountCents: 0, discountCode: null })).toMatchObject({ discountLabel: null, totalTitle: 'Totale' });
    expect(nbsp(orderSummary({ status: 'paid', totalCents: 0, discountCents: 1000, discountCode: null }).discountLabel!)).toBe('Sconto: −10,00 €');
  });
});
