import { describe, expect, it } from 'vitest';
import { formatMoney, fromCents, toCents } from './money';
import { formatDate, formatDateTime, formatRelative, romeDateKey } from './dates';
import { CODE_ALPHABET, generateOrderCode, isValidOrderCode, normalizeOrderCode } from './codes';

// Intl usa spazi non separabili (U+00A0, U+202F) prima di "€": li normalizziamo per confrontare.
const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('money', () => {
  it('converte euro in centesimi senza errori binari', () => {
    expect(toCents(11.7)).toBe(1170);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents('12.50')).toBe(1250);
    expect(toCents('12,5')).toBe(1250);
    expect(toCents(19.999)).toBe(2000);
    expect(toCents(-3.335)).toBe(-333);
  });
  it('rifiuta importi non validi', () => {
    expect(() => toCents('abc')).toThrow(RangeError);
    expect(() => fromCents(10.5)).toThrow(RangeError);
  });
  it('formatta in it-IT', () => {
    expect(plain(formatMoney(1170))).toBe('11,70 €');
    expect(plain(formatMoney(0))).toBe('0,00 €');
    expect(plain(formatMoney(123456))).toBe('1.234,56 €');
    expect(plain(formatMoney(123456789))).toBe('1.234.567,89 €');
    expect(plain(formatMoney(-1170))).toBe('-11,70 €');
    expect(plain(formatMoney(5))).toBe('0,05 €');
    expect(() => formatMoney(10.5)).toThrow(RangeError);
  });
});

describe('dates', () => {
  it('usa il fuso di Roma, non quello del server', () => {
    // 23:30 UTC del 24 ottobre = 01:30 del 25 a Roma (ora legale, UTC+2)
    expect(romeDateKey('2026-10-24T23:30:00Z')).toBe('2026-10-25');
    expect(formatDateTime('2026-10-25T09:30:00Z')).toBe('dom 25 ott 2026, 10:30'); // CET dopo il cambio
    expect(formatDate('2026-10-25T09:30:00Z')).toBe('domenica 25 ottobre 2026');
  });
  it('gestisce il cambio dell’ora legale (25 ottobre 2026, 03:00 → 02:00)', () => {
    expect(formatDateTime('2026-10-25T00:30:00Z')).toBe('dom 25 ott 2026, 02:30'); // ancora CEST
    expect(formatDateTime('2026-10-25T01:30:00Z')).toBe('dom 25 ott 2026, 02:30'); // già CET
    expect(formatDateTime('2026-10-25T02:30:00Z')).toBe('dom 25 ott 2026, 03:30');
    expect(formatDateTime('2026-03-29T00:30:00Z')).toBe('dom 29 mar 2026, 01:30'); // CET
    expect(formatDateTime('2026-03-29T01:30:00Z')).toBe('dom 29 mar 2026, 03:30'); // CEST
  });
  it('formatta tempi relativi', () => {
    const now = new Date('2026-10-19T12:00:00Z');
    expect(formatRelative(new Date('2026-10-19T11:57:00Z'), now)).toBe('3 minuti fa');
    expect(formatRelative(new Date('2026-10-19T11:59:40Z'), now)).toBe('ora');
    expect(formatRelative(new Date('2026-10-21T12:00:00Z'), now)).toBe('dopodomani');
    expect(formatRelative(new Date('2026-10-18T12:00:00Z'), now)).toBe('ieri');
  });
  it('rifiuta date non valide', () => {
    expect(() => formatDate('non una data')).toThrow(RangeError);
  });
});

describe('codes', () => {
  it('genera codici nel formato ZK26-7F3K', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateOrderCode('zk', 2026);
      expect(code).toMatch(/^ZK26-[A-Z2-9]{4}$/);
      expect(isValidOrderCode(code)).toBe(true);
      expect(code.slice(5)).not.toMatch(/[01OIL]/);
    }
  });
  it('usa un alfabeto senza caratteri ambigui', () => {
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
    expect(new Set(CODE_ALPHABET).size).toBe(CODE_ALPHABET.length);
  });
  it('normalizza i codici digitati', () => {
    expect(normalizeOrderCode(' zk26 7f3k ')).toBe('ZK26-7F3K');
    expect(normalizeOrderCode('ZK26-7F3K')).toBe('ZK26-7F3K');
    expect(isValidOrderCode('ZK26-7F0K')).toBe(false);
  });
  it('rifiuta prefissi non validi', () => {
    expect(() => generateOrderCode('Z1', 2026)).toThrow(RangeError);
  });
});
