// CSV per Excel in italiano: separatore ";", BOM UTF-8, righe CRLF. Le celle che iniziano con
// = + - @ prendono un apostrofo davanti, così un nome non diventa una formula (CSV injection).

export type CsvCell = string | number | boolean | null | undefined;

function cell(v: CsvCell): string {
  if (v === null || v === undefined) return '';
  let s = typeof v === 'boolean' ? (v ? 'sì' : 'no') : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  return `﻿${[header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n')}\r\n`;
}

/** Importo in euro con la virgola, senza simbolo ("12,50"), per i fogli di calcolo. */
export const csvMoney = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

export function csvResponse(body: string, filename: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
