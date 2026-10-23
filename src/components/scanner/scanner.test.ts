import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { checkOffline, offlineCounter, qrHashBrowser } from './offline';
import { present } from './present';
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
