import 'server-only';
import { EVENT_CATEGORIES } from '@/lib/public/editions';
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { cache } from 'react';
import { z } from 'zod';
import { romeDateKey, romeDateTime } from '@/lib/dates';
import { systemCtx, type Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { editions, legacyIdMap, products, quotaProducts, quotas, series, sessions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { publish, type DomainEvent } from '@/server/domain/events';
import { assertClosingComplete } from './closing';
import { bumpYear, shiftInstant, shiftSession, weekdayPreservingShift } from './duplicate';
import { isReadOnly, transitionFor } from './lifecycle';
import { ACTIVE_STATUSES, EDITION_STATUSES, NAV_MODULES, type EditionDot, type EditionSummary } from './types';

export type { EditionModule, EditionStatus, EditionSummary } from './types';

/** Cookie con l'ultima edizione scelta nel selettore (lo imposta src/proxy.ts). */
export const EDITION_COOKIE = 'pl_edition';

/** Format con un editor della pagina pubblica nell'admin attuale (fino al prompt 17). */
const PAGE_EDITOR_SERIES = ['zuccaland', 'assaggia-e-passeggia'];
/** Tipi di corrispondenza che identificano un'edizione nelle tabelle attuali. */
const EDITION_LEGACY_KINDS = ['event', 'legacy_event_id', 'cashier_event'];

export function assertCan(ctx: Ctx, permission: Permission, edition?: string | null) {
  if (!can(ctx, permission, { edition: edition ?? null })) throw new DomainError('FORBIDDEN');
}

// ─── Letture ─────────────────────────────────────────────────────────────────

/** Ordine del selettore: prima le edizioni in corso e future (dalla più vicina), poi le passate (dalla più recente), infine quelle senza data. */
export function sortEditions(list: EditionSummary[], today: string): EditionSummary[] {
  return [...list].sort((a, b) => {
    if (!a.startsOn || !b.startsOn) return a.startsOn ? -1 : b.startsOn ? 1 : a.title.localeCompare(b.title);
    const af = (a.endsOn ?? a.startsOn) >= today;
    const bf = (b.endsOn ?? b.startsOn) >= today;
    if (af !== bf) return af ? -1 : 1;
    return af ? a.startsOn.localeCompare(b.startsOn) : b.startsOn.localeCompare(a.startsOn);
  });
}

/** Tutte le edizioni, una volta per richiesta. */
export const listEditions = cache(async (): Promise<EditionSummary[]> => {
  const db = getDb();
  const rows = await db
    .select({ e: editions, seriesSlug: series.slug, seriesName: series.name, theme: series.theme })
    .from(editions)
    .leftJoin(series, eq(series.id, editions.seriesId));
  const legacy = rows.length
    ? await db
        .select({ legacyId: legacyIdMap.legacyId, newId: legacyIdMap.newId })
        .from(legacyIdMap)
        .where(and(inArray(legacyIdMap.legacyKind, EDITION_LEGACY_KINDS), inArray(legacyIdMap.newId, rows.map((r) => r.e.id))))
    : [];
  const list = rows.map(({ e, seriesSlug, seriesName, theme }): EditionSummary => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    format: seriesSlug,
    formatName: seriesName,
    status: e.status,
    startsOn: e.startsAt ? romeDateKey(e.startsAt) : null,
    endsOn: e.endsAt ? romeDateKey(e.endsAt) : null,
    dot: (theme?.dot as EditionDot | undefined) ?? 'gray',
    modules: NAV_MODULES.filter((m) => e.enabledModules.includes(m)),
    legacyIds: [...new Set([e.slug, ...legacy.filter((l) => l.newId === e.id).map((l) => l.legacyId)])],
    imported: legacy.some((l) => l.newId === e.id),
    hasPageEditor: !!seriesSlug && PAGE_EDITOR_SERIES.includes(seriesSlug),
  }));
  return sortEditions(list, romeDateKey(new Date()));
});

export async function getEdition(slug: string): Promise<EditionSummary | null> {
  return (await listEditions()).find((e) => e.slug === slug) ?? null;
}

