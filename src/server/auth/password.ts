// Hash delle password con scrypt (node:crypto).
// Formato: scrypt.N.r.p.salt.hash (niente "$", che nei file .env verrebbe interpretato) (salt e hash in base64url). Generalo con npm run hash-password.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

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
