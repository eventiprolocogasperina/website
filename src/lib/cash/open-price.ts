// "Altro" della cassa: una riga con un importo libero digitato dal cassiere, al posto di un prodotto
// del listino. Costanti condivise tra il telefono e il server; il server le ricontrolla sempre (§18.1).

export const OPEN_PRICE_NAME = 'Altro';

/** Importo massimo di una riga "Altro": 1000 €. */
export const MAX_OPEN_PRICE_CENTS = 100_000;

export function isValidOpenAmount(cents: number): boolean {
  return Number.isInteger(cents) && cents >= 1 && cents <= MAX_OPEN_PRICE_CENTS;
}
