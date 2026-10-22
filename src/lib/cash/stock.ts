// Pezzi rimasti dei prodotti di cassa, come li mostra la griglia del telefono e l'admin. Funzioni pure.

/** Da quanti pezzi in giù il conteggio diventa rosso. */
export const LOW_STOCK = 5;

/** Pezzi ancora vendibili tolti quelli già nel carrello; null = senza limite. */
export function piecesLeft(remaining: number | null, inCart = 0): number | null {
  return remaining === null ? null : Math.max(0, remaining - inCart);
}

/** Pochi pezzi (rosso), esauriti compresi. */
export function isLowStock(left: number | null): boolean {
  return left !== null && left <= LOW_STOCK;
}

/** "12 rimasti", "1 rimasto", "Esaurito"; null per i prodotti senza limite. */
export function stockLabel(left: number | null): string | null {
  if (left === null) return null;
  if (left <= 0) return 'Esaurito';
  return left === 1 ? '1 rimasto' : `${left} rimasti`;
}
