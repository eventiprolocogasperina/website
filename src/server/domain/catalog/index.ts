import 'server-only';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import { romeDateTime } from '@/lib/dates';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { discountsV2, editions, orderLines, products, quotaProducts, quotas, sessions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { assertCan, editionForWrite } from '@/server/domain/editions';
import { DomainError } from '@/server/domain/errors';
import { soldCounts } from '@/server/domain/orders/shared';
import { computeAvailability, type Availability, type SoldCounts } from '@/server/domain/quotas/availability';
import { legacySoldCounts } from '@/server/domain/quotas/legacy-sold';

export const PRODUCT_KINDS = ['ticket', 'addon', 'food', 'drink', 'merch', 'donation', 'service'] as const;
export const CHANNELS = ['online', 'pos', 'paylink', 'invite'] as const;
export const SESSION_STATUSES = ['open', 'closed', 'sold_out', 'cancelled', 'postponed'] as const;

export type SessionRow = typeof sessions.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type QuotaRow = typeof quotas.$inferSelect & { productIds: string[] };
export type DiscountRow = typeof discountsV2.$inferSelect;
export type Catalog = { sessions: SessionRow[]; products: ProductRow[]; quotas: QuotaRow[]; discounts: DiscountRow[] };

async function editionIdFor(slug: string): Promise<string> {
  const [row] = await getDb().select({ id: editions.id }).from(editions).where(eq(editions.slug, slug));
  if (!row) throw new DomainError('NOT_FOUND');
  return row.id;
}

export async function getCatalog(ctx: Ctx, slug: string): Promise<Catalog> {
  assertCan(ctx, 'catalog.edit', slug);
  const editionId = await editionIdFor(slug);
  return loadCatalog(editionId);
}

async function loadCatalog(editionId: string): Promise<Catalog> {
  const db = getDb();
  const [s, p, q, d] = await Promise.all([
    db.select().from(sessions).where(eq(sessions.editionId, editionId)).orderBy(asc(sessions.startsAt), asc(sessions.sort)),
    db.select().from(products).where(eq(products.editionId, editionId)).orderBy(asc(products.sort), asc(products.name)),
    db.select().from(quotas).where(eq(quotas.editionId, editionId)).orderBy(asc(quotas.name)),
    db.select().from(discountsV2).where(eq(discountsV2.editionId, editionId)).orderBy(asc(discountsV2.code)),
  ]);
  const links = q.length ? await db.select().from(quotaProducts).where(inArray(quotaProducts.quotaId, q.map((x) => x.id))) : [];
  return { sessions: s, products: p, quotas: q.map((x) => ({ ...x, productIds: links.filter((l) => l.quotaId === x.id).map((l) => l.productId) })), discounts: d };
}

/**
 * Posti occupati: vendite delle tabelle attuali (adattatore del prompt 08) più gli ordini del nucleo
 * nuovo. Fino alla migrazione del prompt 10 un'edizione ha vendite solo da una delle due parti.
 */
async function allSoldCounts(editionId: string): Promise<SoldCounts> {
  const [legacy, current] = await Promise.all([legacySoldCounts(editionId), soldCounts(getDb(), editionId, { now: new Date() })]);
  for (const [k, n] of current) legacy.set(k, (legacy.get(k) ?? 0) + n);
  return legacy;
}

/** Posti residui per prodotto e data, calcolati dalle quote. */
export async function getAvailability(editionId: string, catalog?: Catalog): Promise<Availability> {
  const c = catalog ?? (await loadCatalog(editionId));
  const sold = await allSoldCounts(editionId);
  return computeAvailability({ products: c.products, sessions: c.sessions, quotas: c.quotas, sold });
}

export async function getCatalogWithAvailability(ctx: Ctx, slug: string) {
  assertCan(ctx, 'catalog.edit', slug);
  const editionId = await editionIdFor(slug);
  const catalog = await loadCatalog(editionId);
  return { catalog, availability: await getAvailability(editionId, catalog) };
}

async function writable(ctx: Ctx, tx: Tx, slug: string) {
  assertCan(ctx, 'catalog.edit', slug);
  return editionForWrite(tx, slug);
}

/**
 * Un prodotto o una data con vendite non si elimina: si disattiva o si chiude.
 * Contano le vendite delle tabelle attuali e ogni riga d'ordine del nucleo nuovo, anche annullata
 * (ordini e righe non si cancellano mai, §18).
 */
async function assertNothingSold(editionId: string, check: (key: string) => boolean, what: string, ref: { productId?: string; sessionId?: string }) {
  const sold = await legacySoldCounts(editionId);
  const [line] = await getDb()
    .select({ id: orderLines.id })
    .from(orderLines)
    .where(ref.productId ? eq(orderLines.productId, ref.productId) : eq(orderLines.sessionId, ref.sessionId!))
    .limit(1);
  if (line || [...sold].some(([key, n]) => n > 0 && check(key))) {
    throw new DomainError('CONFLICT', { message: `${what} ha già delle vendite: non si può eliminare. Disattivalo o chiudilo invece.` });
  }
}

// ─── Date ────────────────────────────────────────────────────────────────────

const optionalInt = z.number().int().min(0).max(1_000_000).nullable();

export const SessionInput = z
  .object({
    label: z.string().trim().min(2, 'Scrivi un’etichetta, es. Dom 25 ott.').max(80),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Scegli una data.'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Ora non valida.'),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Ora non valida.')
      .nullable(),
    capacity: optionalInt,
    status: z.enum(SESSION_STATUSES),
  })
  .refine((v) => !v.endTime || v.endTime > v.startTime, { message: 'La fine deve venire dopo l’inizio.', path: ['endTime'] });
