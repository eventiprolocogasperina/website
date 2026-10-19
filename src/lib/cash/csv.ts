// CSV per Excel in italiano: separatore ";", virgola decimale, BOM UTF-8 in testa.

export type CsvCell = string | number | null | undefined;

function cell(v: CsvCell): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Niente formule: una cella che inizia con = + - @ viene presa come testo (CSV injection).
  const safe = /^[=+@]/.test(s) || (/^-/.test(s) && !/^-\d/.test(s)) ? `'${s}` : s;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Importo in centesimi come numero italiano senza simbolo ("1234,50"), per fare somme in Excel. */
export function csvMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}
