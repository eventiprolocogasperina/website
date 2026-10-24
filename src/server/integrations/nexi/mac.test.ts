import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { attemptCodTrans, orderCodeFromCodTrans, outcomeOf, requestMac, resultMac, toImporto, verifyResultMac } from './mac';

const KEY = 'chiave-segreta';
const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');

describe('MAC Nexi', () => {
  it('firma la richiesta con la formula del Pagamento semplice', () => {
    expect(requestMac({ codTrans: 'ZC267F3KABCDEFGH', divisa: 'EUR', importo: '1170' }, KEY)).toBe(sha1(`codTrans=ZC267F3KABCDEFGHdivisa=EURimporto=1170${KEY}`));
  });

  it('firma l’esito nell’ordine di Nexi e lo verifica', () => {
    const p = { codTrans: 'X1', esito: 'OK', importo: '500', divisa: 'EUR', data: '20261019', orario: '101010', codAut: 'A1B2' };
    const mac = resultMac(p, KEY);
    expect(mac).toBe(sha1(`codTrans=X1esito=OKimporto=500divisa=EURdata=20261019orario=101010codAut=A1B2${KEY}`));
    expect(verifyResultMac({ ...p, mac }, KEY)).toBe(true);
    expect(verifyResultMac({ ...p, mac: mac.toUpperCase() }, KEY)).toBe(true);
  });

  it('rifiuta un esito modificato o firmato con un’altra chiave', () => {
    const p = { codTrans: 'X1', esito: 'OK', importo: '500', divisa: 'EUR', data: 'd', orario: 'o', codAut: 'c' };
    const mac = resultMac(p, KEY);
    expect(verifyResultMac({ ...p, importo: '1', mac }, KEY)).toBe(false);
    expect(verifyResultMac({ ...p, mac: resultMac(p, 'altra') }, KEY)).toBe(false);
    expect(verifyResultMac({ ...p }, KEY)).toBe(false);
    expect(verifyResultMac({ ...p, mac: 'abc' }, KEY)).toBe(false);
  });
});

describe('codTrans', () => {
  it('contiene il codice dell’ordine e cambia a ogni tentativo', () => {
    const a = attemptCodTrans('ZC26-7F3K', new Date('2026-10-19T10:00:00Z'));
    const b = attemptCodTrans('ZC26-7F3K', new Date('2026-10-19T10:00:01Z'));
    expect(a).toMatch(/^ZC267F3K[0-9A-Z]{8}$/);
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(30);
    expect(orderCodeFromCodTrans(a)).toBe('ZC267F3K');
  });

  it('non riconosce codTrans estranei', () => {
    expect(orderCodeFromCodTrans('abc')).toBeNull();
    expect(orderCodeFromCodTrans('3f2a-uuid-con-trattini-12345678')).toBeNull();
  });
});

describe('esiti e importi', () => {
  it('traduce gli esiti', () => {
    expect(outcomeOf('OK')).toBe('succeeded');
    expect(outcomeOf('KO')).toBe('failed');
    expect(outcomeOf('ERRORE')).toBe('failed');
    expect(outcomeOf('ANNULLO')).toBe('cancelled');
    expect(outcomeOf('PEN')).toBe('pending');
    expect(outcomeOf(undefined)).toBe('failed');
  });
  it('scrive l’importo in centesimi interi', () => {
    expect(toImporto(1170)).toBe('1170');
  });
});
