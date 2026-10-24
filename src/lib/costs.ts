// Costi e inventario: elenchi ed etichette condivisi tra admin e server. Funzioni pure.

/** Categorie dei costi. Si possono cambiare qui: nel database sono testo, senza migrazioni. */
export const COST_CATEGORIES = [
  'Materiali',
  'Alimenti e bevande',
  'Noleggi',
  'Servizi e allestimenti',
  'SIAE e permessi',
  'Promozione e stampa',
  'Assicurazioni',
  'Rimborsi spese volontari',
  'Altro',
] as const;

export const COST_PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'other'] as const;
export type CostPaymentMethod = (typeof COST_PAYMENT_METHODS)[number];
export const COST_PAYMENT_LABELS: Record<CostPaymentMethod, string> = { cash: 'Contanti', bank_transfer: 'Bonifico', card: 'Carta', other: 'Altro' };

/** Cartella Cloudinary delle ricevute (asset privati, mai pubblici). */
export const RECEIPT_FOLDER = 'pro-loco-gasperina/costi';

/** Ricevuta privata su Cloudinary: si apre solo da /api/admin/costi/[id]/ricevuta. */
export type ReceiptRef = { publicId: string; resourceType: 'image' | 'raw'; format: string | null };

/** Indirizzo dell'admin che apre la ricevuta di un costo (permesso + registro + link firmato a scadenza). */
export const receiptHref = (costId: string) => `/api/admin/costi/${costId}/ricevuta`;

/** Categorie del materiale (suggerite: il campo accetta anche altro testo). */
export const INVENTORY_CATEGORIES = ['Allestimento', 'Cucina', 'Elettrico e luci', 'Audio', 'Gazebo e tende', 'Tavoli e sedie', 'Segnaletica', 'Attrezzi', 'Altro'] as const;

export const INVENTORY_CONDITIONS = ['good', 'needs_repair', 'broken'] as const;
export type InventoryCondition = (typeof INVENTORY_CONDITIONS)[number];
export const INVENTORY_CONDITION_LABELS: Record<InventoryCondition, string> = { good: 'Buono', needs_repair: 'Da riparare', broken: 'Fuori uso' };

export const ADJUSTMENT_KINDS = ['added', 'lost', 'broken', 'correction'] as const;
export type AdjustmentKind = (typeof ADJUSTMENT_KINDS)[number];
export const MOVEMENT_LABELS: Record<AdjustmentKind | 'event_use', string> = {
  added: 'Aggiunta',
  event_use: 'Uso per evento',
  lost: 'Perso',
  broken: 'Rotto',
  correction: 'Correzione',
};

/** Segno della variazione di una rettifica: perso e rotto tolgono, aggiunta aggiunge, correzione come scritta. */
export function adjustmentDelta(kind: AdjustmentKind, quantity: number): number {
  if (kind === 'lost' || kind === 'broken') return -Math.abs(quantity);
  if (kind === 'added') return Math.abs(quantity);
  return quantity;
}

export type CostTotals = { byCategory: Array<{ category: string; cents: number }>; totalCents: number };

/** Totali per categoria (nell'ordine dell'elenco, poi le altre) delle sole voci non annullate. */
export function costTotals(rows: ReadonlyArray<{ category: string; amountCents: number; voidedAt?: Date | string | null }>): CostTotals {
  const map = new Map<string, number>();
  for (const r of rows) if (!r.voidedAt) map.set(r.category, (map.get(r.category) ?? 0) + r.amountCents);
  const order = (c: string) => {
    const i = (COST_CATEGORIES as readonly string[]).indexOf(c);
    return i === -1 ? COST_CATEGORIES.length : i;
  };
  const byCategory = [...map].map(([category, cents]) => ({ category, cents })).sort((a, b) => order(a.category) - order(b.category) || a.category.localeCompare(b.category));
  return { byCategory, totalCents: byCategory.reduce((s, c) => s + c.cents, 0) };
}

/** Saldo del rendiconto: entrate nette meno costi. */
export const balanceCents = (incomeCents: number, costCents: number) => incomeCents - costCents;