/** Edizione predefinita: quella nel cookie se esiste ancora, altrimenti la prima attiva, altrimenti la più recente. */
export function pickDefaultEdition(list: EditionSummary[], cookieSlug?: string | null): EditionSummary | null {
  return list.find((e) => e.slug === cookieSlug) ?? list.find((e) => ACTIVE_STATUSES.includes(e.status)) ?? list[0] ?? null;
}

export type EditionDetail = typeof editions.$inferSelect & { series: { id: string; slug: string; name: string } | null };

/** Tutti i campi di un'edizione, per la pagina Impostazioni. */
export async function getEditionDetail(slug: string): Promise<EditionDetail | null> {
  const [row] = await getDb()
    .select({ e: editions, s: { id: series.id, slug: series.slug, name: series.name } })
    .from(editions)
    .leftJoin(series, eq(series.id, editions.seriesId))
    .where(eq(editions.slug, slug));
  if (!row) return null;
  return { ...row.e, series: row.s?.id ? row.s : null };
}

/**
 * Ambiti a cui si può assegnare un ruolo o abbinare un dispositivo: le edizioni più gli eventi
 * configurati nella cassa che non sono ancora edizioni (prima del backfill).
 */
export async function listAssignableEditions(): Promise<Array<{ slug: string; title: string }>> {
  const list = await listEditions().catch(() => []);
  const out = list.map((e) => ({ slug: e.slug, title: e.title }));
  try {
    const { getCashierConfig } = await import('@/lib/data/cashier');
    const known = new Set(list.flatMap((e) => e.legacyIds));
    for (const evt of (await getCashierConfig()).events) {
      if (!known.has(evt.id)) out.push({ slug: evt.id, title: `${evt.name} (cassa)` });
    }
  } catch {
    // Configurazione della cassa illeggibile: restano le sole edizioni.
  }
  return out;
}

// ─── Ponte con gli ID del vecchio sistema ────────────────────────────────────

/** Gli ID usati oggi nel codice (eventId di ordini, biglietti e cassa) per un'edizione. */
export async function legacyIdsFor(slug: string): Promise<string[]> {
  return (await getEdition(slug))?.legacyIds ?? [slug];
}

/** L'edizione a cui appartiene un vecchio eventId (lo stesso ID se non è stata ancora importata). */
export async function editionSlugForLegacyId(eventId: string): Promise<string> {
  return (await listEditions()).find((e) => e.legacyIds.includes(eventId))?.slug ?? eventId;
}

/** true se l'edizione e il vecchio eventId della cassa o del biglietto sono la stessa edizione. */
export async function sameEdition(slug: string, legacyEventId: string): Promise<boolean> {
  if (slug === legacyEventId) return true;
  return (await legacyIdsFor(slug)).includes(legacyEventId);
}

// ─── Scritture ───────────────────────────────────────────────────────────────

/** Carica l'edizione da modificare dentro la transazione: 404 se non esiste, EDITION_ARCHIVED se archiviata. */
export async function editionForWrite(tx: Tx, slug: string) {
  const [row] = await tx.select().from(editions).where(eq(editions.slug, slug)).for('update');
  if (!row) throw new DomainError('NOT_FOUND');
  if (isReadOnly(row.status)) throw new DomainError('EDITION_ARCHIVED');
  return row;
}

const SLUG = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Lo slug deve avere almeno 3 caratteri.')
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo lettere minuscole, numeri e trattini (es. zuccaland-2027).');
const DATE_KEY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida.');
const TIME = z.string().regex(/^\d{2}:\d{2}$/, 'Ora non valida.');
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();

export const CreateEditionInput = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('empty'), title: z.string().trim().min(3, 'Scrivi un titolo.').max(120), slug: SLUG, seriesId: z.uuid().nullable().optional() }),
  z.object({ mode: z.literal('series'), title: z.string().trim().min(3, 'Scrivi un titolo.').max(120), slug: SLUG, seriesId: z.uuid('Scegli un format.') }),
  z.object({
    mode: z.literal('duplicate'),
    title: z.string().trim().min(3, 'Scrivi un titolo.').max(120),
    slug: SLUG,
    source: SLUG,
    year: z.number().int().min(2000).max(2100),
  }),
]);
export type CreateEditionInput = z.input<typeof CreateEditionInput>;

async function assertSlugFree(tx: Tx, slug: string) {
  const [dup] = await tx.select({ id: editions.id }).from(editions).where(eq(editions.slug, slug));
  if (dup) throw new DomainError('CONFLICT', { message: `Esiste già un'edizione con lo slug "${slug}".` });
}

