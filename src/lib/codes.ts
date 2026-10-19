// Alfabeto senza caratteri ambigui (0 O 1 I L), §15.
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_PATTERN = new RegExp(`^[A-Z]{2,4}\\d{2}-[${CODE_ALPHABET}]{4}$`);

function randomChars(length: number): string {
  // Rejection sampling per una distribuzione uniforme; funziona sia su Node sia nel browser.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let out = '';
  const buf = new Uint8Array(1);
  while (out.length < length) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) out += CODE_ALPHABET[buf[0] % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Codice ordine leggibile: prefisso del format, anno a due cifre e 4 caratteri, es. `ZK26-7F3K`.
 * L'unicità va garantita dal database (vincolo unique + nuovo tentativo in caso di collisione).
 */
export function generateOrderCode(prefix: string, year: number): string {
  const p = prefix.toUpperCase();
  if (!/^[A-Z]{2,4}$/.test(p)) throw new RangeError(`Prefisso non valido: ${prefix}`);
  return `${p}${String(year % 100).padStart(2, '0')}-${randomChars(4)}`;
}

/** Normalizza un codice digitato a mano: maiuscole, senza spazi, trattino aggiunto se manca. */
export function normalizeOrderCode(input: string): string {
  const compact = input.toUpperCase().replace(/[\s-]+/g, '');
  const match = /^([A-Z]{2,4}\d{2})([A-Z0-9]{4})$/.exec(compact);
  return match ? `${match[1]}-${match[2]}` : compact;
}

export function isValidOrderCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}