export type SessionInput = z.input<typeof SessionInput>;

export async function saveSession(ctx: Ctx, slug: string, id: string | null, input: SessionInput): Promise<{ id: string }> {
  assertCan(ctx, 'catalog.edit', slug);
  const data = SessionInput.parse(input);
  return withTransaction(async (tx) => {
    const edition = await writable(ctx, tx, slug);
    const values = {
      label: data.label,
      startsAt: romeDateTime(data.date, data.startTime),
      endsAt: data.endTime ? romeDateTime(data.date, data.endTime) : null,
      capacity: data.capacity,
      status: data.status,
    };
    if (!id) {
      const [row] = await tx.insert(sessions).values({ ...values, editionId: edition.id }).returning({ id: sessions.id });
      await audit(tx, ctx, 'session.created', { entityType: 'session', entityId: row.id, edition: slug, after: values });
      return row;
    }
    const [before] = await tx.select().from(sessions).where(and(eq(sessions.id, id), eq(sessions.editionId, edition.id)));
    if (!before) throw new DomainError('NOT_FOUND');
    await tx.update(sessions).set({ ...values, updatedAt: new Date() }).where(eq(sessions.id, id));
    await audit(tx, ctx, 'session.updated', {
      entityType: 'session',
      entityId: id,
      edition: slug,
      before: { label: before.label, startsAt: before.startsAt, endsAt: before.endsAt, capacity: before.capacity, status: before.status },
      after: values,
    });
    return { id };
  });
}

export async function deleteSession(ctx: Ctx, slug: string, id: string): Promise<void> {
  assertCan(ctx, 'catalog.edit', slug);
  const editionId = await editionIdFor(slug);
  await assertNothingSold(editionId, (key) => key.endsWith(`|${id}`), 'Questa data', { sessionId: id });
  await withTransaction(async (tx) => {
    const edition = await writable(ctx, tx, slug);
    const [row] = await tx.delete(sessions).where(and(eq(sessions.id, id), eq(sessions.editionId, edition.id))).returning();
    if (!row) throw new DomainError('NOT_FOUND');
    await audit(tx, ctx, 'session.deleted', { entityType: 'session', entityId: id, edition: slug, before: { label: row.label, startsAt: row.startsAt } });
  });
}

// ─── Prodotti ────────────────────────────────────────────────────────────────

export const ProductInput = z
  .object({
    kind: z.enum(PRODUCT_KINDS),
    name: z.string().trim().min(2, 'Scrivi il nome del prodotto.').max(120),
    description: z
      .string()
      .trim()
      .max(1000)
      .transform((v) => v || null)
      .nullable(),
    icon: z
      .string()
      .trim()
      .max(40)
      .transform((v) => v || null)
      .nullable(),
    priceCents: z.number({ error: 'Indica il prezzo.' }).int().min(0, 'Il prezzo non può essere negativo.').max(100_000_00),
    channels: z.array(z.enum(CHANNELS)).min(1, 'Scegli almeno un canale di vendita.'),
    requiresSession: z.boolean(),
    issuesTicket: z.boolean(),
    department: z
      .string()
      .trim()
      .max(60)
      .transform((v) => v || null)
      .nullable(),
    active: z.boolean(),
    minPerOrder: optionalInt,
    maxPerOrder: optionalInt,
  })
  .refine((v) => v.minPerOrder === null || v.maxPerOrder === null || v.minPerOrder <= v.maxPerOrder, {
    message: 'Il massimo per ordine deve essere almeno pari al minimo.',
    path: ['maxPerOrder'],
  });
export type ProductInput = z.input<typeof ProductInput>;