export async function createEdition(ctx: Ctx, input: CreateEditionInput): Promise<{ slug: string }> {
  assertCan(ctx, 'editions.create');
  const data = CreateEditionInput.parse(input);
  if (data.mode === 'duplicate') return duplicateEdition(ctx, data.source, { title: data.title, slug: data.slug, year: data.year });
  return withTransaction(async (tx) => {
    await assertSlugFree(tx, data.slug);
    let enabledModules: string[] = [];
    let publicPageMode: 'generic' | 'landing' = 'generic';
    if (data.seriesId) {
      const [s] = await tx.select().from(series).where(eq(series.id, data.seriesId));
      if (!s) throw new DomainError('NOT_FOUND', { message: 'Il format scelto non esiste più.' });
      // Dal format: stessi moduli e stessa pagina dell'edizione più recente.
      const [last] = await tx.select().from(editions).where(eq(editions.seriesId, s.id)).orderBy(desc(editions.startsAt)).limit(1);
      if (last) {
        enabledModules = last.enabledModules;
        publicPageMode = last.publicPageMode;
      } else publicPageMode = s.landingPath ? 'landing' : 'generic';
    }
    const year = Number(data.title.match(/20\d\d/)?.[0]) || null;
    const [row] = await tx
      .insert(editions)
      .values({ slug: data.slug, title: data.title, seriesId: data.seriesId ?? null, year, status: 'draft', enabledModules, publicPageMode })
      .returning();
    await audit(tx, ctx, 'edition.created', { entityType: 'edition', entityId: row.id, edition: row.slug, after: { title: row.title, slug: row.slug, mode: data.mode } });
    return { slug: row.slug };
  });
}

/**
 * "Duplica Zuccaland 2026 come 2027": copia date, prodotti, quote e moduli, spostando le date allo
 * stesso giorno della settimana dell'anno di destinazione. Non copia ordini, sconti né pagina.
 */
export async function duplicateEdition(ctx: Ctx, sourceSlug: string, target: { title: string; slug: string; year: number }): Promise<{ slug: string }> {
  assertCan(ctx, 'editions.create');
  return withTransaction(async (tx) => {
    const [source] = await tx.select().from(editions).where(eq(editions.slug, sourceSlug));
    if (!source) throw new DomainError('NOT_FOUND', { message: "L'edizione da duplicare non esiste." });
    await assertSlugFree(tx, target.slug);
    const fromYear = source.year ?? (source.startsAt ? Number(romeDateKey(source.startsAt).slice(0, 4)) : target.year);
    const years = target.year - fromYear;
    const refDay = source.startsAt ? romeDateKey(source.startsAt) : `${fromYear}-06-01`;
    const days = weekdayPreservingShift(refDay, years);

    const [copy] = await tx
      .insert(editions)
      .values({
        seriesId: source.seriesId,
        slug: target.slug,
        year: target.year,
        title: target.title,
        subtitle: source.subtitle ? bumpYear(source.subtitle, fromYear, target.year) : null,
        status: 'draft',
        startsAt: source.startsAt ? shiftInstant(source.startsAt, days) : null,
        endsAt: source.endsAt ? shiftInstant(source.endsAt, days) : null,
        location: source.location,
        coverImage: source.coverImage,
        timezone: source.timezone,
        publicPageMode: source.publicPageMode,
        enabledModules: source.enabledModules,
        moduleSettings: source.moduleSettings,
      })
      .returning();

    const sessionMap = new Map<string, string>();
    const srcSessions = await tx.select().from(sessions).where(eq(sessions.editionId, source.id)).orderBy(asc(sessions.sort));
    for (const s of srcSessions) {
      const moved = shiftSession(s, days);
      const [row] = await tx
        .insert(sessions)
        .values({ editionId: copy.id, label: moved.label, startsAt: moved.startsAt, endsAt: moved.endsAt, capacity: s.capacity, status: s.status === 'closed' ? 'closed' : 'open', sort: s.sort })
        .returning({ id: sessions.id });
      sessionMap.set(s.id, row.id);
    }

    const productMap = new Map<string, string>();
    const srcProducts = await tx.select().from(products).where(eq(products.editionId, source.id)).orderBy(asc(products.sort));
    for (const p of srcProducts) {
      // Le liste di check-in arrivano con il prompt 09: non si copiano.
      const copyOf = {
        kind: p.kind,
        name: p.name,
        description: p.description,
        icon: p.icon,
        priceCents: p.priceCents,
        vatRate: p.vatRate,
        channels: p.channels,
        requiresSession: p.requiresSession,
        issuesTicket: p.issuesTicket,
        department: p.department,
        active: p.active,
        sort: p.sort,
        minPerOrder: p.minPerOrder,
        maxPerOrder: p.maxPerOrder,
      };
      const [row] = await tx.insert(products).values({ ...copyOf, editionId: copy.id }).returning({ id: products.id });
      productMap.set(p.id, row.id);
    }

    const srcQuotas = await tx.select().from(quotas).where(eq(quotas.editionId, source.id));
    const links = srcQuotas.length ? await tx.select().from(quotaProducts).where(inArray(quotaProducts.quotaId, srcQuotas.map((q) => q.id))) : [];
    for (const q of srcQuotas) {
      const [row] = await tx
        .insert(quotas)
        .values({ editionId: copy.id, name: q.name, size: q.size, sessionId: q.sessionId ? (sessionMap.get(q.sessionId) ?? null) : null })
        .returning({ id: quotas.id });
      const ps = links.filter((l) => l.quotaId === q.id).map((l) => productMap.get(l.productId)).filter((x): x is string => !!x);
      if (ps.length) await tx.insert(quotaProducts).values(ps.map((productId) => ({ quotaId: row.id, productId })));
    }

    await audit(tx, ctx, 'edition.duplicated', {
      entityType: 'edition',
      entityId: copy.id,
      edition: copy.slug,
      after: { from: source.slug, title: copy.title, sessions: srcSessions.length, products: srcProducts.length, quotas: srcQuotas.length, shiftDays: days },
    });
    return { slug: copy.slug };
  });
}

