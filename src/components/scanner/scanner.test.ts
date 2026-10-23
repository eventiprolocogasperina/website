import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { checkOffline, checkOfflineOrder, offlineCounter, qrHashBrowser } from './offline';
import { present, stateReason, summarize } from './present';
import type { OfflineManifest, ScannedTicket } from './types';

const ticket: ScannedTicket = { id: 't', orderId: 'o', productName: 'Ingresso', sessionLabel: 'Dom 25 ott', validOn: 'Dom 25 ott', orderCode: 'ZC26-7F3K', holderName: 'Mario Rossi' };
const online = (data: object) => present({ source: 'online', data: { counter: { entered: 0, expected: 0 }, answers: {}, ...data } as never });

describe('esito a tutto schermo', () => {
  it('altra data in giallo con la data in cui vale', () => {
    expect(online({ result: 'wrong_session', ticket })).toMatchObject({ tone: 'warning', title: 'ALTRA DATA: Dom 25 ott' });
  });

  it('già entrato in giallo con l’ora di Roma (il 25 ottobre è già ora solare) e il telefono', () => {
    expect(online({ result: 'already_used', at: '2026-10-25T08:41:00Z', by: 'Ingresso nord', ticket })).toMatchObject({ tone: 'warning', title: 'GIÀ ENTRATO alle 09:41', lines: expect.arrayContaining(['Da Ingresso nord']) });
  });

  it('valido in verde; per un biglietto di una data rinviata lo dice', () => {
    expect(online({ result: 'valid', checkinId: 'c', at: '2026-10-25T08:41:00Z', ticket })).toMatchObject({ tone: 'success', title: 'VALIDO' });
    const moved = online({ result: 'valid', checkinId: 'c', at: '2026-10-17T08:41:00Z', ticket: { ...ticket, sessionLabel: 'Sab 10 ott', validOn: 'Sab 17 ott' } });
    expect(moved.lines).toContain('Biglietto del Sab 10 ott, data rinviata: vale oggi.');
  });

  it('rosso per sconosciuto, annullato, blacklist e lista sbagliata', () => {
    for (const result of ['unknown', 'void', 'blocked', 'wrong_list']) expect(online({ result, ticket }).tone).toBe('danger');
  });

  it('Paga in loco non pagato: giallo "Da pagare" con l’importo; senza permesso si paga in cassa', () => {
    const p = online({ result: 'to_pay', dueCents: 1000, ticket });
    expect(p).toMatchObject({ tone: 'warning', title: expect.stringMatching(/^DA PAGARE: 10,00\s€$/) });
    expect(p.lines.at(-1)).toMatch(/^Da pagare in cassa/);
    const data = { result: 'to_pay', dueCents: 1000, ticket, answers: {} } as never;
    expect(present({ source: 'online', data }, { canCollect: true }).lines.at(-1)).toMatch(/incassa qui sotto/);
  });
});

