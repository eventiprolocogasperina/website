// Resto e importi rapidi del tastierino contanti (§12.1). Funzioni pure, in centesimi.

/** Resto da dare, oppure null se il contante ricevuto non basta. */
export function changeFor(totalCents: number, receivedCents: number): number | null {
  if (!Number.isInteger(totalCents) || !Number.isInteger(receivedCents)) return null;
  return receivedCents >= totalCents ? receivedCents - totalCents : null;
}

/**
 * Banconote "comode" per il totale: l'importo esatto più i primi tagli sopra il totale
 * (es. 7,50 € → 7,50 · 10 · 20 · 50). Al massimo quattro pulsanti.
 */
export function quickAmounts(totalCents: number): number[] {
  if (totalCents <= 0) return [];
  const out = new Set<number>([totalCents]);
  for (const step of [500, 1000, 2000, 5000, 10000]) {
    const up = Math.ceil(totalCents / step) * step;
    if (up > totalCents) out.add(up);
    if (out.size >= 4) break;
  }
  return [...out].sort((a, b) => a - b).slice(0, 4);
}

/** Aggiunge cifre al tastierino in centesimi, come le casse: "1","2","5","0" → 12,50 €. */
export function pushDigit(currentCents: number, digit: string): number {
  if (!/^\d{1,2}$/.test(digit)) return currentCents;
  const next = Number(`${currentCents}${digit}`);
  return next > 999_999 ? currentCents : next;
}

export function popDigit(currentCents: number): number {
  return Math.floor(currentCents / 10);
}
