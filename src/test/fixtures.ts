// Dati di prova per i test sul database: un'edizione con date, prodotti e quote, e i contesti dei ruoli.
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import type { RoleGrant } from '@/server/auth/permissions';
import { checkinLists, editions, products, quotaProducts, quotas, sessions, discountsV2 } from '@/server/db/schema';
import { MODULE_KEYS } from '@/modules/registry';
import type { ModuleKey } from '@/modules/types';
import { getDb } from './pg-client';

export const ctxWith = (grants: RoleGrant[]): Ctx => ({ user: null, device: null, legacy: false, grants, ip: null });
export const owner: Ctx = ctxWith([{ role: 'owner', edition: null }]);
export const anon: Ctx = { user: null, device: null, legacy: false, grants: [], ip: '203.0.113.1' };
export const system: Ctx = { ...anon, ip: null, system: 'test' };
export const roleOn = (role: RoleGrant['role'], edition: string | null): Ctx => ctxWith([{ role, edition }]);

export type Fixture = Awaited<ReturnType<typeof createEdition>>;

/**
 * Edizione "in vendita" con:
 * - due date (capienza 2 e 1000), un biglietto con data, un extra con data, un prodotto di cassa;
 * - una quota "Laboratorio" da 1 posto sull'extra;
 * - una lista di check-in per l'ingresso;
 * - tutti i moduli attivi, salvo `modules` diverso.
 */
export async function createEdition(opts: { status?: (typeof editions.$inferSelect)['status']; modules?: ModuleKey[] } = {}) {
  const db = getDb();
  const slug = `test-${randomUUID().slice(0, 8)}`;
  const [edition] = await db
    .insert(editions)
    .values({
      slug,
      title: `Test ${slug}`,
      year: 2026,
      status: opts.status ?? 'on_sale',
      enabledModules: opts.modules ?? MODULE_KEYS,
      location: 'Gasperina',
      startsAt: new Date('2026-10-24T08:00:00Z'),
    })
    .returning();
  const [day1, day2] = await db
    .insert(sessions)
    .values([
      { editionId: edition.id, label: 'Sab 24 ott', startsAt: new Date('2026-10-24T08:00:00Z'), capacity: 2 },
      { editionId: edition.id, label: 'Dom 25 ott', startsAt: new Date('2026-10-25T08:00:00Z'), capacity: 1000 },
    ])
    .returning();
  const [ticket, lab, drink] = await db
    .insert(products)
    .values([
      { editionId: edition.id, kind: 'ticket', name: 'Ingresso', priceCents: 500, channels: ['online', 'pos', 'invite'], requiresSession: true, issuesTicket: true },
      { editionId: edition.id, kind: 'addon', name: 'Laboratorio', priceCents: 300, channels: ['online'], requiresSession: true, issuesTicket: true },
      { editionId: edition.id, kind: 'drink', name: 'Acqua', priceCents: 100, channels: ['pos'] },
    ])
    .returning();
  const [labQuota] = await db.insert(quotas).values({ editionId: edition.id, name: 'Laboratorio', size: 1 }).returning();
  await db.insert(quotaProducts).values({ quotaId: labQuota.id, productId: lab.id });
  const [entrance] = await db.insert(checkinLists).values({ editionId: edition.id, name: 'Ingresso', productIds: [ticket.id] }).returning();
  return { edition, slug, day1, day2, ticket, lab, drink, labQuota, entrance };
}

/** Completa ciò che serve per aprire le vendite (procedura guidata): descrizione e regolamento. */
export async function makeSalesReady(editionId: string) {
  await getDb()
    .update(editions)
    .set({ subtitle: 'Edizione di prova', pageBlocks: [{ id: 'regole', type: 'Allegati', hidden: false, props: { title: 'Allegati', items: [{ label: 'Regolamento', url: 'https://example.com/regolamento.pdf' }] } }] })
    .where(eq(editions.id, editionId));
}

export async function createDiscount(values: Partial<typeof discountsV2.$inferInsert> & { code: string }) {
  const [row] = await getDb()
    .insert(discountsV2)
    .values({ kind: 'percent', value: 10, ...values })
    .returning();
  return row;
}

export const key = () => `test-${randomUUID()}`;
export const buyer = { email: 'Mario.Rossi@Example.com', name: 'Mario Rossi', phone: '+39 333 1234567' };
