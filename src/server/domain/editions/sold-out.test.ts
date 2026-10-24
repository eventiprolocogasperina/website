import { describe, expect, it } from 'vitest';
import { isSoldOut } from './sold-out';

const now = new Date('2026-10-20T10:00:00Z');
const later = new Date('2026-10-25T10:00:00Z');
const past = new Date('2026-10-10T10:00:00Z');
const ticket = { id: 't', kind: 'ticket', active: true, channels: ['online'], requiresSession: true };
const lab = { id: 'l', kind: 'addon', active: true, channels: ['online'], requiresSession: true };
const s1 = { id: 's1', status: 'open', startsAt: later };
const s2 = { id: 's2', status: 'open', startsAt: later };
const av = (rows: Array<[string, string | null, number | null]>) => ({ products: rows.map(([productId, sessionId, remaining]) => ({ productId, sessionId, remaining, limitedBy: null })) });

describe('isSoldOut', () => {
  it('esaurita solo quando tutte le date future sono piene', () => {
    expect(isSoldOut([ticket], [s1, s2], av([['t', 's1', 0], ['t', 's2', 3]]), now)).toBe(false);
    expect(isSoldOut([ticket], [s1, s2], av([['t', 's1', 0], ['t', 's2', 0]]), now)).toBe(true);
  });
  it('ignora i laboratori e le date passate', () => {
    expect(isSoldOut([ticket, lab], [s1, { id: 'old', status: 'open', startsAt: past }], av([['t', 's1', 0], ['t', 'old', 5], ['l', 's1', 9]]), now)).toBe(true);
  });
  it('senza limite di posti non è mai esaurita', () => {
    expect(isSoldOut([ticket], [s1], av([['t', 's1', null]]), now)).toBe(false);
  });
  it('senza biglietti online o senza date future non decide', () => {
    expect(isSoldOut([{ ...ticket, channels: ['pos'] }], [s1], av([['t', 's1', 0]]), now)).toBeNull();
    expect(isSoldOut([ticket], [{ ...s1, startsAt: past }], av([['t', 's1', 0]]), now)).toBeNull();
  });
});
