import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { cache } from 'react';
import { getDb } from '@/server/db/client';
import { editions, events, legacyIdMap, series, sessions } from '@/server/db/schema';
import { editionHrefs, isEventCategory, normalizeLandingPath, VISIBLE_STATUSES, type PublicEdition, type PublicEditionStatus } from '@/lib/public/editions';
import type { NavFormat } from '@/lib/public/nav';
import type { JsonLdSession } from '@/lib/seo/jsonld';

// Lettura delle edizioni per il sito pubblico (calendario, menu, sitemap, schede). Solo dati pubblici.

type Row = {
  e: typeof editions.$inferSelect;
  s: { slug: string; name: string; landingPath: string | null; theme: { dot?: string } } | null;
  legacySlug: string | null;
  legacyDescription: string | null;
};

async function loadRows(where?: ReturnType<typeof eq>): Promise<Row[]> {
  const rows = await getDb()
    .select({
      e: editions,
      s: { slug: series.slug, name: series.name, landingPath: series.landingPath, theme: series.theme },
      legacySlug: events.slug,
      legacyDescription: events.description,
    })
    .from(editions)
    .leftJoin(series, eq(series.id, editions.seriesId))
    .leftJoin(legacyIdMap, and(eq(legacyIdMap.newId, editions.id), eq(legacyIdMap.legacyKind, 'event')))
    .leftJoin(events, eq(events.id, legacyIdMap.legacyId))
    .where(where ? and(where, inArray(editions.status, [...VISIBLE_STATUSES])) : inArray(editions.status, [...VISIBLE_STATUSES]))
    .orderBy(asc(editions.startsAt), asc(events.slug));
  // Un'edizione può avere più eventi di oggi collegati (A&P): vale il primo.
  const seen = new Set<string>();
  return rows.filter((r) => !seen.has(r.e.id) && !!seen.add(r.e.id));
}

function toPublic({ e, s, legacySlug, legacyDescription }: Row): PublicEdition {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    subtitle: e.subtitle,
    description: e.subtitle || legacyDescription?.replace(/\*\*?/g, '') || null,
    year: e.year,
    status: e.status as PublicEditionStatus,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    location: e.location,
    coverImage: e.coverImage,
    category: isEventCategory(e.category) ? e.category : null,
    publicPageMode: e.publicPageMode,
    series: s ? { slug: s.slug, name: s.name, landingPath: s.landingPath, dot: s.theme?.dot ?? null } : null,
    legacySlug,
  };
}

/** Edizioni visibili sul sito (non bozze né sospese), in ordine di data. */
export const listPublicEditions = cache(async (): Promise<PublicEdition[]> => (await loadRows()).map(toPublic));

/** Edizioni visibili con il loro indirizzo pubblico (pagina dedicata o scheda). */
export const listPublicEditionsWithHref = cache(async () => {
  const list = await listPublicEditions();
  return { list, hrefs: editionHrefs(list) };
});

/**
 * Edizione per /eventi/[slug]: per slug dell'edizione o, per i vecchi link, per slug dell'evento di oggi
 * (es. /eventi/concerto-di-natale-2026 → edizione concerto-natale-2026).
 */
export async function findPublicEdition(slug: string): Promise<{ edition: PublicEdition; href: string; byLegacySlug: boolean } | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const { list, hrefs } = await listPublicEditionsWithHref();
  const direct = list.find((e) => e.slug === slug);
  const edition = direct ?? list.find((e) => e.legacySlug === slug);
  return edition ? { edition, href: hrefs.get(edition.id)!, byLegacySlug: !direct } : null;
}

/** Format con una pagina pubblica e almeno un'edizione visibile: le voci della tendina "Eventi". */
export const listPublicFormats = cache(async (): Promise<NavFormat[]> => {
  const out = new Map<string, NavFormat>();
  for (const e of await listPublicEditions()) {
    const href = normalizeLandingPath(e.series?.landingPath);
    if (e.series && href && !out.has(e.series.slug)) out.set(e.series.slug, { slug: e.series.slug, name: e.series.name, href });
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'));
});

/** Date dell'edizione per lo stato schema.org (rinvii e annullamenti). */
export async function editionSessionsForJsonLd(editionId: string): Promise<JsonLdSession[]> {
  const rows = await getDb()
    .select({ startsAt: sessions.startsAt, endsAt: sessions.endsAt, status: sessions.status, to: sessions.rescheduledToSessionId })
    .from(sessions)
    .where(eq(sessions.editionId, editionId));
  return rows.map((r) => ({ startsAt: r.startsAt, endsAt: r.endsAt, status: r.status, rescheduled: !!r.to }));
}