export async function saveProduct(ctx: Ctx, slug: string, id: string | null, input: ProductInput): Promise<{ id: string }> {
  assertCan(ctx, 'catalog.edit', slug);
  const data = ProductInput.parse(input);
  return withTransaction(async (tx) => {
    const edition = await writable(ctx, tx, slug);
    if (!id) {
      const existing = await tx.select({ id: products.id }).from(products).where(eq(products.editionId, edition.id));
      const [row] = await tx
        .insert(products)
        .values({ ...data, editionId: edition.id, sort: existing.length })
        .returning({ id: products.id });
      await audit(tx, ctx, 'product.created', { entityType: 'product', entityId: row.id, edition: slug, after: data });
      return row;
    }
    const [before] = await tx.select().from(products).where(and(eq(products.id, id), eq(products.editionId, edition.id)));
    if (!before) throw new DomainError('NOT_FOUND');
    await tx.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id));
    const changed = Object.fromEntries(Object.entries(data).filter(([k, v]) => JSON.stringify(before[k as keyof typeof before]) !== JSON.stringify(v)));
    if (Object.keys(changed).length) {
      await audit(tx, ctx, 'product.updated', {
        entityType: 'product',
        entityId: id,
        edition: slug,
        before: Object.fromEntries(Object.keys(changed).map((k) => [k, before[k as keyof typeof before]])),
        after: changed,
      });
    }
    return { id };
  });
}

export async function deleteProduct(ctx: Ctx, slug: string, id: string): Promise<void> {
  assertCan(ctx, 'catalog.edit', slug);
  const editionId = await editionIdFor(slug);
  await assertNothingSold(editionId, (key) => key.startsWith(`${id}|`), 'Questo prodotto', { productId: id });
  await withTransaction(async (tx) => {
    const edition = await writable(ctx, tx, slug);
    const [row] = await tx.delete(products).where(and(eq(products.id, id), eq(products.editionId, edition.id))).returning();
    if (!row) throw new DomainError('NOT_FOUND');
    await audit(tx, ctx, 'product.deleted', { entityType: 'product', entityId: id, edition: slug, before: { name: row.name, priceCents: row.priceCents } });
  });
}

// ─── Quote ───────────────────────────────────────────────────────────────────

export const QuotaInput = z.object({
  name: z.string().trim().min(2, 'Scrivi un nome, es. Laboratorio sabato.').max(80),
  size: z.number({ error: 'Indica quanti posti.' }).int().min(0).max(1_000_000),
  sessionId: z.uuid().nullable(),
  productIds: z.array(z.uuid()).min(1, 'Scegli almeno un prodotto.'),
});
export type QuotaInput = z.input<typeof QuotaInput>;

export async function saveQuota(ctx: Ctx, slug: string, id: string | null, input: QuotaInput): Promise<{ id: string }> {
  assertCan(ctx, 'catalog.edit', slug);
  const data = QuotaInput.parse(input);
  return withTransaction(async (tx) => {
    const edition = await writable(ctx, tx, slug);
    // Prodotti e data devono essere di questa edizione.
    const own = await tx.select({ id: products.id }).from(products).where(and(eq(products.editionId, edition.id), inArray(products.id, data.productIds)));
    if (own.length !== new Set(data.productIds).size) throw new DomainError('VALIDATION', { message: 'Alcuni prodotti non appartengono a questa edizione.' });
    if (data.sessionId) {
      const [s] = await tx.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.id, data.sessionId), eq(sessions.editionId, edition.id)));
      if (!s) throw new DomainError('VALIDATION', { message: 'La data scelta non appartiene a questa edizione.' });
    }
    const values = { name: data.name, size: data.size, sessionId: data.sessionId };
    let quotaId = id;
    if (!quotaId) {
      const [row] = await tx.insert(quotas).values({ ...values, editionId: edition.id }).returning({ id: quotas.id });
      quotaId = row.id;
      await audit(tx, ctx, 'quota.created', { entityType: 'quota', entityId: quotaId, edition: slug, after: data });
    } else {
      const [before] = await tx.select().from(quotas).where(and(eq(quotas.id, quotaId), eq(quotas.editionId, edition.id)));
      if (!before) throw new DomainError('NOT_FOUND');
      const beforeLinks = await tx.select().from(quotaProducts).where(eq(quotaProducts.quotaId, quotaId));
      await tx.update(quotas).set({ ...values, updatedAt: new Date() }).where(eq(quotas.id, quotaId));
      await audit(tx, ctx, 'quota.updated', {
        entityType: 'quota',
        entityId: quotaId,
        edition: slug,
        before: { name: before.name, size: before.size, sessionId: before.sessionId, productIds: beforeLinks.map((l) => l.productId) },
        after: data,
      });
    }
    await tx.delete(quotaProducts).where(eq(quotaProducts.quotaId, quotaId));
    await tx.insert(quotaProducts).values([...new Set(data.productIds)].map((productId) => ({ quotaId: quotaId!, productId })));
    return { id: quotaId };
  });
}