export const UpdateEditionInput = z
  .object({
    title: z.string().trim().min(3, 'Scrivi un titolo.').max(120),
    subtitle: optionalText(200),
    location: optionalText(200),
    coverImage: optionalText(500),
    seriesId: z.uuid().nullable(),
    startsDate: DATE_KEY.nullable(),
    startsTime: TIME.nullable(),
    endsDate: DATE_KEY.nullable(),
    endsTime: TIME.nullable(),
    publicPageMode: z.enum(['generic', 'landing']),
    /** Categoria nel calendario /eventi; assente = invariata. */
    category: z.enum(EVENT_CATEGORIES).nullable().optional(),
  })
  .refine((v) => !v.endsDate || !!v.startsDate, { message: 'Indica prima la data di inizio.', path: ['startsDate'] });
export type UpdateEditionInput = z.input<typeof UpdateEditionInput>;

export async function updateEdition(ctx: Ctx, slug: string, input: UpdateEditionInput): Promise<void> {
  assertCan(ctx, 'editions.edit', slug);
  const data = UpdateEditionInput.parse(input);
  const startsAt = data.startsDate ? romeDateTime(data.startsDate, data.startsTime ?? '00:00') : null;
  const endsAt = data.endsDate ? romeDateTime(data.endsDate, data.endsTime ?? '23:59') : null;
  if (startsAt && endsAt && endsAt < startsAt) throw new DomainError('VALIDATION', { message: 'La fine deve venire dopo l’inizio.' });
  await withTransaction(async (tx) => {
    const before = await editionForWrite(tx, slug);
    const after = {
      title: data.title,
      subtitle: data.subtitle ?? null,
      location: data.location ?? null,
      coverImage: data.coverImage ?? null,
      seriesId: data.seriesId,
      startsAt,
      endsAt,
      publicPageMode: data.publicPageMode,
      ...(data.category !== undefined ? { category: data.category } : {}),
      year: startsAt ? Number(romeDateKey(startsAt).slice(0, 4)) : before.year,
    };
    await tx.update(editions).set({ ...after, updatedAt: new Date() }).where(eq(editions.id, before.id));
    const changed = Object.fromEntries(Object.entries(after).filter(([k, v]) => String(before[k as keyof typeof before] ?? '') !== String(v ?? '')));
    if (Object.keys(changed).length) {
      const previous = Object.fromEntries(Object.keys(changed).map((k) => [k, before[k as keyof typeof before]]));
      await audit(tx, ctx, 'edition.updated', { entityType: 'edition', entityId: before.id, edition: slug, before: previous, after: changed });
    }
  });
}

