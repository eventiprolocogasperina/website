// Token di sessione firmati con HMAC-SHA256 (node:crypto, nessuna dipendenza).
// Formato: base64url(payload JSON) + "." + base64url(firma). Funzioni pure, testabili.
import { createHmac, timingSafeEqual } from 'node:crypto';

export type SessionRole = 'admin' | 'cassa';

export type SessionPayload = {
  /** Chi è: "admin" per l'account unico di oggi; con il prompt 07 diventa l'id utente. */
  sub: string;
  role: SessionRole;
  /** Solo per le sessioni di cassa: l'evento a cui il codice dà accesso. */
  eventId?: string;
  /** Scadenza, in secondi Unix. */
  exp: number;
};

const b64url = (buf: Buffer) => buf.toString('base64url');

function sign(data: string, secret: string) {
  return createHmac('sha256', secret).update(data).digest();
}

export function signToken(payload: SessionPayload, secret: string): string {
  if (!secret) throw new Error('AUTH_SECRET mancante');
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${b64url(sign(body, secret))}`;
}

/** Restituisce il payload solo se la firma è valida e il token non è scaduto. */
export function verifyToken(token: string | undefined | null, secret: string, nowMs = Date.now()): SessionPayload | null {
  if (!token || !secret) return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) return null;

  const expected = sign(body, secret);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) return null;
    if (payload.role !== 'admin' && payload.role !== 'cassa') return null;
    return payload;
  } catch {
    return null;
  }
}
