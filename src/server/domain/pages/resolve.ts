import 'server-only';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { newBlock, readBlocks, type Block } from '@/components/public/blocks/schema';
import type { BlockData } from '@/components/public/blocks/types';
import { ALBUMS, loadAlbum } from '@/lib/data/albums';
import { formatDate } from '@/lib/dates';
import { getDb } from '@/server/db/client';
import { editions, gallery, products, reviews, series, sponsors } from '@/server/db/schema';
import { getCheckout } from '@/server/domain/checkout';
import { channelAllows } from '@/server/domain/pricing/cart';

/*
 * Dalla URL pubblica alla pagina a blocchi (§13.2): /<format> mostra l'edizione in corso o la pagina
 * "fuori stagione", /<format>/<anno> l'edizione di quell'anno. Qui si leggono anche i dati che i
 * blocchi mostrano senza che l'admin li riscriva (prezzi dal catalogo, sponsor, foto, recensioni).
 */

export type SeriesRow = typeof series.$inferSelect;
export type EditionRow = typeof editions.$inferSelect;

/** Stati "in stagione", in ordine di priorità: a parità vince l'edizione che comincia prima. */
const IN_SEASON = ['live', 'on_sale', 'sold_out', 'published'] as const;
/** Le bozze e le edizioni sospese non hanno una pagina pubblica. */
const HIDDEN = ['draft', 'suspended'];

export function pickCurrentEdition<T extends Pick<EditionRow, 'status' | 'startsAt'>>(list: T[]): T | null {
  for (const status of IN_SEASON) {
    const found = list.filter((e) => e.status === status).sort((a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0));
    if (found.length) return found[0];
  }
  return null;
}

export async function seriesByPath(path: string): Promise<SeriesRow | null> {
  const [row] = await getDb().select().from(series).where(eq(series.landingPath, path));
  return row ?? null;
}

async function seriesEditions(seriesId: string): Promise<EditionRow[]> {
  const rows = await getDb().select().from(editions).where(eq(editions.seriesId, seriesId)).orderBy(desc(editions.startsAt));
  return rows.filter((e) => !HIDDEN.includes(e.status));
}

export type ResolvedPage = { series: SeriesRow; edition: EditionRow | null; blocks: Block[]; data: BlockData; theme: string | null };

/** /zuccaland, /assaggia-e-passeggia, …: edizione in corso oppure pagina fuori stagione. */
export async function getFormatPage(path: string, opts: { legacyPageLive: boolean }): Promise<ResolvedPage | null> {
  const s = await seriesByPath(path);
  if (!s) return null;
  const list = await seriesEditions(s.id);
  const current = pickCurrentEdition(list);
  if (current) return editionPage(s, current, list, opts);
  const stored = readBlocks(s.pageBlocks);
  const blocks = stored.length ? stored : defaultOffseasonBlocks(s);
  const data = await resolveBlockData(blocks, { series: s, edition: null, siblings: list, legacyPageLive: opts.legacyPageLive });
  return { series: s, edition: null, blocks, data, theme: s.theme?.dot ?? null };
}

/** /<format>/<anno>: l'edizione di quell'anno, attiva o archiviata. */
export async function getEditionYearPage(path: string, year: number, opts: { legacyPageLive: boolean }): Promise<ResolvedPage | null> {
  const s = await seriesByPath(path);
  if (!s) return null;
  const list = await seriesEditions(s.id);
  const edition = list.find((e) => e.year === year);
  return edition ? editionPage(s, edition, list, opts) : null;
}

async function editionPage(s: SeriesRow, edition: EditionRow, list: EditionRow[], opts: { legacyPageLive: boolean }): Promise<ResolvedPage> {
  const stored = readBlocks(edition.pageBlocks);
  const blocks = stored.length ? stored : defaultEditionBlocks(edition);
  const data = await resolveBlockData(blocks, { series: s, edition, siblings: list, legacyPageLive: opts.legacyPageLive });
  return { series: s, edition, blocks, data, theme: s.theme?.dot ?? null };
}

export function dateLabel(e: Pick<EditionRow, 'startsAt' | 'endsAt' | 'location'>): string {
  if (!e.startsAt) return e.location ?? '';
  const from = formatDate(e.startsAt);
  const to = e.endsAt ? formatDate(e.endsAt) : from;
  return [from === to ? from : `${from} – ${to}`, e.location].filter(Boolean).join(' • ');
}

/** Pagina di un'edizione che non ha ancora blocchi: copertina, acquisto, prezzi, altre edizioni. */
export function defaultEditionBlocks(e: EditionRow): Block[] {
  return [
    newBlock('Hero', { title: e.title, subtitle: e.subtitle ?? '', badge: dateLabel(e), ctaLabel: 'Acquista il tuo biglietto' }),
    newBlock('CTAAcquisto', {}),
    newBlock('Prezzi', {}),
    newBlock('Edizioni', { title: 'Le altre edizioni' }),
    newBlock('Sponsor', {}),
  ];
}

