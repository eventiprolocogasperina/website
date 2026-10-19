// Conteggio della cassa alla chiusura del turno (§12.1): tagli da 500 € a 1 centesimo. Funzioni pure,
// usate dall'app /cassa e dal server (che ricalcola sempre il totale dal conteggio, §18.1).

/** Tagli in centesimi, dal più grande. */
export const DENOMINATIONS_CENTS = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

/** Oltre questa differenza (in valore assoluto) tra contato e atteso serve una nota. */
export const DIFFERENCE_NOTE_THRESHOLD_CENTS = 100;

export type DenominationCounts = Record<string, number>;

/** "500 €", "2 €", "50 cent". */
export function denominationLabel(cents: number): string {
  return cents >= 100 ? `${cents / 100} €` : `${cents} cent`;
}

/** true per le banconote (da 5 € in su). */
export const isBanknote = (cents: number) => cents >= 500;

/** Totale contato. Ignora tagli sconosciuti e quantità non intere o negative (le rifiuta il server). */
export function countTotal(counts: DenominationCounts): number {
  return DENOMINATIONS_CENTS.reduce((sum, d) => {
    const n = counts[String(d)] ?? 0;
    return Number.isInteger(n) && n > 0 ? sum + d * n : sum;
  }, 0);
}

/** Problemi del conteggio: tagli inesistenti, quantità non valide. Vuoto se è tutto a posto. */
export function countProblems(counts: DenominationCounts): string[] {
  const out: string[] = [];
  for (const [k, n] of Object.entries(counts)) {
    if (!DENOMINATIONS_CENTS.includes(Number(k) as (typeof DENOMINATIONS_CENTS)[number])) out.push(`Taglio sconosciuto: ${k}`);
    else if (!Number.isInteger(n) || n < 0 || n > 100_000) out.push(`Quantità non valida per ${denominationLabel(Number(k))}`);
  }
  return out;
}

/** Serve una nota se contato e atteso differiscono di più di 1 €. */
export function needsDifferenceNote(differenceCents: number): boolean {
  return Math.abs(differenceCents) > DIFFERENCE_NOTE_THRESHOLD_CENTS;
}
