// Cifratura dell'IBAN dei rimborsi (§5.1): AES-256-GCM con chiave in REFUND_ENCRYPTION_KEY
// (32 byte in base64, es. `openssl rand -base64 32`). Formato salvato: "v1:" + base64(iv | tag | testo).
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { DomainError } from '@/server/domain/errors';

const VERSION = 'v1';

function key(raw = process.env.REFUND_ENCRYPTION_KEY): Buffer {
  const buf = raw ? Buffer.from(raw, 'base64') : Buffer.alloc(0);
  if (buf.length !== 32) throw new DomainError('INTERNAL', { details: { reason: 'REFUND_ENCRYPTION_KEY mancante o non di 32 byte' } });
  return buf;
}

export function encryptIban(iban: string, rawKey?: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(rawKey), iv);
  const body = Buffer.concat([cipher.update(iban, 'utf8'), cipher.final()]);
  return `${VERSION}:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')}`;
}

export function decryptIban(stored: string, rawKey?: string): string {
  const [version, payload] = stored.split(':');
  if (version !== VERSION || !payload) throw new DomainError('INTERNAL', { details: { reason: 'formato IBAN cifrato sconosciuto' } });
  const buf = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(rawKey), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

/** "IT60 X054 …" → "IT…1234": l'unica forma dell'IBAN che può comparire nell'admin senza permesso. */
export function maskIban(iban: string): string {
  const clean = iban.replace(/\s/g, '');
  return `${clean.slice(0, 2)}…${clean.slice(-4)}`;
}