describe('ingresso di gruppo', () => {
  it('riepilogo dei prodotti e motivo dei biglietti grigi', () => {
    expect(summarize(['Intero', 'You-Pick Lab', 'Intero'])).toBe('2× Intero, 1× You-Pick Lab');
    expect(stateReason({ state: 'ready' })).toBeNull();
    expect(stateReason({ state: 'already_used', at: '2026-10-25T08:41:00Z', by: 'Ingresso nord' })).toBe('Già entrato alle 09:41 (Ingresso nord)');
    expect(stateReason({ state: 'wrong_session', validOn: 'Sab 24 ott' })).toBe('Vale un altro giorno: Sab 24 ott');
    expect(stateReason({ state: 'wrong_list' })).toBe('Non entra da questa lista');
    expect(stateReason({ state: 'void' })).toBe('Annullato o rimborsato');
  });

  it('lettura: conferma in verde; dopo la conferma quanti entrano e chi è rimasto fuori', () => {
    expect(online({ result: 'order', ticket, tickets: [] })).toMatchObject({ tone: 'success', title: 'CONFERMA INGRESSO' });
    const done = online({
      result: 'entered',
      ticket,
      entered: [
        { ticketId: 'a', checkinId: 'ca', at: '2026-10-25T08:41:00Z' },
        { ticketId: 'b', checkinId: 'cb', at: '2026-10-25T08:41:00Z' },
      ],
      skipped: [{ ticketId: 'c', result: 'already_used' }],
      tickets: [
        { ...ticket, id: 'a', productName: 'Intero' },
        { ...ticket, id: 'b', productName: 'You-Pick Lab' },
        { ...ticket, id: 'c', productName: 'Intero' },
      ],
    });
    expect(done).toMatchObject({ tone: 'success', title: 'ENTRANO IN 2' });
    expect(done.lines).toEqual(['Mario Rossi', 'Ordine ZC26-7F3K', '1× Intero, 1× You-Pick Lab', 'Non entrato: Intero, già entrato da un altro telefono.']);
    expect(online({ result: 'entered', ticket, entered: [], skipped: [{ ticketId: 't', result: 'already_used' }], tickets: [ticket] })).toMatchObject({ tone: 'warning', title: 'NESSUNO ENTRATO' });
    expect(present({ source: 'offline', data: { result: 'entered', count: 3, products: ['Intero', 'Intero', 'Ridotto'] } })).toMatchObject({ tone: 'success', title: 'ENTRANO IN 3', lines: ['2× Intero, 1× Ridotto', expect.stringMatching(/^Offline/)] });
  });

  it('offline: i biglietti dello stesso ordine dall’elenco; con un elenco vecchio un biglietto alla volta', () => {
    const m: OfflineManifest = {
      listId: 'l',
      generatedAt: '2026-10-25T07:00:00Z',
      sessions: [
        { id: 'sab', label: 'Sab 24 ott' },
        { id: 'dom', label: 'Dom 25 ott' },
      ],
      products: ['Intero', 'You-Pick Lab'],
      entries: [
        ['h1', 1, 0, 0, 0, 't1'],
        ['h2', 1, 1, 0, 0, 't2'],
        ['h3', 1, 0, 0, 1, 't3'],
        ['h4', 0, 0, 0, 0, 't4'],
        ['altro', 1, 0, 1, 0, 't5'],
      ],
    };
    const r = checkOfflineOrder(m, 'h2', 'dom', new Set(['h3']));
    // h2 già entrato e h3 entrato da questo telefono, ma h1 può entrare: si apre l'ordine.
    expect(r).toEqual({
      result: 'order',
      tickets: [
        { hash: 'h1', ticketId: 't1', productName: 'Intero', validOn: 'Dom 25 ott', state: 'ready', scanned: false },
        { hash: 'h2', ticketId: 't2', productName: 'Intero', validOn: 'Dom 25 ott', state: 'already_used', scanned: true },
        { hash: 'h3', ticketId: 't3', productName: 'You-Pick Lab', validOn: 'Dom 25 ott', state: 'already_used', scanned: false },
        { hash: 'h4', ticketId: 't4', productName: 'Intero', validOn: 'Sab 24 ott', state: 'wrong_session', scanned: false },
      ],
    });
    // Nessuno può entrare: l'esito del biglietto letto.
    expect(checkOfflineOrder(m, 'h2', 'dom', new Set(['h1', 'h3'])).result).toBe('already_used');
    expect(checkOfflineOrder(m, 'nessuno', 'dom', new Set()).result).toBe('unknown');
    const old: OfflineManifest = { ...m, products: undefined, entries: [['h1', 1, 0], ['h2', 1, 0]] };
    expect(checkOfflineOrder(old, 'h1', 'dom', new Set()).result).toBe('valid');
  });
});

describe('offline', () => {
  const manifest: OfflineManifest = {
    listId: 'l',
    generatedAt: '2026-10-25T07:00:00Z',
    sessions: [
      { id: 'sab', label: 'Sab 24 ott' },
      { id: 'dom', label: 'Dom 25 ott' },
    ],
    entries: [
      ['h-dom', 1, 0],
      ['h-sab', 0, 0],
      ['h-usato', 1, 1],
      ['h-sempre', -1, 0],
    ],
  };

  it('stessa impronta del server', async () => {
    expect(await qrHashBrowser(' f3973e8222462907b9ff2eb852137a29 ')).toBe(createHash('sha256').update('f3973e8222462907b9ff2eb852137a29').digest('hex').slice(0, 32));
  });

  it('valido, altra data, già entrato (anche da questo telefono), sconosciuto, senza elenco', () => {
    const none = new Set<string>();
    expect(checkOffline(manifest, 'h-dom', 'dom', none).result).toBe('valid');
    expect(checkOffline(manifest, 'h-sab', 'dom', none)).toEqual({ result: 'wrong_session', validOn: 'Sab 24 ott' });
    expect(checkOffline(manifest, 'h-usato', 'dom', none).result).toBe('already_used');
    expect(checkOffline(manifest, 'h-dom', 'dom', new Set(['h-dom'])).result).toBe('already_used');
    expect(checkOffline(manifest, 'h-sempre', 'sab', none).result).toBe('valid');
    expect(checkOffline(manifest, 'altro', 'dom', none).result).toBe('unknown');
    expect(checkOffline(null, 'h-dom', 'dom', none).result).toBe('no_manifest');
  });

  it('contatori offline per la data', () => {
    expect(offlineCounter(manifest, 'dom', new Set(['h-dom']))).toEqual({ expected: 3, entered: 2 });
    expect(offlineCounter(manifest, null, new Set())).toEqual({ expected: 4, entered: 1 });
  });
});
