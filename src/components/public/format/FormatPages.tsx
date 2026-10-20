import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BlockPage } from '@/components/public/blocks/BlockRenderer';
import { getEditionYearPage, getFormatPage, publicV2Enabled, type ResolvedPage } from '@/server/domain/pages';

/*
 * Pagine pubbliche del format e dell'edizione (§13.2): le rotte /zuccaland, /assaggia-e-passeggia,
 * /<format> e /<format>/<anno> sono file sottili che chiamano queste funzioni.
 */

/** "2026" → 2026; qualsiasi altra cosa → null (e la rotta risponde 404). */
export function parseYear(raw: string): number | null {
  return /^(19|20)\d{2}$/.test(raw) ? Number(raw) : null;
}

/** Con il flag spento la pagina di oggi del format è ancora quella pubblica (e vende). */
const legacyPageLive = async () => !(await publicV2Enabled());

function describe(page: ResolvedPage): Metadata {
  const hero = page.blocks.find((b) => b.type === 'Hero' && !b.hidden);
  const subtitle = hero?.type === 'Hero' ? hero.props.subtitle || hero.props.description : '';
  const title = page.edition ? page.edition.title : page.series.name;
  const description = subtitle || page.series.description || `${title} a Gasperina: programma, biglietti e informazioni.`;
  const canonical = page.edition && page.edition.year ? `${page.series.landingPath}/${page.edition.year}` : (page.series.landingPath ?? undefined);
  return { title, description, alternates: canonical ? { canonical } : undefined, openGraph: { title, description } };
}

export async function formatPageMetadata(path: string): Promise<Metadata> {
  const page = await getFormatPage(path, { legacyPageLive: await legacyPageLive() });
  if (!page) return {};
  // In stagione la pagina del format mostra l'edizione: il canonico resta /<format>.
  return { ...describe(page), alternates: { canonical: path } };
}

export async function FormatPage({ path }: { path: string }) {
  const page = await getFormatPage(path, { legacyPageLive: await legacyPageLive() });
  if (!page) notFound();
  return <BlockPage blocks={page.blocks} data={page.data} theme={page.theme} />;
}

export async function editionYearMetadata(path: string, rawYear: string): Promise<Metadata> {
  const year = parseYear(rawYear);
  const page = year ? await getEditionYearPage(path, year, { legacyPageLive: await legacyPageLive() }) : null;
  return page ? describe(page) : {};
}

export async function EditionYearPage({ path, year: rawYear }: { path: string; year: string }) {
  const year = parseYear(rawYear);
  const page = year ? await getEditionYearPage(path, year, { legacyPageLive: await legacyPageLive() }) : null;
  if (!page) notFound();
  return <BlockPage blocks={page.blocks} data={page.data} theme={page.theme} />;
}
