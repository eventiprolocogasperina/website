// Gli importi si gestiscono sempre in centesimi interi; gli euro decimali esistono solo
// ai bordi (input dell'utente, colonne NUMERIC legacy).

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

/**
 * "11,70 €", "1.234,56 €". Formattazione scritta a mano invece di Intl: Node e i browser hanno
 * versioni diverse dei dati ICU (Node non separa le migliaia sotto 10.000, Chrome sì) e una
 * differenza tra server e client rompe l'idratazione di React.
 */
export function formatMoney(cents: number): string {
  if (!Number.isInteger(cents)) throw new RangeError(`Centesimi non interi: ${cents}`);
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = String(abs % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}${euros},${decimals}\u00a0€`;
}
