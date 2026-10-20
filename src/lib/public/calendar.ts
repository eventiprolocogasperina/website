// Calendario pubblico /eventi (§13.2): prossime edizioni e archivio, filtri per categoria e mese.
import { CATEGORY_LABELS, isEventCategory, isPastEdition, romeDay, type EventCategory, type PublicEdition } from './editions';

/** Dati di una card evento, comuni al calendario e a "Prossimi eventi" della home. */
export type EventCardData = {
  id: string;
  slug: string;
  href: string;
  title: string;
  /** Giorno "AAAA-MM-GG" (fuso di Roma); vuoto se la data non è ancora nota. */
  date: string;
  /** Testo al posto della data, es. "Ottobre 2026" quando il giorno non è deciso. */
  dateLabel?: string;
  time: string;
  location: string;
  category: EventCategory | null;
  description: string;
  image: string;
  featured: boolean;
};

export const FALLBACK_IMAGE = '/img/Event_1.jpeg';

export type CalendarFilters = { category: EventCategory | null; month: string | null };

/** Filtri dall'URL (?categoria=musica&mese=2026-12); i valori non validi si ignorano. */
export function parseCalendarFilters(params: Record<string, string | string[] | undefined>): CalendarFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const category = one(params.categoria);
  const month = one(params.mese);
  return { category: isEventCategory(category) ? category : null, month: /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null };
}

const romeTime = (d: Date) => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }).format(d);

export function toCard(e: PublicEdition, href: string, featured = false): EventCardData {
  const date = romeDay(e.startsAt) ?? '';
  return {
    id: e.id,
    slug: e.slug,
    href,
    title: e.title,
    date,
    dateLabel: date ? undefined : e.year ? `Data da definire ${e.year}` : 'Data da definire',
    time: e.startsAt ? romeTime(e.startsAt) : 'TBD',
    location: e.location ?? 'Gasperina',
    category: e.category,
    description: e.description ?? '',
    image: e.coverImage || FALLBACK_IMAGE,
    featured,
  };
}

export type Calendar = {
  upcoming: EventCardData[];
  past: EventCardData[];
  /** Mesi ("AAAA-MM") che hanno almeno un'edizione, per il filtro. */
  months: string[];
  /** Categorie presenti, per il filtro. */
  categories: Array<{ value: EventCategory; label: string }>;
};

export function buildCalendar(list: readonly PublicEdition[], hrefs: Map<string, string>, filters: CalendarFilters, today: string): Calendar {
  const months = [...new Set(list.map((e) => romeDay(e.startsAt)?.slice(0, 7)).filter((m): m is string => !!m))].sort();
  const categories = [...new Set(list.map((e) => e.category).filter((c): c is EventCategory => !!c))].map((value) => ({ value, label: CATEGORY_LABELS[value] }));
  const matches = list.filter(
    (e) => (!filters.category || e.category === filters.category) && (!filters.month || romeDay(e.startsAt)?.startsWith(filters.month)),
  );
  const card = (e: PublicEdition) => toCard(e, hrefs.get(e.id) ?? `/eventi/${e.slug}`);
  const byDate = (a: EventCardData, b: EventCardData) => (a.date || '9999').localeCompare(b.date || '9999');
  return {
    upcoming: matches.filter((e) => !isPastEdition(e, today)).map(card).sort(byDate),
    past: matches.filter((e) => isPastEdition(e, today)).map(card).sort((a, b) => byDate(b, a)),
    months,
    categories,
  };
}

/** Le prossime edizioni per la home: al massimo `limit`, in ordine di data. */
export function upcomingCards(list: readonly PublicEdition[], hrefs: Map<string, string>, today: string, limit = 3): EventCardData[] {
  return buildCalendar(list, hrefs, { category: null, month: null }, today)
    .upcoming.slice(0, limit)
    .map((c) => ({ ...c, featured: true }));
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const label = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('it-IT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