export async function deleteQuota(ctx: Ctx, slug: string, id: string): Promise<void> {
  assertCan(ctx, 'catalog.edit', slug);
  await withTransaction(async (tx) => {
    const edition = await writable(ctx, tx, slug);
    const [row] = await tx.delete(quotas).where(and(eq(quotas.id, id), eq(quotas.editionId, edition.id))).returning();
    if (!row) throw new DomainError('NOT_FOUND');
    await audit(tx, ctx, 'quota.deleted', { entityType: 'quota', entityId: id, edition: slug, before: { name: row.name, size: row.size } });
  });
}

// ─── Sconti dell'edizione ────────────────────────────────────────────────────

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const DiscountInput = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, 'Da 3 a 30 caratteri: lettere, numeri, - e _.'),
    kind: z.enum(['percent', 'fixed']),
    value: z.number().int().positive('Indica il valore dello sconto.'),
    maxUses: z.number().int().positive().nullable(),
    validFrom: optionalDate,
    validUntil: optionalDate,
    appliesToProductIds: z.array(z.uuid()),
    active: z.boolean(),
  })
  .refine((v) => v.kind !== 'percent' || v.value <= 100, { message: 'Una percentuale va da 1 a 100.', path: ['value'] })
  .refine((v) => !v.validFrom || !v.validUntil || v.validFrom <= v.validUntil, { message: 'La fine della validità deve venire dopo l’inizio.', path: ['validUntil'] });
export type DiscountInput = z.input<typeof DiscountInput>;

export async function saveDiscount(ctx: Ctx, slug: string, id: string | null, input: DiscountInput): Promise<{ id: string }> {
  assertCan(ctx, 'catalog.edit', slug);
  const data = DiscountInput.parse(input);
  return withTransaction(async (tx) => {
    const edition = await writable(ctx, tx, slug);
    const [dup] = await tx
      .select({ id: discountsV2.id })
      .from(discountsV2)
      .where(id ? and(eq(discountsV2.code, data.code), ne(discountsV2.id, id)) : eq(discountsV2.code, data.code));
    if (dup) throw new DomainError('CONFLICT', { message: `Il codice ${data.code} esiste già.` });
    if (data.appliesToProductIds.length) {
      const own = await tx.select({ id: products.id }).from(products).where(and(eq(products.editionId, edition.id), inArray(products.id, data.appliesToProductIds)));
      if (own.length !== new Set(data.appliesToProductIds).size) throw new DomainError('VALIDATION', { message: 'Alcuni prodotti non appartengono a questa edizione.' });
    }
    const values = {
      code: data.code,
      kind: data.kind,
      value: data.value,
      maxUses: data.maxUses,
      validFrom: data.validFrom ? romeDateTime(data.validFrom, '00:00') : null,
      validUntil: data.validUntil ? romeDateTime(data.validUntil, '23:59') : null,
      appliesToProductIds: data.appliesToProductIds,
      active: data.active,
    };
    if (!id) {
      const [row] = await tx.insert(discountsV2).values({ ...values, editionId: edition.id }).returning({ id: discountsV2.id });
      await audit(tx, ctx, 'discount.created', { entityType: 'discount', entityId: row.id, edition: slug, after: values });
      return row;
    }
    const [before] = await tx.select().from(discountsV2).where(and(eq(discountsV2.id, id), eq(discountsV2.editionId, edition.id)));
    if (!before) throw new DomainError('NOT_FOUND');
    if (before.usedCount > 0 && before.code !== data.code) throw new DomainError('CONFLICT', { message: 'Il codice è già stato usato: non si può rinominare.' });
    await tx.update(discountsV2).set({ ...values, updatedAt: new Date() }).where(eq(discountsV2.id, id));
    await audit(tx, ctx, 'discount.updated', { entityType: 'discount', entityId: id, edition: slug, before, after: values });
    return { id };
  });
}

export async function deleteDiscount(ctx: Ctx, slug: string, id: string): Promise<void> {
  assertCan(ctx, 'catalog.edit', slug);
  await withTransaction(async (tx) => {
    const edition = await writable(ctx, tx, slug);
    const [before] = await tx.select().from(discountsV2).where(and(eq(discountsV2.id, id), eq(discountsV2.editionId, edition.id)));
    if (!before) throw new DomainError('NOT_FOUND');
    if (before.usedCount > 0) throw new DomainError('CONFLICT', { message: 'Il codice è già stato usato: disattivalo invece di eliminarlo.' });
    await tx.delete(discountsV2).where(eq(discountsV2.id, id));
    await audit(tx, ctx, 'discount.deleted', { entityType: 'discount', entityId: id, edition: slug, before: { code: before.code } });
  });
}
