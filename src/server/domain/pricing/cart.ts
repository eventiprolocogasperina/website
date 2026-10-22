// Calcolo degli importi sul catalogo delle edizioni (prompt 09). È l'unica funzione che decide i prezzi
// di checkout, cassa, pay-link e admin (§6): il browser manda solo prodotti e quantità.
// Funzione pura: catalogo e codice sconto arrivano già letti, così si testa senza database.
// Unica eccezione: l'"Altro" della cassa (prodotto `openPrice`), dove l'importo lo digita il cassiere.
import { isValidOpenAmount, MAX_OPEN_PRICE_CENTS } from '@/lib/cash/open-price';
import { formatMoney } from '@/lib/money';
import { DomainError } from '@/server/domain/errors';

export const ORDER_CHANNELS = ['online', 'pos', 'paylink', 'invite', 'admin'] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export const MAX_QUANTITY_PER_LINE = 50;

export type PricingProduct = {
  id: string;
  name: string;
  priceCents: number;
  channels: string[];
  requiresSession: boolean;
  active: boolean;
  department: string | null;
  minPerOrder: number | null;
  maxPerOrder: number | null;
  /** "Altro" della cassa: il prezzo è quello della riga, solo sul canale `pos`. */
  openPrice?: boolean;
};
export type PricingSession = { id: string; status: string };
export type PricingDiscount = {
  id: string;
  editionId: string | null;
  kind: 'percent' | 'fixed';
  value: number;
  maxUses: number | null;
  usedCount: number;
  validFrom: Date | null;
  validUntil: Date | null;
  appliesToProductIds: string[];
  active: boolean;
};

/** `unitPriceCents` vale solo per un prodotto `openPrice` in cassa: per tutti gli altri il prezzo è del catalogo. */
export type CartLine = { productId: string; quantity: number; sessionId?: string | null; unitPriceCents?: number | null };

export type PricedLine = {
  productId: string;
  sessionId: string | null;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  totalCents: number;
  department: string | null;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  discountId: string | null;
};

const invalid = (message: string) => new DomainError('VALIDATION', { message });

/** true se il canale può vendere il prodotto. Dall'admin si può vendere tutto il catalogo. */
export function channelAllows(product: Pick<PricingProduct, 'channels'>, channel: OrderChannel): boolean {
  return channel === 'admin' || product.channels.includes(channel);
}

/** Il motivo per cui uno sconto non vale ora su questa edizione, o null se vale. */
export function discountProblem(discount: PricingDiscount, editionId: string, now: Date): string | null {
  if (!discount.active) return 'non attivo';
  if (discount.editionId && discount.editionId !== editionId) return 'non valido per questa edizione';
  if (discount.validFrom && discount.validFrom.getTime() > now.getTime()) return 'non ancora valido';
  if (discount.validUntil && discount.validUntil.getTime() <= now.getTime()) return 'scaduto';
  if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) return 'esaurito';
  return null;
}

/**
 * Divide `amount` tra le righe in proporzione ai pesi, con il metodo dei resti più grandi:
 * la somma delle parti è sempre esattamente `amount`.
 */
export function allocate(amount: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (amount <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (amount * w) / total);
  const parts = exact.map(Math.floor);
  let rest = amount - parts.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rest <= 0) break;
    parts[i] += 1;
    rest -= 1;
  }
  return parts;
}

/**
 * Righe, subtotale, sconto e totale di un carrello.
 * - righe uguali (stesso prodotto e data; per "Altro" anche stesso importo) vengono unite;
 * - "Altro" (prodotto `openPrice`): solo in cassa, importo della riga da 0,01 a 1000 €;
 * - un prodotto che richiede la data prende quella della riga o quella dell'ordine;
 * - gli inviti sono sempre a 0 €;
 * - lo sconto vale sui prodotti indicati (tutti se nessuno) ed è diviso tra le righe al centesimo.
 */
