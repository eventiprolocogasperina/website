import 'server-only';
// Procedura guidata "Nuova edizione" e checklist "Da completare" (docs/GUIDA-EVENTI.md). Lo stato dei passi
// si calcola dai dati (src/lib/edition-setup.ts); qui si leggono i fatti dal database e si scrivono le
// poche cose della procedura: il tipo di edizione, i passi saltati, luogo e date, regolamento.
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { newBlock, PageBlocksSchema, readBlocks } from '@/components/public/blocks/schema';
import {
  computeSetupChecklist,
  readSetupState,
  salesBlockedMessage,
  SETUP_SETTINGS_KEY,
  SETUP_STEPS,
  type SetupChecklist,
  type SetupFacts,
  type SetupKind,
  type SetupStep,
} from '@/lib/edition-setup';
import { romeDateKey, romeDateTime } from '@/lib/dates';
import { editionLinks } from '@/lib/public/edition-links';
import { moduleSettings } from '@/modules/registry';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, withTransaction, type Tx } from '@/server/db/client';
import { cashRegisters, discountsV2, editions, ordersV2, products, series, sessions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { defaultEditionBlocks } from '@/server/domain/pages/resolve';
import { assertCan, createEdition, duplicateEdition, editionForWrite } from './index';
import { saveSeries } from './series';

type Edition = typeof editions.$inferSelect;
type Db = Tx | ReturnType<typeof getDb>;

// ─── Letture ─────────────────────────────────────────────────────────────────

/** Tipo dell'edizione: quello scelto nella procedura, altrimenti "con vendite" se ha un catalogo o una pagina dedicata. */
function kindOf(e: Edition, productCount: number): SetupKind {
  return readSetupState(e.moduleSettings).kind ?? (productCount > 0 || e.publicPageMode === 'landing' ? 'sales' : 'info');
}

export async function loadSetupFacts(db: Db, e: Edition): Promise<SetupFacts> {
  const [s, p, [regs], [disc], [inv], [ser]] = await Promise.all([
    db.select({ status: sessions.status, capacity: sessions.capacity }).from(sessions).where(eq(sessions.editionId, e.id)),
    db
      .select({ kind: products.kind, active: products.active, channels: products.channels, priceCents: products.priceCents, openPrice: products.openPrice })
      .from(products)
      .where(eq(products.editionId, e.id)),
    db.select({ n: count() }).from(cashRegisters).where(and(eq(cashRegisters.editionId, e.id), eq(cashRegisters.active, true))),
    db.select({ n: count() }).from(discountsV2).where(eq(discountsV2.editionId, e.id)),
    db.select({ n: count() }).from(ordersV2).where(and(eq(ordersV2.editionId, e.id), eq(ordersV2.channel, 'invite'))),
    e.seriesId ? db.select({ pageBlocks: series.pageBlocks }).from(series).where(eq(series.id, e.seriesId)) : Promise.resolve([]),
  ]);
  const activities = e.enabledModules.includes('activities') ? ((moduleSettings('activities', e.moduleSettings).activities as unknown[]) ?? []).length : 0;
  return {
    kind: kindOf(e, p.length),
    status: e.status,
    location: e.location,
    startsAt: e.startsAt,
    subtitle: e.subtitle,
    publicPageMode: e.publicPageMode,
    sessions: s,
    products: p,
    activities,
    visibleBlocks: readBlocks(e.pageBlocks).filter((b) => !b.hidden).length,
    rulesUrl: editionLinks(e.pageBlocks, ser?.pageBlocks).rulesUrl,
    registers: regs.n,
    discounts: disc.n,
    invites: inv.n,
    skipped: readSetupState(e.moduleSettings).skipped,
  };
}

async function editionBySlug(slug: string): Promise<Edition> {
  const [e] = await getDb().select().from(editions).where(eq(editions.slug, slug));
  if (!e) throw new DomainError('NOT_FOUND');
  return e;
}

export async function getSetupChecklist(ctx: Ctx, slug: string): Promise<SetupChecklist> {
  assertCan(ctx, 'editions.edit', slug);
  const e = await editionBySlug(slug);
  return computeSetupChecklist(await loadSetupFacts(getDb(), e));
}

/** Guardia delle vendite: chiamata da changeEditionStatus dentro la transazione, con l'edizione bloccata. */
export async function assertSalesReady(tx: Tx, e: Edition): Promise<void> {
  const { salesBlockers } = computeSetupChecklist(await loadSetupFacts(tx, e));
  if (salesBlockers.length) throw new DomainError('CONFLICT', { message: salesBlockedMessage(salesBlockers), details: { blockers: salesBlockers.map((b) => b.key) } });
}

export type WizardFormat = {
  id: string;
  name: string;
  dot: string;
  last: { slug: string; title: string; year: number | null; status: string; sessions: number; products: number; registers: number; blocks: number } | null;
};

/** Format con la loro ultima edizione (da cui partire) e quello che si copierebbe. */
export async function listWizardFormats(ctx: Ctx): Promise<WizardFormat[]> {
  assertCan(ctx, 'editions.create');
  const db = getDb();
  const rows = await db.select().from(series).orderBy(asc(series.name));
  return Promise.all(
    rows.map(async (s) => {
      const [last] = await db
        .select()
        .from(editions)
        .where(eq(editions.seriesId, s.id))
        .orderBy(sql`${editions.startsAt} desc nulls last`, desc(editions.year), desc(editions.createdAt))
        .limit(1);
      if (!last) return { id: s.id, name: s.name, dot: s.theme?.dot ?? 'gray', last: null };
      const [[ns], [np], [nr]] = await Promise.all([
        db.select({ n: count() }).from(sessions).where(eq(sessions.editionId, last.id)),
        db.select({ n: count() }).from(products).where(eq(products.editionId, last.id)),
        db.select({ n: count() }).from(cashRegisters).where(eq(cashRegisters.editionId, last.id)),
      ]);
      return {
        id: s.id,
        name: s.name,
        dot: s.theme?.dot ?? 'gray',
        last: { slug: last.slug, title: last.title, year: last.year, status: last.status, sessions: ns.n, products: np.n, registers: nr.n, blocks: readBlocks(last.pageBlocks).length },
      };
    }),
  );
}

// ─── Creazione ───────────────────────────────────────────────────────────────

const Base = {
  title: z.string().trim().min(3, 'Scrivi un titolo.').max(120),
  slug: z.string().trim().toLowerCase(),
  year: z.number().int().min(2000, 'Anno non valido.').max(2100, 'Anno non valido.'),
};

export const StartWizardInput = z.discriminatedUnion('type', [
  z.object({ type: z.literal('format'), seriesId: z.uuid('Scegli un format.'), fromPrevious: z.boolean(), ...Base }),
  z.object({
    type: z.literal('new-format'),
    formatName: z.string().trim().min(2, 'Scrivi il nome del format.').max(80),
    formatSlug: z.string().trim().toLowerCase(),
    dot: z.enum(['orange', 'blue', 'gold', 'gray']),
    sales: z.boolean(),
    ...Base,
  }),
  z.object({ type: z.literal('info'), ...Base }),
]);
export type StartWizardInput = z.input<typeof StartWizardInput>;

/**
 * Primo passo della procedura: crea la bozza. Da un format si parte dall'ultima edizione (copiata e
 * spostata di un anno) oppure da zero; un format nuovo si crea insieme alla sua prima edizione.
 */
export async function startEditionWizard(ctx: Ctx, input: StartWizardInput): Promise<{ slug: string }> {
  assertCan(ctx, 'editions.create');
  const data = StartWizardInput.parse(input);
  const base = { title: data.title, slug: data.slug };
  let created: { slug: string };
  let kind: SetupKind = 'sales';
  if (data.type === 'format') {
    const db = getDb();
    const [last] = data.fromPrevious
      ? await db
          .select()
          .from(editions)
          .where(eq(editions.seriesId, data.seriesId))
          .orderBy(sql`${editions.startsAt} desc nulls last`, desc(editions.year), desc(editions.createdAt))
          .limit(1)
      : [];
    if (last) {
      const [{ n }] = await db.select({ n: count() }).from(products).where(eq(products.editionId, last.id));
      kind = kindOf(last, n);
      created = await duplicateEdition(ctx, last.slug, { ...base, year: data.year });
    } else {
      created = await createEdition(ctx, { mode: 'series', ...base, seriesId: data.seriesId });
    }
  } else if (data.type === 'new-format') {
    const { id } = await saveSeries(ctx, null, { name: data.formatName, slug: data.formatSlug, description: null, landingPath: null, dot: data.dot });
    created = await createEdition(ctx, { mode: 'series', ...base, seriesId: id });
    kind = data.sales ? 'sales' : 'info';
  } else {
    created = await createEdition(ctx, { mode: 'empty', ...base, seriesId: null });
    kind = 'info';
  }
  await withTransaction(async (tx) => {
    const e = await editionForWrite(tx, created.slug);
    await tx
      .update(editions)
      .set({ moduleSettings: { ...e.moduleSettings, [SETUP_SETTINGS_KEY]: { kind, skipped: [] } }, year: e.year ?? data.year, updatedAt: new Date() })
      .where(eq(editions.id, e.id));
  });
  return created;
}

// ─── Passi ───────────────────────────────────────────────────────────────────

async function writeSetupState(tx: Tx, e: Edition, patch: Partial<{ kind: SetupKind; skipped: SetupStep[] }>) {
  const state = readSetupState(e.moduleSettings);
  const next = { kind: patch.kind ?? state.kind, skipped: patch.skipped ?? state.skipped };
  await tx
    .update(editions)
    .set({ moduleSettings: { ...e.moduleSettings, [SETUP_SETTINGS_KEY]: next }, updatedAt: new Date() })
    .where(eq(editions.id, e.id));
}

/** "Salta per ora": il passo resta da fare e la checklist lo mostra come saltato. */
export async function skipSetupStep(ctx: Ctx, slug: string, step: string): Promise<void> {
  assertCan(ctx, 'editions.edit', slug);
  const key = z.enum(SETUP_STEPS).parse(step);
  if (key === 'publish') throw new DomainError('VALIDATION', { message: 'La pubblicazione non si salta: resta in bozza finché non la fai.' });
  await withTransaction(async (tx) => {
    const e = await editionForWrite(tx, slug);
    const { skipped } = readSetupState(e.moduleSettings);
    if (skipped.includes(key)) return;
    await writeSetupState(tx, e, { skipped: [...skipped, key] });
    await audit(tx, ctx, 'edition.setup_step_skipped', { entityType: 'edition', entityId: e.id, edition: slug, after: { step: key } });
  });
}

/** Cambia il tipo: con vendite oppure solo pagina informativa. */
export async function setSetupKind(ctx: Ctx, slug: string, kind: string): Promise<void> {
  assertCan(ctx, 'editions.edit', slug);
  const value = z.enum(['sales', 'info']).parse(kind);
  await withTransaction(async (tx) => {
    const e = await editionForWrite(tx, slug);
    await writeSetupState(tx, e, { kind: value });
    await audit(tx, ctx, 'edition.setup_kind_changed', { entityType: 'edition', entityId: e.id, edition: slug, after: { kind: value } });
  });
}

const DATE_KEY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida.');
const TIME = z.string().regex(/^\d{2}:\d{2}$/, 'Ora non valida.');

export const SetupWhereWhenInput = z.object({
  location: z.string().trim().max(200),
  /** Solo per gli eventi senza date in vendita: con le date, inizio e fine si prendono da lì. */
  startsDate: DATE_KEY.nullable().optional(),
  startsTime: TIME.nullable().optional(),
  endsDate: DATE_KEY.nullable().optional(),
  endsTime: TIME.nullable().optional(),
});

/**
 * Luogo, e inizio e fine dell'edizione. Se l'edizione ha delle date (sessioni), inizio e fine vengono
 * dalla prima e dall'ultima, così il calendario pubblico non può dire una cosa diversa dal checkout.
 */
export async function saveSetupWhereWhen(ctx: Ctx, slug: string, input: z.input<typeof SetupWhereWhenInput>): Promise<void> {
  assertCan(ctx, 'editions.edit', slug);
  const data = SetupWhereWhenInput.parse(input);
  await withTransaction(async (tx) => {
    const e = await editionForWrite(tx, slug);
    const list = await tx
      .select({ startsAt: sessions.startsAt, endsAt: sessions.endsAt, status: sessions.status })
      .from(sessions)
      .where(eq(sessions.editionId, e.id));
    const live = list.filter((s) => s.status !== 'cancelled');
    let startsAt = e.startsAt;
    let endsAt = e.endsAt;
    if (live.length) {
      startsAt = new Date(Math.min(...live.map((s) => s.startsAt.getTime())));
      endsAt = new Date(Math.max(...live.map((s) => (s.endsAt ?? s.startsAt).getTime())));
    } else if (data.startsDate !== undefined) {
      startsAt = data.startsDate ? romeDateTime(data.startsDate, data.startsTime ?? '00:00') : null;
      endsAt = data.endsDate ? romeDateTime(data.endsDate, data.endsTime ?? '23:59') : null;
      if (startsAt && endsAt && endsAt < startsAt) throw new DomainError('VALIDATION', { message: 'La fine deve venire dopo l’inizio.' });
    }
    const after = { location: data.location || null, startsAt, endsAt, year: startsAt ? Number(romeDateKey(startsAt).slice(0, 4)) : e.year };
    await tx.update(editions).set({ ...after, updatedAt: new Date() }).where(eq(editions.id, e.id));
    await audit(tx, ctx, 'edition.updated', { entityType: 'edition', entityId: e.id, edition: slug, before: { location: e.location, startsAt: e.startsAt, endsAt: e.endsAt }, after });
  });
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

export const SetupPageInput = z.object({ subtitle: optionalText(200), coverImage: optionalText(500) });

/** Descrizione breve e immagine di copertina (la scheda nel calendario le usa; la pagina a blocchi ha il suo editor). */
export async function saveSetupPage(ctx: Ctx, slug: string, input: z.input<typeof SetupPageInput>): Promise<void> {
  assertCan(ctx, 'editions.edit', slug);
  const data = SetupPageInput.parse(input);
  await withTransaction(async (tx) => {
    const e = await editionForWrite(tx, slug);
    await tx.update(editions).set({ ...data, updatedAt: new Date() }).where(eq(editions.id, e.id));
    await audit(tx, ctx, 'edition.updated', { entityType: 'edition', entityId: e.id, edition: slug, before: { subtitle: e.subtitle, coverImage: e.coverImage }, after: data });
  });
}

const RULES_LABEL = 'Regolamento';
const RulesUrl = z
  .string()
  .trim()
  .max(600)
  .refine((v) => /^(https:\/\/|\/)/.test(v), 'Incolla un indirizzo che inizia con https:// (es. il PDF su Google Drive).');

/**
 * Link al regolamento: è la voce "Regolamento" del blocco Allegati della pagina, la stessa che il checkout
 * mostra ("Partecipando accetti il Regolamento"). Se il blocco non c'è, si aggiunge in fondo alla pagina.
 */
export async function saveRulesUrl(ctx: Ctx, slug: string, rawUrl: string): Promise<void> {
  assertCan(ctx, 'editions.edit', slug);
  const url = RulesUrl.parse(rawUrl);
  await withTransaction(async (tx) => {
    const e = await editionForWrite(tx, slug);
    // Pagina mai salvata: si parte dai blocchi proposti, gli stessi che il sito mostra oggi.
    const stored = readBlocks(e.pageBlocks);
    const blocks = stored.length ? stored : defaultEditionBlocks(e);
    const attachments = blocks.find((b) => b.type === 'Allegati');
    if (attachments && attachments.type === 'Allegati') {
      const items = attachments.props.items;
      const i = items.findIndex((it) => /regolament/i.test(it.label));
      attachments.props.items = i >= 0 ? items.map((it, j) => (j === i ? { ...it, url } : it)) : [...items, { label: RULES_LABEL, url }];
      attachments.hidden = false;
    } else {
      blocks.push(newBlock('Allegati', { title: 'Regolamento e allegati', items: [{ label: RULES_LABEL, url }] }));
    }
    const next = PageBlocksSchema.parse(blocks);
    await tx.update(editions).set({ pageBlocks: next, updatedAt: new Date() }).where(eq(editions.id, e.id));
    await audit(tx, ctx, 'edition.rules_saved', { entityType: 'edition', entityId: e.id, edition: slug, after: { url } });
  });
}
