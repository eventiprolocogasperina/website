// Codici leggibili degli ordini ("ZC26-7F3K") e token casuali. Funzioni pure tranne il generatore.
import { randomBytes } from 'node:crypto';

/** Senza 0, O, 1, I e L: si dettano al telefono senza equivoci. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function randomCode(length: number, bytes: (n: number) => Uint8Array = randomBytes): string {
  // 256 non è multiplo di 31: si scartano i valori alti per non favorire le prime lettere.
  const limit = 256 - (256 % ALPHABET.length);
  let out = '';
  while (out.length < length) {
    for (const b of bytes(length * 2)) {
      if (b < limit && out.length < length) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

/**
 * Prefisso dall'edizione: due lettere e l'anno. "zuccaland-2026" → "ZC26",
 * "assaggia-e-passeggia-2026" → "AP26", "concerto-natale" (2026) → "CN26".
 */
export function orderCodePrefix(slug: string, year: number | null): string {
  const words = slug
    .split('-')
    .filter((w) => !/^\d+$/.test(w) && w.length >= 3)
    .map((w) => w.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean);
  let letters: string;
  if (words.length >= 2) letters = words[0][0] + words[1][0];
  else if (words.length === 1) {
    const w = words[0];
    const second = [...w.slice(1)].find((c) => !'AEIOU'.includes(c) && c !== w[0]) ?? w[1] ?? 'X';
    letters = w[0] + second;
  } else letters = 'PL';
  const yy = year ? String(year % 100).padStart(2, '0') : '';
  return `${letters}${yy}`;
}

export function newOrderCode(slug: string, year: number | null): string {
  return `${orderCodePrefix(slug, year)}-${randomCode(4)}`;
}

/** Token non indovinabile (QR dei biglietti, link "I miei biglietti"). */
export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}
