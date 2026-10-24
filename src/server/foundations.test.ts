import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainError, toErrorBody } from './domain/errors';
import { log, maskString, maskValue } from './log';

describe('DomainError', () => {
  it('ha codice, messaggio italiano e stato HTTP', () => {
    const e = new DomainError('SOLD_OUT', { details: { productId: 'p1' } });
    expect(e.code).toBe('SOLD_OUT');
    expect(e.message).toBe('I posti disponibili sono esauriti.');
    expect(e.status).toBe(409);
    expect(toErrorBody(e)).toEqual({ status: 409, body: { code: 'SOLD_OUT', error: e.message } });
  });
  it('non espone errori sconosciuti', () => {
    expect(toErrorBody(new Error('relation "x" does not exist')).body.error).toBe('Si è verificato un errore. Riprova tra poco.');
  });
});

describe('log', () => {
  afterEach(() => vi.restoreAllMocks());

  it('maschera email, telefoni e IBAN', () => {
    expect(maskString('ordine di mario.rossi@example.com')).toBe('ordine di m***@example.com');
    expect(maskString('tel +39 333 123 4567')).toBe('tel ***567');
    expect(maskString('IBAN IT60X0542811101000000123456')).toBe('IBAN IT60…56');
    expect(maskString('ordine ZK26-7F3K, 3 biglietti, 2026-10-25')).toBe('ordine ZK26-7F3K, 3 biglietti, 2026-10-25');
  });
  it('nasconde le chiavi sensibili', () => {
    expect(maskValue({ token: 'abc', nested: { password: 'x', email: 'a@b.it' } })).toEqual({
      token: '[nascosto]',
      nested: { password: '[nascosto]', email: 'a***@b.it' },
    });
  });
  it('scrive una riga JSON', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    log.error('pagamento fallito', { orderId: 'o1', buyerEmail: 'luca@example.it' });
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry).toMatchObject({ level: 'error', msg: 'pagamento fallito', orderId: 'o1', buyerEmail: 'l***@example.it' });
  });
});
