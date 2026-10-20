// Regole pure del sito pubblico sulle edizioni (§13.2): quali si vedono, qual è quella corrente di un
// format, a quale indirizzo porta la card. Niente database: le usano calendario, menu, sitemap e test.

export const EVENT_CATEGORIES = ['cultura', 'musica', 'gastronomia', 'sport', 'comunità'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  cultura: 'Cultura',
  musica: 'Musica',
  gastronomia: 'Gastronomia',
  sport: 'Sport',
  comunità: 'Comunità',
};
export const isEventCategory = (v: unknown): v is EventCategory => typeof v === 'string' && (EVENT_CATEGORIES as readonly string[]).includes(v);

export type PublicEditionStatus = 'draft' | 'published' | 'on_sale' | 'sold_out' | 'live' | 'concluded' | 'archived' | 'suspended';

/** Stati che compaiono sul sito. Bozze e edizioni sospese restano nascoste. */
export const VISIBLE_STATUSES: readonly PublicEditionStatus[] = ['published', 'on_sale', 'sold_out', 'live', 'concluded', 'archived'];
/** Stati di un'edizione "in corso" per la pagina del format (§13.2): altrimenti si mostra il fuori stagione. */
export const CURRENT_STATUSES: readonly PublicEditionStatus[] = ['published', 'on_sale', 'sold_out', 'live'];

export type PublicEdition = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  /** Testo breve della card: il sottotitolo, altrimenti la descrizione dell'evento di oggi collegato. */
  description: string | null;
  year: number | null;
  status: PublicEditionStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  location: string | null;
  coverImage: string | null;
  category: EventCategory | null;
  publicPageMode: 'generic' | 'landing';
  /** Format, con il colore del pallino (series.theme.dot) per i temi e le immagini OG. */
  series: { slug: string; name: string; landingPath: string | null; dot: string | null } | null;
  /** Slug dell'evento di oggi collegato (tabella `events`), se esiste: serve per i vecchi URL. */
  legacySlug: string | null;
};

type SeriesEdition = Pick<PublicEdition, 'id' | 'status' | 'startsAt'>;

/**
 * Edizione corrente di un format: la prima, in ordine di data, tra quelle pubblicate, in vendita,
 * esaurite o in corso. Così con Zuccaland 2026 in vendita e 2027 già pubblicata vince il 2026.
 * null = il format è "fuori stagione".
 */
export function currentEditionOf<T extends SeriesEdition>(editions: readonly T[]): T | null {
  const active = editions.filter((e) => CURRENT_STATUSES.includes(e.status));
  active.sort((a, b) => (a.startsAt?.getTime() ?? Infinity) - (b.startsAt?.getTime() ?? Infinity));
  return active[0] ?? null;
}

/** Normalizza il percorso pubblico di un format: "/zuccaland" (senza barra finale), null se vuoto o non valido. */
export function normalizeLandingPath(path: string | null | undefined): string | null {
  const p = (path ?? '').trim().replace(/\/+$/, '');
  return /^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(p) ? p : null;
}

/**
 * Indirizzo pubblico di un'edizione (decisione 1A):
 * - pagina dedicata con format: `/<format>` per l'edizione corrente, `/<format>/<anno>` per le altre;
 * - pagina dedicata senza format pubblico ma con un evento di oggi: la sua pagina di oggi;
 * - altrimenti la scheda generica `/eventi/<slug>`.
 */
export function editionHref(e: Pick<PublicEdition, 'slug' | 'year' | 'publicPageMode' | 'series' | 'legacySlug'>, isCurrent: boolean): string {
  if (e.publicPageMode === 'landing') {
    const base = normalizeLandingPath(e.series?.landingPath);
    if (base) return isCurrent || !e.year ? base : `${base}/${e.year}`;
    if (e.legacySlug && e.legacySlug !== e.slug) return `/eventi/${e.legacySlug}`;
  }
  return `/eventi/${e.slug}`;
}

/** Indirizzi di tutte le edizioni visibili, calcolando per ogni format qual è quella corrente. */
export function editionHrefs(list: readonly PublicEdition[]): Map<string, string> {
  const currentBySeries = new Map<string, string | null>();
  for (const e of list) {
    if (!e.series || currentBySeries.has(e.series.slug)) continue;
    currentBySeries.set(e.series.slug, currentEditionOf(list.filter((x) => x.series?.slug === e.series!.slug))?.id ?? null);
  }
  return new Map(list.map((e) => [e.id, editionHref(e, !!e.series && currentBySeries.get(e.series.slug) === e.id)]));
}

/** Data dell'edizione nel fuso di Roma come "AAAA-MM-GG" (per filtri, ordinamento, passato/futuro). */
export function romeDay(d: Date | null): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Un'edizione è passata quando è finita (o, senza fine, quando è passato il suo giorno) o è conclusa. */
export function isPastEdition(e: Pick<PublicEdition, 'status' | 'startsAt' | 'endsAt'>, today: string): boolean {
  if (e.status === 'concluded' || e.status === 'archived') return true;
  const last = romeDay(e.endsAt ?? e.startsAt);
  return !!last && last < today;
}
