// Genera il valore di ADMIN_PASSWORD_HASH (stesso formato di src/server/auth/password.ts).
// Uso: npm run hash-password -- "la-nuova-password"
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Uso: npm run hash-password -- "password di almeno 12 caratteri"');
  process.exit(1);
}
const N = 16384, R = 8, P = 1;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N, r: R, p: P });
console.log(['scrypt', N, R, P, salt.toString('base64url'), hash.toString('base64url')].join('.'));
