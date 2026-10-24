import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { MAX_OPEN_PRICE_CENTS, OPEN_PRICE_NAME } from '@/lib/cash/open-price';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { cashRegisters, editions, products } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { getAvailability } from '@/server/domain/catalog';
import { DomainError } from '@/server/domain/errors';
import { printerOf } from './registers';

export type PosProduct = {
  id: string;
  name: string;
  icon: string | null;
  kind: string;
  priceCents: number;
  /** Gruppo nella griglia della cassa: il reparto, oppure il tipo di prodotto. */
  group: string;
  department: string | null;
  /** Pezzi rimasti secondo le quote; null = senza limite. */
  remaining: number | null;
  active: boolean;
};

const KIND_GROUP: Record<string, string> = { food: 'Cibo', drink: 'Bevande', merch: 'Gadget', donation: 'Offerte', ticket: 'Biglietti', addon: 'Extra', service: 'Servizi' };

export type PosCatalog = {
  edition: { id: string; slug: string; title: string; status: string; departments: boolean };
  register: { id: string; name: string; issuesNumbers: boolean; printer: ReturnType<typeof printerOf> };
  products: PosProduct[];
  /** Pulsante "Altro" (importo libero): acceso solo sulle casse che lo permettono e se in Catalogo il prodotto "Altro" è attivo. */
  openPrice: { available: boolean; maxCents: number };
  /** Firma delle scorte: cambia quando cambia qualcosa che la cassa mostra (per il tempo reale). */
  version: string;
};

/**
 * Prodotti di una cassa (§12.1): quelli dell'edizione con il canale `pos`, limitati alla cassa se
 * indicati, con le scorte calcolate dalle quote come per ogni altro canale (§5.4).
 */
export async function getPosCatalog(registerId: string): Promise<PosCatalog> {
  const db = getDb();
  const [row] = await db.select({ r: cashRegisters, e: editions }).from(cashRegisters).innerJoin(editions, eq(editions.id, cashRegisters.editionId)).where(eq(cashRegisters.id, registerId));
  if (!row) throw new DomainError('NOT_FOUND');
  const { r, e } = row;
  const [all, availability] = await Promise.all([
    db.select().from(products).where(eq(products.editionId, e.id)).orderBy(asc(products.sort), asc(products.name)),
    getAvailability(e.id),
  ]);
  const open = all.find((p) => p.openPrice);
  const openPrice = { available: r.allowOpenAmount && (!open || open.active), maxCents: MAX_OPEN_PRICE_CENTS };
  const list = all
    .filter((p) => !p.openPrice && p.channels.includes('pos') && !p.requiresSession && (!r.productIds || r.productIds.includes(p.id)))
    .map<PosProduct>((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      kind: p.kind,
      priceCents: p.priceCents,
      group: p.department?.trim() || KIND_GROUP[p.kind] || 'Altro',
      department: p.department,
      remaining: p.active ? (availability.products.find((a) => a.productId === p.id && a.sessionId === null)?.remaining ?? null) : 0,
      active: p.active,
    }));
  return {
    edition: { id: e.id, slug: e.slug, title: e.title, status: e.status, departments: e.enabledModules.includes('departments') },
    register: { id: r.id, name: r.name, issuesNumbers: r.issuesNumbers, printer: printerOf(r) },
    products: list,
    openPrice,
    version: `${list.map((p) => `${p.id}:${p.remaining ?? '-'}:${p.priceCents}:${p.active ? 1 : 0}`).join('|')}|altro:${openPrice.available ? 1 : 0}`,
  };
}

export type PosProductOption = {
  id: string;
  name: string;
  group: string;
  department: string | null;
  priceCents: number;
  active: boolean;
  /** Pezzi rimasti secondo le quote, come li vede la cassa; null = senza limite. */
  remaining: number | null;
};

/** Tutti i prodotti vendibili in cassa dell'edizione, con i pezzi rimasti (per l'admin: cosa vende ogni cassa, scorte). */
export async function listPosProducts(editionId: string): Promise<PosProductOption[]> {
  const [all, availability] = await Promise.all([
    getDb().select().from(products).where(eq(products.editionId, editionId)).orderBy(asc(products.sort), asc(products.name)),
    getAvailability(editionId),
  ]);
  return all
    .filter((p) => !p.openPrice && p.channels.includes('pos') && !p.requiresSession)
    .map((p) => ({
      id: p.id,
      name: p.name,
      group: p.department?.trim() || KIND_GROUP[p.kind] || 'Altro',
      department: p.department?.trim() || null,
      priceCents: p.priceCents,
      active: p.active,
      remaining: availability.products.find((a) => a.productId === p.id && a.sessionId === null)?.remaining ?? null,
    }));
}

/**
 * Il prodotto "Altro" dell'edizione (importo libero in cassa), creato alla prima vendita che lo usa.
 * Uno solo per edizione (indice unico): due telefoni insieme ottengono lo stesso. Si vende solo dalle
 * casse con "Altro" acceso (cash_registers.allow_open_amount); disattivato in Catalogo, spento su tutte. Non si crea mai in un'edizione archiviata (§18.7).
 */
export async function ensureOpenPriceProduct(ctx: Ctx, editionId: string): Promise<string> {
  const find = async (db: Tx | ReturnType<typeof getDb>) =>
    (await db.select({ id: products.id }).from(products).where(and(eq(products.editionId, editionId), eq(products.openPrice, true))))[0]?.id;
  const existing = await find(getDb());
  if (existing) return existing;
  return withTransaction(async (tx) => {
    const [edition] = await tx.select({ slug: editions.slug, status: editions.status }).from(editions).where(eq(editions.id, editionId));
    if (!edition) throw new DomainError('NOT_FOUND');
    if (edition.status === 'archived') throw new DomainError('EDITION_ARCHIVED');
    const values = { kind: 'service' as const, name: OPEN_PRICE_NAME, description: 'Importo libero digitato in cassa.', priceCents: 0, channels: ['pos'], openPrice: true, sort: 9999 };
    const [row] = await tx
      .insert(products)
      .values({ ...values, editionId })
      .onConflictDoNothing()
      .returning({ id: products.id });
    if (!row) {
      const id = await find(tx);
      if (!id) throw new DomainError('CONFLICT');
      return id;
    }
    await audit(tx, ctx, 'product.created', { entityType: 'product', entityId: row.id, edition: edition.slug, after: values });
    return row.id;
  });
}
