// Totali della cassa: chiusura Z di un turno e rendiconto dell'edizione (§12.1, prompt 14).
// Funzioni pure. Z e rendiconto usano lo stesso calcolo sugli stessi movimenti, così quadrano per
// costruzione: la Z è il rendiconto filtrato sul turno.
//
// Movimenti: i pagamenti (entrate) e gli storni degli annulli (uscite), ognuno col suo turno.
// "Contributi" = contanti + carta al netto degli storni. Gli omaggi si contano a parte, a valore.
import { romeDateKey } from '@/lib/dates';

export const POS_METHODS = ['cash', 'card_pos', 'complimentary'] as const;
export type PosMethod = (typeof POS_METHODS)[number];

export const METHOD_LABELS: Record<PosMethod, string> = { cash: 'Contanti', card_pos: 'Carta (POS)', complimentary: 'Omaggio' };

export type Movement = {
  kind: 'payment' | 'refund';
  orderId: string;
  method: PosMethod;
  amountCents: number;
  at: Date;
  sessionId: string | null;
  registerName: string;
  operatorName: string;
};

export type SoldLine = { orderId: string; productId: string; name: string; quantity: number; totalCents: number; voided: boolean };
export type SaleFlags = { orderId: string; voided: boolean; flagged: boolean };

export type MethodTotal = { method: PosMethod; label: string; count: number; amountCents: number; refundedCents: number; netCents: number };
export type GroupTotal = { key: string; label: string; sales: number; cashCents: number; cardCents: number; complimentaryCents: number; netCents: number };
export type ProductTotal = { productId: string; name: string; quantity: number; amountCents: number };

export type CashTotals = {
  sales: number;
  voided: number;
  flagged: number;
  /** Contanti + carta, al netto degli storni. */
  netCents: number;
  complimentaryCents: number;
  byMethod: MethodTotal[];
  products: ProductTotal[];
};

const signed = (m: Movement) => (m.kind === 'payment' ? m.amountCents : -m.amountCents);

export function totalsByMethod(movements: Movement[]): MethodTotal[] {
  return POS_METHODS.map((method) => {
    const own = movements.filter((m) => m.method === method);
    const amountCents = own.filter((m) => m.kind === 'payment').reduce((s, m) => s + m.amountCents, 0);
    const refundedCents = own.filter((m) => m.kind === 'refund').reduce((s, m) => s + m.amountCents, 0);
    const count = new Set(own.filter((m) => m.kind === 'payment').map((m) => m.orderId)).size;
    return { method, label: METHOD_LABELS[method], count, amountCents, refundedCents, netCents: amountCents - refundedCents };
  });
}

/** Venduto per prodotto, senza le vendite annullate. */
export function totalsByProduct(lines: SoldLine[]): ProductTotal[] {
  const map = new Map<string, ProductTotal>();
  for (const l of lines) {
    if (l.voided) continue;
    const row = map.get(l.productId) ?? { productId: l.productId, name: l.name, quantity: 0, amountCents: 0 };
    row.quantity += l.quantity;
    row.amountCents += l.totalCents;
    map.set(l.productId, row);
  }
  return [...map.values()].sort((a, b) => b.amountCents - a.amountCents || a.name.localeCompare(b.name, 'it'));
}

export function cashTotals(movements: Movement[], lines: SoldLine[], sales: SaleFlags[]): CashTotals {
  const byMethod = totalsByMethod(movements);
  const net = (m: PosMethod) => byMethod.find((x) => x.method === m)!.netCents;
  return {
    sales: sales.filter((s) => !s.voided).length,
    voided: sales.filter((s) => s.voided).length,
    flagged: sales.filter((s) => s.flagged).length,
    netCents: net('cash') + net('card_pos'),
    complimentaryCents: net('complimentary'),
    byMethod,
    products: totalsByProduct(lines),
  };
}

/** Raggruppa i movimenti per una dimensione (giorno, cassa, operatore). */
export function groupMovements(movements: Movement[], keyOf: (m: Movement) => string, labelOf: (key: string) => string = (k) => k): GroupTotal[] {
  const map = new Map<string, GroupTotal & { orders: Set<string> }>();
  for (const m of movements) {
    const key = keyOf(m);
    const row = map.get(key) ?? { key, label: labelOf(key), sales: 0, cashCents: 0, cardCents: 0, complimentaryCents: 0, netCents: 0, orders: new Set<string>() };
    const v = signed(m);
    if (m.method === 'cash') row.cashCents += v;
    else if (m.method === 'card_pos') row.cardCents += v;
    else row.complimentaryCents += v;
    if (m.method !== 'complimentary') row.netCents += v;
    if (m.kind === 'payment') row.orders.add(m.orderId);
    map.set(key, row);
  }
  return [...map.values()].map(({ orders, ...r }) => ({ ...r, sales: orders.size })).sort((a, b) => a.key.localeCompare(b.key, 'it'));
}

export const dayOf = (m: Movement) => romeDateKey(m.at);

/** Contante atteso nel cassetto: fondo cassa + incassi in contanti − storni in contanti del turno. */
export function expectedCash(openingFloatCents: number, movements: Movement[]): number {
  return openingFloatCents + movements.filter((m) => m.method === 'cash').reduce((s, m) => s + signed(m), 0);
}
