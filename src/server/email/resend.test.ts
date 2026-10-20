import { afterEach, describe, expect, it, vi } from 'vitest';
import { Resend } from 'resend';
import { SafeResend } from './resend';

describe('SafeResend', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('senza EMAIL_REDIRECT_TO lascia il send di Resend', () => {
    const client = new SafeResend('re_test');
    expect(Object.prototype.hasOwnProperty.call(client.emails, 'send')).toBe(false);
  });

  it('con EMAIL_REDIRECT_TO manda tutto a quell’indirizzo e mette il destinatario nell’oggetto', async () => {
    vi.stubEnv('EMAIL_REDIRECT_TO', 'prova@esempio.it');
    const client = new SafeResend('re_test');
    const original = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null });
    // Il wrapper chiama il send originale: lo sostituiamo prima di costruire un nuovo client.
    const proto = Object.getPrototypeOf(client.emails);
    vi.spyOn(proto, 'send').mockImplementation(original);
    const wrapped = new SafeResend('re_test');
    await wrapped.emails.send({ from: 'a@b.it', to: ['cliente@vero.it'], bcc: 'x@y.it', subject: 'Biglietti', html: '<p/>' });
    expect(original).toHaveBeenCalledWith(expect.objectContaining({ to: 'prova@esempio.it', bcc: undefined, subject: '[PROVA → cliente@vero.it] Biglietti' }), undefined);
  });
});
