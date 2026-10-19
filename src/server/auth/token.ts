// Token di sessione firmati con HMAC-SHA256 (node:crypto, nessuna dipendenza).
// Formato: base64url(payload JSON) + "." + base64url(firma). Funzioni pure, testabili.
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * admin: sessione dell'admin (utente con email e password, oppure l'accesso di emergenza "admin").
 * cassa: sessione di cassa aperta con il codice evento (vecchio sistema, flag legacy_event_code).
 * pin: volontario entrato con il PIN su un dispositivo abbinato.
 */
export type SessionRole = 'admin' | 'cassa' | 'pin';
const ROLES: readonly SessionRole[] = ['admin', 'cassa', 'pin'];

export type SessionPayload = {
  /** Id dell'utente; "admin" per l'accesso di emergenza, "cassa" per il codice evento. */
  sub: string;
  role: SessionRole;
  /** Sessione admin: id della riga in user_sessions, per poterla chiudere dal server. */
  sid?: string;
  /** Sessione PIN: dispositivo su cui è stata aperta. */
  did?: string;
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
    if (!ROLES.includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Link firmati per email (reimpostazione password, invito). `fp` è un'impronta della password attuale:
 * appena la password cambia il link non vale più, quindi si usa una volta sola.
 */
export type LinkPurpose = 'reset' | 'invite';
export type LinkPayload = { p: LinkPurpose; uid: string; fp: string; exp: number };

export function signLinkToken(payload: LinkPayload, secret: string): string {
  if (!secret) throw new Error('AUTH_SECRET mancante');
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${b64url(sign(`link:${body}`, secret))}`;
}

export function verifyLinkToken(token: string | undefined | null, secret: string, nowMs = Date.now()): LinkPayload | null {
  if (!token || !secret) return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) return null;
  const expected = sign(`link:${body}`, secret);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as LinkPayload;
    if (payload.p !== 'reset' && payload.p !== 'invite') return null;
    if (typeof payload.uid !== 'string' || typeof payload.fp !== 'string') return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) return null;
    return payload;
  } catch {
    return null;
  }
}
