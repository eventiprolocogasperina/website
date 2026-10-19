import { describe, expect, it } from 'vitest';
import { groupByDay, dayTotals, extractLastName, type ManifestRow } from '@/lib/pdf/manifest/rows';
import { activeView, countActiveFilters, DEFAULT_ORDER_VIEWS, EMPTY_FILTERS, orderFiltersToQuery, parseOrderFilters, viewQuery } from './order-filters';

describe('filtri dell’elenco ordini', () => {
  it('legge l’URL ignorando valori sconosciuti o malformati', () => {
    const f = parseOrderFilters({ q: '  rossi ', stato: 'paid,boh,paid', canale: 'pos', sessione: 'non-uuid', dal: '2026-10-01', al: '1/10', blacklist: 'forse', rimborso: 'si', ordina: 'x', pagina: '3' });
    expect(f).toMatchObject({ q: 'rossi', status: ['paid'], channel: ['pos'], session: '', from: '2026-10-01', to: '', blacklist: '', refund: true, sort: '-data', page: 2 });
    expect(parseOrderFilters(new URLSearchParams('pagina=-4')).page).toBe(0);
  });

  it('andata e ritorno con chiavi in ordine fisso', () => {
    const f = { ...EMPTY_FILTERS, status: ['refunded', 'partially_refunded'] as const, channel: ['online' as const], page: 1, sort: 'totale' as const };
    const q = orderFiltersToQuery({ ...f, status: [...f.status] });
    expect(q).toBe('stato=partially_refunded%2Crefunded&canale=online&ordina=totale&pagina=2');
    expect(parseOrderFilters(new URLSearchParams(q))).toMatchObject({ status: ['partially_refunded', 'refunded'], page: 1, sort: 'totale' });
  });

  it('riconosce la vista attiva e conta i filtri', () => {
    const rimborsati = parseOrderFilters(new URLSearchParams('stato=refunded,partially_refunded&q=anna&pagina=2'));
    expect(activeView(rimborsati, DEFAULT_ORDER_VIEWS)?.key).toBe('rimborsati');
    expect(activeView(EMPTY_FILTERS, DEFAULT_ORDER_VIEWS)?.key).toBe('tutti');
    expect(activeView({ ...EMPTY_FILTERS, refund: true }, DEFAULT_ORDER_VIEWS)).toBeNull();
    expect(viewQuery(rimborsati)).toBe('stato=partially_refunded%2Crefunded');
    expect(countActiveFilters({ ...EMPTY_FILTERS, q: 'x', from: '2026-01-01', to: '2026-01-02', refund: true })).toBe(2);
  });
});

describe('registro presenze', () => {
  const row = (name: string, over: Partial<ManifestRow & { shortDate: string; sortKey: string }> = {}) => ({
    id: name, name, phone: null, code: name, persons: 2, children: 1, labs: 0, activities: [], activityKeys: [], detail: '', paid: true, free: false, statusLabel: '', amountCents: 1000,
    shortDate: 'dom 25/10/2026', sortKey: '2026-10-25', ...over,
  });

  it('un foglio per giorno in ordine di data, righe per cognome con le particelle', () => {
    const groups = groupByDay([row('Mario Rossi'), row('Anna De Luca'), row('Luigi Bianchi', { shortDate: 'sab 24/10/2026', sortKey: '2026-10-24' })]);
    expect(groups.map((g) => g.shortDate)).toEqual(['sab 24/10/2026', 'dom 25/10/2026']);
    expect(groups[1].rows.map((r) => r.name)).toEqual(['Anna De Luca', 'Mario Rossi']);
    expect(extractLastName('Anna De Luca')).toBe('de luca');
  });

  it('i totali contano l’incasso solo degli ordini pagati', () => {
    const t = dayTotals([row('A B'), row('C D', { paid: false })]);
    expect(t).toEqual({ persons: 4, children: 2, adults: 2, labs: 0, amountCents: 1000 });
  });
});