/** Pagina fuori stagione del §13.3, finché l'admin non la compone. */
export function defaultOffseasonBlocks(s: SeriesRow): Block[] {
  return [
    newBlock('Hero', { title: s.name, subtitle: 'Ci vediamo alla prossima edizione!' }),
    ...(s.description ? [newBlock('RichText', { title: `Cos'è ${s.name}`, body: s.description, align: 'centro' })] : []),
    newBlock('Galleria', { title: 'Le edizioni passate in foto' }),
    newBlock('Recensioni', { source: s.slug }),
    newBlock('Edizioni', {}),
    newBlock('Avvisami', {}),
    newBlock('Sponsor', {}),
  ];
}

type ResolveOpts = {
  series: SeriesRow | null;
  edition: EditionRow | null;
  siblings: EditionRow[];
  /** La pagina di oggi del format (ZuccalandClient) è ancora quella pubblica: il suo acquisto vale. */
  legacyPageLive: boolean;
  /** Anteprima dell'editor: carica tutte le categorie di foto e recensioni, non solo quelle usate. */
  preview?: boolean;
};

async function checkoutHref(e: EditionRow, s: SeriesRow | null, legacyPageLive: boolean): Promise<string | null> {
  if (e.status !== 'on_sale' && e.status !== 'live') return null;
  const view = await getCheckout(e.slug);
  if (view?.selling) return `/acquista/${e.slug}`;
  // Edizione che vende ancora dalla pagina di oggi (§18.10): si compra lì finché il flag è spento.
  return legacyPageLive && s?.landingPath ? `${s.landingPath}#acquista` : null;
}

export async function resolveBlockData(blocks: Block[], o: ResolveOpts): Promise<BlockData> {
  const db = getDb();
  const visible = blocks.filter((b) => !b.hidden);
  const has = (t: Block['type']) => o.preview || visible.some((b) => b.type === t);
  const categories = [...new Set(visible.flatMap((b) => ((b.type === 'Galleria' || b.type === 'Ricordi') && b.props.category ? [b.props.category] : [])))];
  const albumNames = o.preview ? ALBUMS.map((a) => a.name) : [...new Set(visible.flatMap((b) => ((b.type === 'Galleria' || b.type === 'Ricordi') && b.props.album ? [b.props.album] : [])))];
  const sources = [...new Set(visible.flatMap((b) => (b.type === 'Recensioni' && b.props.source ? [b.props.source] : [])))];
  const e = o.edition;

  const [productRows, sponsorRows, galleryRows, reviewRows, href, albums] = await Promise.all([
    e && (has('Prezzi') || has('CTAAcquisto') || has('Hero')) ? db.select().from(products).where(and(eq(products.editionId, e.id), eq(products.active, true))).orderBy(asc(products.sort), asc(products.name)) : [],
    has('Sponsor') ? db.select().from(sponsors).where(eq(sponsors.active, true)).orderBy(asc(sponsors.sortOrder)) : [],
    o.preview || categories.length ? db.select().from(gallery).where(o.preview ? undefined : inArray(gallery.category, categories)).orderBy(desc(gallery.createdAt)) : [],
    o.preview || sources.length ? db.select().from(reviews).where(o.preview ? undefined : inArray(reviews.eventId, sources)).orderBy(desc(reviews.createdAt)).limit(200) : [],
    e ? checkoutHref(e, o.series, o.legacyPageLive) : null,
    Promise.all(albumNames.map(async (name) => [name, await loadAlbum(name)] as const)).then(Object.fromEntries),
  ]);

  const group = <T, K extends string>(rows: T[], key: (r: T) => K) => rows.reduce<Record<string, T[]>>((acc, r) => ((acc[key(r)] ??= []).push(r), acc), {});
  const base = o.series?.landingPath;
  return {
    preview: o.preview,
    edition: e ? { slug: e.slug, title: e.title, year: e.year, startsAt: e.startsAt?.toISOString() ?? null, endsAt: e.endsAt?.toISOString() ?? null, location: e.location, status: e.status } : null,
    series: o.series ? { id: o.series.id, slug: o.series.slug, name: o.series.name, landingPath: o.series.landingPath } : null,
    checkoutHref: href,
    prices: productRows.filter((p) => channelAllows(p, 'online')).map((p) => ({ id: p.id, name: p.name, description: p.description, priceCents: p.priceCents, extra: p.kind !== 'ticket' })),
    sponsors: sponsorRows.map((s) => ({ name: s.name, logoUrl: s.logoUrl, websiteUrl: s.websiteUrl })),
    gallery: group(
      galleryRows.map((g) => ({ category: g.category, src: g.src, alt: g.alt, width: g.width, height: g.height })),
      (g) => g.category,
    ),
    albums,
    reviews: group(
      reviewRows.map((r) => ({ source: r.eventId, name: r.name, rating: r.rating, comment: r.comment })),
      (r) => r.source,
    ),
    editions: base
      ? o.siblings
          .filter((x) => x.id !== e?.id && x.year)
          .map((x) => ({ year: x.year, title: x.title, href: `${base}/${x.year}`, current: (IN_SEASON as readonly string[]).includes(x.status) }))
      : [],
  };
}
