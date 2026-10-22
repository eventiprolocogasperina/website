import 'server-only';
import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { assetPath } from '@/lib/edition-theme';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, withTransaction } from '@/server/db/client';
import { editions, series, type SeriesTheme } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { assertCan } from './index';

export type SeriesRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  landingPath: string | null;
  dot: 'orange' | 'blue' | 'gold' | 'gray';
  /** Logo del format su fondo chiaro e su fondo scuro (testata del PDF dei biglietti), se caricati. */
  logo: string | null;
  logoOnDark: string | null;
  editions: number;
};

export async function listSeries(): Promise<SeriesRow[]> {
  const db = getDb();
  const rows = await db
    .select({ s: series, n: sql<number>`(select count(*)::int from ${editions} where ${editions.seriesId} = ${series.id})` })
    .from(series)
    .orderBy(asc(series.name));
  return rows.map(({ s, n }) => ({ id: s.id, slug: s.slug, name: s.name, description: s.description, landingPath: s.landingPath, dot: s.theme?.dot ?? 'gray', logo: assetPath(s.theme?.logo), logoOnDark: assetPath(s.theme?.logoOnDark), editions: n }));
}

const logoField = z
  .string()
  .trim()
  .max(300)
  .nullable()
  .optional()
  .transform((v) => (v === '' ? null : v))
  .refine((v) => v == null || assetPath(v) !== null, 'Il logo deve essere un indirizzo https o un percorso del sito (/img/…).');

export const SeriesInput = z.object({
  name: z.string().trim().min(2, 'Scrivi il nome del format.').max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo lettere minuscole, numeri e trattini.')
    .max(60),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || null)
    .nullable(),
  landingPath: z
    .string()
    .trim()
    .max(120)
    .transform((v) => v || null)
    .refine((v) => v === null || /^\/[a-z0-9/-]*$/.test(v), 'Un percorso come /zuccaland.')
    .nullable(),
  dot: z.enum(['orange', 'blue', 'gold', 'gray']),
  /** Logo caricato da Admin › Format (Cloudinary) o percorso del sito. Omesso: resta com'è; null: si toglie. */
  logo: logoField,
  logoOnDark: logoField,
});
export type SeriesInput = z.input<typeof SeriesInput>;

export async function saveSeries(ctx: Ctx, id: string | null, input: SeriesInput): Promise<{ id: string }> {
  assertCan(ctx, 'editions.edit');
  const data = SeriesInput.parse(input);
  return withTransaction(async (tx) => {
    const [dup] = await tx.select({ id: series.id }).from(series).where(eq(series.slug, data.slug));
    if (dup && dup.id !== id) throw new DomainError('CONFLICT', { message: `Esiste già un format con lo slug "${data.slug}".` });
    const logos = { ...(data.logo !== undefined ? { logo: data.logo } : {}), ...(data.logoOnDark !== undefined ? { logoOnDark: data.logoOnDark } : {}) };
    // Un logo a null si toglie dal tema (readBrand torna al ripiego).
    const withLogos = (theme: SeriesTheme): SeriesTheme => {
      const next: Record<string, unknown> = { ...theme, dot: data.dot };
      for (const [k, v] of Object.entries(logos)) {
        if (v === null) delete next[k];
        else next[k] = v;
      }
      return next as SeriesTheme;
    };
    const values = { name: data.name, slug: data.slug, description: data.description, landingPath: data.landingPath, theme: withLogos({}) };
    if (!id) {
      const [row] = await tx.insert(series).values(values).returning({ id: series.id });
      await audit(tx, ctx, 'series.created', { entityType: 'series', entityId: row.id, after: values });
      return row;
    }
    const [before] = await tx.select().from(series).where(eq(series.id, id));
    if (!before) throw new DomainError('NOT_FOUND');
    // Lo slug del format comparirà negli URL pubblici: dopo la prima edizione non cambia più.
    if (before.slug !== data.slug) {
      const [used] = await tx.select({ id: editions.id }).from(editions).where(eq(editions.seriesId, id)).limit(1);
      if (used) throw new DomainError('CONFLICT', { message: 'Lo slug non si può cambiare: il format ha già delle edizioni.' });
    }
    // Il modulo dell'admin cambia pallino e loghi (se indicati): icona e font del tema restano (§14.3).
    await tx
      .update(series)
      .set({ ...values, theme: withLogos(before.theme ?? {}), updatedAt: new Date() })
      .where(eq(series.id, id));
    await audit(tx, ctx, 'series.updated', {
      entityType: 'series',
      entityId: id,
      before: { name: before.name, slug: before.slug, description: before.description, landingPath: before.landingPath, theme: before.theme },
      after: values,
    });
    return { id };
  });
}
