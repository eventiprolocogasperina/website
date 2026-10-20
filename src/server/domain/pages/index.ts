import 'server-only';
import { createHash } from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import { cache } from 'react';
import { PageBlocksSchema, readBlocks, type Block } from '@/components/public/blocks/schema';
import type { BlockData } from '@/components/public/blocks/types';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { editions, series, siteSettings } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { assertCan, editionForWrite } from '@/server/domain/editions';
import { DomainError } from '@/server/domain/errors';
import { defaultEditionBlocks, defaultOffseasonBlocks, resolveBlockData } from './resolve';

export { getEditionYearPage, getFormatPage, type ResolvedPage } from './resolve';

// ─── Flag ────────────────────────────────────────────────────────────────────

export const PUBLIC_V2 = 'public_v2';

/**
 * Flag `public_v2` (site_settings, spento di default): acceso, /zuccaland e /assaggia-e-passeggia
 * mostrano le pagine a blocchi; spento resta la pagina di oggi (§18.10). /<format>/<anno> è sempre
 * attiva perché non sostituisce nessun URL. Se il database non risponde: spento.
 */
export const publicV2Enabled = cache(async (): Promise<boolean> => {
  try {
    const [row] = await getDb().select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, PUBLIC_V2));
    return row?.value === 'true';
  } catch {
    return false;
  }
});

export async function setPublicV2(ctx: Ctx, enabled: boolean): Promise<void> {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  await withTransaction(async (tx) => {
    const value = String(enabled);
    await tx
      .insert(siteSettings)
      .values({ key: PUBLIC_V2, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: sql`CURRENT_TIMESTAMP` } });
    await audit(tx, ctx, 'settings.flag_changed', { entityType: 'setting', entityId: PUBLIC_V2, after: { [PUBLIC_V2]: enabled } });
  });
}

// ─── Editor ──────────────────────────────────────────────────────────────────

/** Impronta dei blocchi salvati: l'editor la rimanda al salvataggio per non sovrascrivere il lavoro di un altro. */
export function blocksVersion(raw: unknown): string {
  return createHash('sha1').update(JSON.stringify(readBlocks(raw))).digest('hex').slice(0, 16);
}

export type EditorState = {
  kind: 'edition' | 'series';
  key: string;
  title: string;
  blocks: Block[];
  /** I blocchi sono quelli proposti in automatico: la pagina non è ancora stata salvata. */
  isDefault: boolean;
  version: string;
  data: BlockData;
  theme: string | null;
  publicUrl: string | null;
  readOnly: boolean;
};

export async function getEditionEditor(ctx: Ctx, slug: string): Promise<EditorState> {
  assertCan(ctx, 'editions.edit', slug);
  const db = getDb();
  const [e] = await db.select().from(editions).where(eq(editions.slug, slug));
  if (!e) throw new DomainError('NOT_FOUND');
  const [s] = e.seriesId ? await db.select().from(series).where(eq(series.id, e.seriesId)) : [];
  const siblings = s ? await db.select().from(editions).where(eq(editions.seriesId, s.id)).orderBy(desc(editions.startsAt)) : [];
  const stored = readBlocks(e.pageBlocks);
  const blocks = stored.length ? stored : defaultEditionBlocks(e);
  const data = await resolveBlockData(blocks, { series: s ?? null, edition: e, siblings: siblings.filter((x) => x.status !== 'draft'), legacyPageLive: true, preview: true });
  return {
    kind: 'edition',
    key: slug,
    title: e.title,
    blocks,
    isDefault: !stored.length,
    version: blocksVersion(e.pageBlocks),
    data,
    theme: s?.theme?.dot ?? null,
    publicUrl: s?.landingPath && e.year ? `${s.landingPath}/${e.year}` : null,
    readOnly: e.status === 'archived',
  };
}

export async function getSeriesEditor(ctx: Ctx, slug: string): Promise<EditorState> {
  assertCan(ctx, 'editions.edit');
  const db = getDb();
  const [s] = await db.select().from(series).where(eq(series.slug, slug));
  if (!s) throw new DomainError('NOT_FOUND');
  const siblings = await db.select().from(editions).where(eq(editions.seriesId, s.id)).orderBy(desc(editions.startsAt));
  const stored = readBlocks(s.pageBlocks);
  const blocks = stored.length ? stored : defaultOffseasonBlocks(s);
  const data = await resolveBlockData(blocks, { series: s, edition: null, siblings: siblings.filter((x) => x.status !== 'draft'), legacyPageLive: true, preview: true });
  return { kind: 'series', key: slug, title: s.name, blocks, isDefault: !stored.length, version: blocksVersion(s.pageBlocks), data, theme: s.theme?.dot ?? null, publicUrl: s.landingPath, readOnly: false };
}

function checkVersion(current: unknown, expected: string) {
  if (blocksVersion(current) !== expected) {
    throw new DomainError('CONFLICT', { message: 'Qualcun altro ha salvato questa pagina nel frattempo. Copia le tue modifiche e ricarica.' });
  }
}

/** Salva i blocchi della pagina dell'edizione. Le edizioni archiviate non si modificano (§18.7). */
export async function saveEditionBlocks(ctx: Ctx, slug: string, raw: unknown, version: string): Promise<{ version: string }> {
  assertCan(ctx, 'editions.edit', slug);
  const blocks = PageBlocksSchema.parse(raw);
  return withTransaction(async (tx) => {
    const before = await editionForWrite(tx, slug);
    checkVersion(before.pageBlocks, version);
    await tx.update(editions).set({ pageBlocks: blocks, updatedAt: new Date() }).where(eq(editions.id, before.id));
    await audit(tx, ctx, 'edition.page_saved', { entityType: 'edition', entityId: before.id, edition: slug, before: { blocks: readBlocks(before.pageBlocks).length }, after: { blocks: blocks.length } });
    return { version: blocksVersion(blocks) };
  });
}

/** Salva i blocchi della pagina fuori stagione del format. */
export async function saveSeriesBlocks(ctx: Ctx, slug: string, raw: unknown, version: string): Promise<{ version: string }> {
  assertCan(ctx, 'editions.edit');
  const blocks = PageBlocksSchema.parse(raw);
  return withTransaction(async (tx) => {
    const [before] = await tx.select().from(series).where(eq(series.slug, slug)).for('update');
    if (!before) throw new DomainError('NOT_FOUND');
    checkVersion(before.pageBlocks, version);
    await tx.update(series).set({ pageBlocks: blocks, updatedAt: new Date() }).where(eq(series.id, before.id));
    await audit(tx, ctx, 'series.page_saved', { entityType: 'series', entityId: before.id, before: { blocks: readBlocks(before.pageBlocks).length }, after: { blocks: blocks.length } });
    return { version: blocksVersion(blocks) };
  });
}
