import { describe, expect, it } from 'vitest';
import { cashTotals, dayOf, expectedCash, groupMovements, type Movement } from './totals';

const m = (over: Partial<Movement>): Movement => ({
  kind: 'payment',
  orderId: 'o1',
  method: 'cash',
  amountCents: 1000,
  at: new Date('2026-10-24T20:00:00Z'),
  sessionId: 's1',
  registerName: 'Cassa 1',
  operatorName: 'Anna',
  ...over,
});

describe('totali della cassa', () => {
  const movements = [
    m({}),
    m({ orderId: 'o2', method: 'card_pos', amountCents: 500 }),
    m({ orderId: 'o3', method: 'complimentary', amountCents: 700 }),
    m({ orderId: 'o1', kind: 'refund', amountCents: 1000, at: new Date('2026-10-24T23:30:00Z') }),
    m({ orderId: 'o4', amountCents: 300, sessionId: 's2', registerName: 'Bar', operatorName: 'Bruno' }),
  ];
  const lines = [
    { orderId: 'o1', productId: 'p1', name: 'Panino', quantity: 2, totalCents: 1000, voided: true },
    { orderId: 'o2', productId: 'p2', name: 'Birra', quantity: 1, totalCents: 500, voided: false },
    { orderId: 'o4', productId: 'p2', name: 'Birra', quantity: 1, totalCents: 300, voided: false },
  ];

  it('contributi = contanti + carta al netto degli storni; omaggi a parte', () => {
    const t = cashTotals(movements, lines, [
      { orderId: 'o1', voided: true, flagged: false },
      { orderId: 'o2', voided: false, flagged: true },
    ]);
    expect(t.netCents).toBe(500 + 300);
    expect(t.complimentaryCents).toBe(700);
    expect(t.byMethod.find((x) => x.method === 'cash')).toMatchObject({ count: 2, amountCents: 1300, refundedCents: 1000, netCents: 300 });
    expect(t.products).toEqual([{ productId: 'p2', name: 'Birra', quantity: 2, amountCents: 800 }]);
    expect(t).toMatchObject({ sales: 1, voided: 1, flagged: 1 });
  });

  it('per giorno a Roma: lo storno dopo mezzanotte va sul giorno dopo', () => {
    const days = groupMovements(movements, dayOf);
    expect(days.map((d) => [d.key, d.netCents])).toEqual([
      ['2026-10-24', 1800],
      ['2026-10-25', -1000],
    ]);
  });

  it('le Z dei turni sommate danno il rendiconto', () => {
    const z1 = cashTotals(movements.filter((x) => x.sessionId === 's1'), [], []);
    const z2 = cashTotals(movements.filter((x) => x.sessionId === 's2'), [], []);
    expect(z1.netCents + z2.netCents).toBe(cashTotals(movements, [], []).netCents);
    const byRegister = groupMovements(movements, (x) => x.registerName);
    expect(byRegister.map((g) => [g.key, g.netCents, g.sales])).toEqual([
      ['Bar', 300, 1],
      ['Cassa 1', 500, 3],
    ]);
  });

  it('contante atteso: fondo + contanti − storni in contanti', () => {
    expect(expectedCash(5000, movements.filter((x) => x.sessionId === 's1'))).toBe(5000);
    expect(expectedCash(5000, movements)).toBe(5300);
  });
});
