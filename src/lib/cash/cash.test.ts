import { describe, expect, it } from 'vitest';
import { changeFor, popDigit, pushDigit, quickAmounts } from './change';
import { csvMoney, toCsv } from './csv';
import { countProblems, countTotal, denominationLabel, needsDifferenceNote } from './denominations';
import { flushQueue, memoryStore, outcomeOf, type QueuedSale, type SendOutcome } from './offline-queue';
import { toPrintableOrder } from './receipt';
import type { Sale } from './types';

describe('conteggio per taglio', () => {
  it('somma i tagli da 500 € a 1 centesimo e ignora quantità non valide', () => {
    expect(countTotal({ '50000': 1, '5000': 2, '200': 3, '1': 4 })).toBe(50000 + 10000 + 600 + 4);
    expect(countTotal({ '300': 5, '100': -1, '50': 1.5 })).toBe(0);
    expect(countProblems({ '300': 1 })).toEqual(['Taglio sconosciuto: 300']);
    expect(countProblems({ '100': -2 })[0]).toMatch(/Quantità non valida per 1 €/);
    expect(denominationLabel(50)).toBe('50 cent');
  });
  it('chiede la nota solo oltre 1 € di differenza', () => {
    expect(needsDifferenceNote(100)).toBe(false);
    expect(needsDifferenceNote(-100)).toBe(false);
    expect(needsDifferenceNote(101)).toBe(true);
    expect(needsDifferenceNote(-250)).toBe(true);
  });
});

describe('resto e tastierino', () => {
  it('calcola il resto o null se non basta', () => {
    expect(changeFor(750, 2000)).toBe(1250);
    expect(changeFor(750, 700)).toBeNull();
  });
  it('propone l’esatto e i tagli comodi sopra il totale', () => {
    expect(quickAmounts(750)).toEqual([750, 1000, 2000, 5000]);
    expect(quickAmounts(1000)).toEqual([1000, 2000, 5000, 10000]);
    expect(quickAmounts(0)).toEqual([]);
  });
  it('compone gli importi in centesimi come una cassa', () => {
    expect(['1', '2', '5', '0'].reduce(pushDigit, 0)).toBe(1250);
    expect(pushDigit(1250, '00')).toBe(125000);
    expect(pushDigit(999999, '9')).toBe(999999);
    expect(popDigit(1250)).toBe(125);
  });
});

describe('CSV', () => {
  it('usa il punto e virgola, la virgola decimale e neutralizza le formule', () => {
    expect(csvMoney(123456)).toBe('1234,56');
    expect(csvMoney(-5)).toBe('-0,05');
    const csv = toCsv(['A', 'B'], [['=SOMMA(1)', 'x;y'], [-3, null]]);
    expect(csv).toBe('﻿A;B\r\n\'=SOMMA(1);"x;y"\r\n-3;\r\n');
  });
});

describe('coda offline', () => {
  const item = (n: number): QueuedSale => ({
    key: `k${n}`,
    totalCents: 100,
    attempts: 0,
    payload: { cashSessionId: 's', lines: [{ productId: 'p', quantity: 1 }], method: 'cash', idempotencyKey: `k${n}`, offlineAt: `2026-10-25T10:0${n}:00Z` },
  });

  it('classifica gli esiti: rete e PIN scaduto si riprovano, gli errori di dati no', () => {
    expect(outcomeOf(201).status).toBe('ok');
    expect(outcomeOf(200).status).toBe('ok');
    expect(outcomeOf(null).status).toBe('retry');
    expect(outcomeOf(401).status).toBe('retry');
    expect(outcomeOf(503).status).toBe('retry');
    expect(outcomeOf(409, 'Vendite chiuse')).toEqual({ status: 'rejected', error: 'Vendite chiuse' });
  });

  it('invia in ordine, si ferma alla rete assente e riprende senza doppioni', async () => {
    const store = memoryStore([item(3), item(1), item(2)]);
    const server = new Set<string>();
    let online = true;
    const send = async (q: QueuedSale): Promise<SendOutcome> => {
      if (!online) return { status: 'retry', error: 'offline' };
      server.add(q.payload.idempotencyKey); // il server è idempotente sulla chiave
      if (q.key === 'k2') online = false; // la rete cade dopo la seconda
      return { status: 'ok' };
    };
    const first = await flushQueue(store, send);
    expect(first).toMatchObject({ sent: 2, remaining: 1, stoppedByNetwork: true });
    online = true;
    const second = await flushQueue(store, send);
    expect(second).toMatchObject({ sent: 1, remaining: 0, stoppedByNetwork: false });
    expect([...server].sort()).toEqual(['k1', 'k2', 'k3']);
  });

  it('una vendita rifiutata resta in coda segnata e non blocca le altre', async () => {
    const store = memoryStore([item(1), item(2)]);
    const r = await flushQueue(store, async (q) => (q.key === 'k1' ? { status: 'rejected', error: 'Vendite chiuse' } : { status: 'ok' }));
    expect(r).toMatchObject({ sent: 1, rejected: 1, remaining: 1 });
    expect((await store.all())[0]).toMatchObject({ key: 'k1', failed: 'Vendite chiuse', attempts: 1 });
    expect((await flushQueue(store, async () => ({ status: 'ok' }))).sent).toBe(0);
  });
});

describe('stampa', () => {
  it('trasforma la vendita nell’ordine della stampa ESC/POS di oggi', () => {
    const sale: Sale = {
      orderId: 'o1',
      code: 'TE26-AAAA',
      number: 42,
      totalCents: 1300,
      method: 'cash',
      cashReceivedCents: 2000,
      changeCents: 700,
      complimentaryReason: null,
      registerName: 'Cassa 1',
      lines: [{ productId: 'p', name: 'Panino', quantity: 2, unitPriceCents: 650, totalCents: 1300, department: 'Griglia' }],
      at: '2026-10-25T10:00:00Z',
      created: true,
      oversold: false,
      afterClose: false,
    };
    expect(toPrintableOrder(sale, 'Sagra 2026', 'Anna')).toMatchObject({
      orderNumber: 42,
      paymentMethod: 'CONTANTI',
      totalAmount: 13,
      cashChange: 7,
      items: [{ name: 'Panino', price: 6.5, quantity: 2, subtotal: 13, department: 'Griglia' }],
    });
  });
});
