import { Resend } from 'resend';

type SendArgs = Parameters<Resend['emails']['send']>;

/**
 * Client Resend usato da tutto il sito. Con EMAIL_REDIRECT_TO impostata (solo sul Preview di Vercel, che
 * usa una copia del database con le email vere dei clienti) ogni email va a quell'indirizzo, con il
 * destinatario originale nell'oggetto. In produzione la variabile non c'è e non cambia nulla.
 */
export class SafeResend extends Resend {
  constructor(key?: string) {
    super(key);
    const redirect = process.env.EMAIL_REDIRECT_TO?.trim();
    if (!redirect) {
      // Preview senza dirottamento: nessuna email parte, per non scrivere ai clienti veri.
      if (process.env.VERCEL_ENV === 'preview') {
        this.emails.send = (async () => ({ data: null, error: { name: 'application_error', message: 'Email disattivate sul Preview (manca EMAIL_REDIRECT_TO)' } })) as unknown as Resend['emails']['send'];
      }
      return;
    }
    const send = this.emails.send.bind(this.emails);
    this.emails.send = ((payload: SendArgs[0], options?: SendArgs[1]) => {
      const original = [payload.to].flat().join(', ');
      return send({ ...payload, to: redirect, cc: undefined, bcc: undefined, subject: `[PROVA → ${original}] ${payload.subject}` } as SendArgs[0], options);
    }) as Resend['emails']['send'];
  }
}