export function priceCart(input: {
  editionId: string;
  channel: OrderChannel;
  lines: CartLine[];
  products: PricingProduct[];
  sessions: PricingSession[];
  sessionId?: string | null;
  discount?: PricingDiscount | null;
  now?: Date;
}): PricedCart {
  const { channel, products, sessions } = input;
  const now = input.now ?? new Date();
  if (!input.lines.length) throw invalid('Il carrello è vuoto.');

  const merged = new Map<string, { product: PricingProduct; sessionId: string | null; quantity: number; unitPriceCents: number }>();
  for (const line of input.lines) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) throw invalid('Uno dei prodotti non esiste più. Ricarica la pagina.');
    if (!product.active || !channelAllows(product, channel)) throw new DomainError('SALES_CLOSED', { message: `${product.name} non è in vendita.` });
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY_PER_LINE) throw invalid(`Quantità non valida per ${product.name}.`);

    // Il prezzo dal browser si accetta solo per l'"Altro" della cassa, mai per un prodotto del listino (§18.1).
    let unitPriceCents = channel === 'invite' ? 0 : product.priceCents;
    if (product.openPrice) {
      if (channel !== 'pos') throw new DomainError('SALES_CLOSED', { message: `${product.name} si usa solo in cassa.` });
      if (line.unitPriceCents == null || !isValidOpenAmount(line.unitPriceCents)) throw invalid(`Scrivi un importo per ${product.name} tra 0,01 € e ${formatMoney(MAX_OPEN_PRICE_CENTS)}.`);
      unitPriceCents = line.unitPriceCents;
    } else if (line.unitPriceCents != null) {
      throw invalid(`Il prezzo di ${product.name} lo decide il catalogo.`);
    }

    let sessionId: string | null = null;
    if (product.requiresSession) {
      sessionId = line.sessionId ?? input.sessionId ?? null;
      if (!sessionId) throw invalid(`Scegli la data per ${product.name}.`);
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) throw invalid('La data scelta non esiste.');
      if (session.status === 'sold_out') throw new DomainError('SOLD_OUT');
      if (session.status !== 'open' && channel !== 'admin') throw new DomainError('SALES_CLOSED', { message: 'La data scelta non è in vendita.' });
    }

    const key = `${product.id}|${sessionId ?? ''}${product.openPrice ? `|${unitPriceCents}` : ''}`;
    const prev = merged.get(key);
    if (prev) prev.quantity += line.quantity;
    else merged.set(key, { product, sessionId, quantity: line.quantity, unitPriceCents });
  }

  // Minimo e massimo per ordine valgono sul totale del prodotto, tutte le date insieme.
  const perProduct = new Map<string, number>();
  for (const l of merged.values()) perProduct.set(l.product.id, (perProduct.get(l.product.id) ?? 0) + l.quantity);
  for (const [id, quantity] of perProduct) {
    const p = products.find((x) => x.id === id)!;
    if (p.minPerOrder !== null && quantity < p.minPerOrder) throw invalid(`${p.name}: almeno ${p.minPerOrder} per ordine.`);
    if (p.maxPerOrder !== null && quantity > p.maxPerOrder) throw invalid(`${p.name}: al massimo ${p.maxPerOrder} per ordine.`);
  }

  const lines: PricedLine[] = [...merged.values()].map(({ product, sessionId, quantity, unitPriceCents }) => {
    return { productId: product.id, sessionId, quantity, unitPriceCents, discountCents: 0, totalCents: unitPriceCents * quantity, department: product.department };
  });
  const subtotalCents = lines.reduce((s, l) => s + l.totalCents, 0);

  let discountCents = 0;
  let discountId: string | null = null;
  const discount = input.discount;
  if (discount) {
    if (channel === 'invite') throw new DomainError('DISCOUNT_INVALID', { message: 'Gli inviti non usano codici sconto.' });
    const problem = discountProblem(discount, input.editionId, now);
    if (problem) throw new DomainError('DISCOUNT_INVALID', { message: `Il codice sconto è ${problem}.` });
    const eligible = lines.map((l) => (discount.appliesToProductIds.length === 0 || discount.appliesToProductIds.includes(l.productId) ? l.totalCents : 0));
    const base = eligible.reduce((a, b) => a + b, 0);
    if (base === 0) throw new DomainError('DISCOUNT_INVALID', { message: 'Il codice sconto non vale per questi prodotti.' });
    discountCents = Math.min(base, discount.kind === 'percent' ? Math.round((base * Math.min(discount.value, 100)) / 100) : discount.value);
    allocate(discountCents, eligible).forEach((d, i) => {
      lines[i].discountCents = d;
      lines[i].totalCents -= d;
    });
    discountId = discount.id;
  }

  return { lines, subtotalCents, discountCents, totalCents: subtotalCents - discountCents, discountId };
}
