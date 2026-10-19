import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { cashRegisters, editions, products } from '@/server/db/schema';
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
  const list = all
    .filter((p) => p.channels.includes('pos') && !p.requiresSession && (!r.productIds || r.productIds.includes(p.id)))
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
    version: list.map((p) => `${p.id}:${p.remaining ?? '-'}:${p.priceCents}:${p.active ? 1 : 0}`).join('|'),
  };
}

export type PosProductOption = { id: string; name: string; group: string; department: string | null; priceCents: number; active: boolean };

/** Tutti i prodotti vendibili in cassa dell'edizione (per scegliere cosa vende ogni cassa, in admin). */
export async function listPosProducts(editionId: string): Promise<PosProductOption[]> {
  const all = await getDb().select().from(products).where(eq(products.editionId, editionId)).orderBy(asc(products.sort), asc(products.name));
  return all
    .filter((p) => p.channels.includes('pos') && !p.requiresSession)
    .map((p) => ({ id: p.id, name: p.name, group: p.department?.trim() || KIND_GROUP[p.kind] || 'Altro', department: p.department?.trim() || null, priceCents: p.priceCents, active: p.active }));
}
