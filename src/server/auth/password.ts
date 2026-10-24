// Hash delle password con scrypt (node:crypto).
// Formato: scrypt.N.r.p.salt.hash (niente "$", che nei file .env verrebbe interpretato) (salt e hash in base64url). Generalo con npm run hash-password.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 16384, R = 8, P = 1, KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64url'), hash.toString('base64url')].join('.');
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!password || !stored) return false;
  const [scheme, n, r, p, saltB64, hashB64] = stored.split('.');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  try {
    const expected = Buffer.from(hashB64, 'base64url');
    const actual = scryptSync(password, Buffer.from(saltB64, 'base64url'), expected.length, {
      N: Number(n), r: Number(r), p: Number(p),
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** PIN di 4–6 cifre. */
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/** Impronta breve di un hash di password, per i link monouso (vedi signLinkToken). */
export function passwordFingerprint(stored: string | null | undefined): string {
  return createHash('sha256').update(stored ?? 'nessuna-password').digest('base64url').slice(0, 16);
}

/** sha256 in base64url: per i token di dispositivo e di abbinamento, che sono già casuali e lunghi. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Password accettabile: almeno 10 caratteri. */
export function passwordProblem(password: string): string | null {
  if (password.length < 10) return 'La password deve avere almeno 10 caratteri.';
  if (password.length > 200) return 'La password è troppo lunga.';
  return null;
}