export const ChangeStatusInput = z.object({ to: z.enum(EDITION_STATUSES), reason: optionalText(500) });

export async function changeEditionStatus(ctx: Ctx, slug: string, input: z.input<typeof ChangeStatusInput>): Promise<void> {
  const data = ChangeStatusInput.parse(input);
  const event = await withTransaction(async (tx) => {
    const before = await editionForWrite(tx, slug);
    const transition = transitionFor(before.status, data.to);
    if (!transition) throw new DomainError('CONFLICT', { message: 'Questo passaggio di stato non è possibile.' });
    assertCan(ctx, transition.permission, slug);
    if (data.to === 'archived') await assertClosingComplete(tx, before);
    const now = new Date();
    await tx
      .update(editions)
      .set({
        status: data.to,
        updatedAt: now,
        ...(data.to === 'concluded' ? { concludedAt: now } : {}),
        ...(data.to === 'archived' ? { archivedAt: now } : {}),
      })
      .where(eq(editions.id, before.id));
    await audit(tx, ctx, 'edition.status_changed', { entityType: 'edition', entityId: before.id, edition: slug, before: { status: before.status }, after: { status: data.to }, reason: data.reason ?? null });
    return { type: `edition.${data.to}`, editionId: before.id, edition: slug, from: before.status, automatic: false } as DomainEvent;
  });
  await publish([event]);
}

/**
 * Esaurita automatica e reversibile (§9): on_sale ⇄ sold_out decisa dal sistema in base ai posti.
 * Cambia solo se lo stato è ancora quello atteso, così non sovrascrive una scelta fatta a mano.
 */
export async function setSoldOutAutomatically(editionId: string, soldOut: boolean): Promise<boolean> {
  const from = soldOut ? 'on_sale' : 'sold_out';
  const to = soldOut ? 'sold_out' : 'on_sale';
  const event = await withTransaction(async (tx) => {
    const [row] = await tx
      .update(editions)
      .set({ status: to, updatedAt: new Date() })
      .where(and(eq(editions.id, editionId), eq(editions.status, from)))
      .returning({ slug: editions.slug });
    if (!row) return null;
    const ctx = systemCtx('posti');
    await audit(tx, ctx, 'edition.status_changed', {
      entityType: 'edition',
      entityId: editionId,
      edition: row.slug,
      before: { status: from },
      after: { status: to },
      reason: soldOut ? 'Posti esauriti' : 'Si sono liberati dei posti',
    });
    return { type: `edition.${to}`, editionId, edition: row.slug, from, automatic: true } as DomainEvent;
  });
  if (event) await publish([event]);
  return !!event;
}

// ─── Elenco con i conteggi, per /admin/edizioni ──────────────────────────────

export type EditionListRow = EditionSummary & { sessions: number; products: number; location: string | null };

export async function listEditionsWithCounts(ctx: Ctx): Promise<EditionListRow[]> {
  const all = (await listEditions()).filter((e) => can(ctx, 'editions.edit', { edition: e.slug }) || can(ctx, 'catalog.edit', { edition: e.slug }));
  if (!all.length) return [];
  const db = getDb();
  const ids = all.map((e) => e.id);
  const [sCount, pCount, loc] = await Promise.all([
    db.select({ id: sessions.editionId, n: sql<number>`count(*)::int` }).from(sessions).where(inArray(sessions.editionId, ids)).groupBy(sessions.editionId),
    db.select({ id: products.editionId, n: sql<number>`count(*)::int` }).from(products).where(inArray(products.editionId, ids)).groupBy(products.editionId),
    db.select({ id: editions.id, location: editions.location }).from(editions).where(and(inArray(editions.id, ids), isNotNull(editions.location))),
  ]);
  return all.map((e) => ({
    ...e,
    sessions: sCount.find((r) => r.id === e.id)?.n ?? 0,
    products: pCount.find((r) => r.id === e.id)?.n ?? 0,
    location: loc.find((r) => r.id === e.id)?.location ?? null,
  }));
}
