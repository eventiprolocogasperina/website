// Calcolo degli importi di un carrello, sempre sul server e sempre in centesimi interi.
// Funzione pura: il listino e lo sconto le arrivano già letti (vedi priceCartForOrder.ts),
// così si può testare senza database.

export type CatalogProduct = { id: string; label: string; unitPriceCents: number };

export type Catalog = {
  eventId: string;
  products: CatalogProduct[];
  /** Valori di `discounts.applies_to` validi per questo evento. */
  acceptedDiscountScopes: string[];
};

export type DiscountRow = {
  id: string;
  code: string;
  type: string; // 'FIXED' (euro) | 'PERCENTAGE'
  value: number | string;
  max_uses: number | null;
  current_uses: number | null;
  expiry_date?: string | Date | null;
  active: boolean;
  applies_to?: string | null;
};

export type CartLineInput = { type: string; quantity: unknown };

export type PricedLine = { type: string; quantity: number; unitPriceCents: number; totalCents: number };

export type PricedCart = {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  discountId?: string;
};

export type PricingErrorCode = 'UNKNOWN_PRODUCT' | 'INVALID_QUANTITY' | 'EMPTY_CART' | 'INVALID_DISCOUNT';

export class PricingError extends Error {
  constructor(public code: PricingErrorCode, message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

export const MAX_QUANTITY_PER_LINE = 50;

const normalize = (s: string) => s.trim().toLowerCase();

function findProduct(catalog: Catalog, type: string): CatalogProduct {
  const key = normalize(String(type ?? ''));
  const product = catalog.products.find((p) => normalize(p.label) === key || normalize(p.id) === key);
  if (!product) throw new PricingError('UNKNOWN_PRODUCT', `Prodotto sconosciuto: ${type}`);
  return product;
}

/** Verifica che lo sconto sia utilizzabile ora per questo evento. Restituisce il motivo se non lo è. */
export function discountProblem(discount: DiscountRow, catalog: Catalog, now: Date): string | null {
  if (!discount.active) return 'non attivo';
  if (discount.expiry_date && new Date(discount.expiry_date).getTime() <= now.getTime()) return 'scaduto';
  const maxUses = Number(discount.max_uses ?? 0);
  if (maxUses > 0 && Number(discount.current_uses ?? 0) >= maxUses) return 'esaurito';
  const scope = discount.applies_to || 'ALL';
  if (!catalog.acceptedDiscountScopes.includes(scope)) return 'non valido per questo evento';
  return null;
}

function discountAmountCents(discount: DiscountRow, subtotalCents: number): number {
  const value = Number(discount.value);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const type = String(discount.type).toUpperCase();
  let cents = 0;
  if (type === 'PERCENTAGE') cents = Math.round((subtotalCents * Math.min(value, 100)) / 100);
  else if (type === 'FIXED') cents = Math.round(value * 100);
  return Math.min(cents, subtotalCents);
}

/**
 * Calcola righe, subtotale, sconto e totale.
 * - Prezzi dal listino: quelli eventualmente inviati dal browser non vengono mai letti.
 * - Quantità intere da 1 a 50.
 * - `discount` è la riga letta dal database per il codice indicato (o null se il codice non esiste).
 */
export function priceCart(
  input: { lines: CartLineInput[]; discountCode?: string | null },
  catalog: Catalog,
  discount: DiscountRow | null,
  now: Date = new Date(),
): PricedCart {
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new PricingError('EMPTY_CART', 'Carrello vuoto');
  }

  const merged = new Map<string, PricedLine>();
  for (const line of input.lines) {
    const product = findProduct(catalog, line.type);
    const quantity = line.quantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
      throw new PricingError('INVALID_QUANTITY', `Quantità non valida per ${product.label}`);
    }
    const existing = merged.get(product.id);
    const newQuantity = (existing?.quantity ?? 0) + quantity;
    if (newQuantity > MAX_QUANTITY_PER_LINE) {
      throw new PricingError('INVALID_QUANTITY', `Quantità non valida per ${product.label}`);
    }
    merged.set(product.id, {
      type: product.label,
      quantity: newQuantity,
      unitPriceCents: product.unitPriceCents,
      totalCents: newQuantity * product.unitPriceCents,
    });
  }

  const lines = [...merged.values()];
  const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);

  let discountCents = 0;
  let discountId: string | undefined;
  if (input.discountCode) {
    if (!discount) throw new PricingError('INVALID_DISCOUNT', 'Codice sconto inesistente');
    const problem = discountProblem(discount, catalog, now);
    if (problem) throw new PricingError('INVALID_DISCOUNT', `Codice sconto ${problem}`);
    discountCents = discountAmountCents(discount, subtotalCents);
    discountId = discount.id;
  }

  return { lines, subtotalCents, discountCents, totalCents: subtotalCents - discountCents, discountId };
}

export const centsToEuro = (cents: number) => cents / 100;
