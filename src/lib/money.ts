// Gli importi si gestiscono sempre in centesimi interi; gli euro decimali esistono solo
// ai bordi (input dell'utente, colonne NUMERIC legacy).

const eurFormatter = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

/** Converte euro (numero o stringa NUMERIC, es. "11.70") in centesimi, arrotondando al centesimo. */
export function toCents(euros: number | string): number {
  const value = typeof euros === 'string' ? Number(euros.replace(',', '.')) : euros;
  if (!Number.isFinite(value)) throw new RangeError(`Importo non valido: ${euros}`);
  // toFixed evita gli errori binari tipo 1.005 * 100 = 100.49999…
  return Math.round(Number((value * 100).toFixed(6)));
}

export function fromCents(cents: number): number {
  if (!Number.isInteger(cents)) throw new RangeError(`Centesimi non interi: ${cents}`);
  return cents / 100;
}

/** "11,70 €" */
export function formatMoney(cents: number): string {
  return eurFormatter.format(fromCents(cents));
}
