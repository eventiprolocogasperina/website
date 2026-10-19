// Piano del backfill (prompt 08): dai dati attuali (events, pages_content['zuccaland'], cassa)
// ai format, alle edizioni, alle date e al catalogo. Funzione pura: lo script
// scripts/backfill-editions.ts legge i dati, chiama planBackfill e scrive solo ciò che manca.
import type { CashierConfig } from '@/lib/data/cashier';
import type { ZuccalandContent } from '@/lib/data/pages';
import { romeDateKey, romeDateTime, romeTime } from '@/lib/dates';
import type { SeriesTheme } from '@/server/db/schema/catalog';
import type { EditionStatus, ModuleKey } from './types';

export type LegacyRef = { kind: string; id: string };

export type PlannedSeries = { slug: string; name: string; description: string | null; landingPath: string | null; theme: SeriesTheme };
export type PlannedEdition = {
  slug: string;
  title: string;
  year: number | null;
  seriesSlug: string | null;
  status: EditionStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  location: string | null;
  coverImage: string | null;
  publicPageMode: 'generic' | 'landing';
  enabledModules: ModuleKey[];
  legacy: LegacyRef[];
};
export type PlannedSession = {
  edition: string;
  label: string;
  startsAt: Date;
  endsAt: Date | null;
  capacity: number | null;
  status: 'open' | 'closed' | 'sold_out' | 'cancelled' | 'postponed';
  sort: number;
  legacy: LegacyRef;
};
export type PlannedProduct = {
  edition: string;
  kind: 'ticket' | 'addon' | 'food' | 'drink' | 'merch' | 'donation' | 'service';
  name: string;
  description: string | null;
  icon: string | null;
  priceCents: number;
  channels: string[];
  requiresSession: boolean;
  issuesTicket: boolean;
  department: string | null;
  active: boolean;
  sort: number;
  legacy: LegacyRef;
};
export type PlannedQuota = { edition: string; name: string; size: number; products: LegacyRef[]; legacy: LegacyRef };
export type BackfillPlan = {
  series: PlannedSeries[];
  editions: PlannedEdition[];
  sessions: PlannedSession[];
  products: PlannedProduct[];
  quotas: PlannedQuota[];
  /** Righe non importate, con il motivo. */
  skipped: Array<{ source: string; id: string; reason: string }>;
  /** Scelte da rivedere a mano. */
  notes: string[];
};

export type LegacyEventRow = {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  maxParticipants: number;
  price: number;
  bookable: boolean;
  isFree: boolean | null;
};

/** I format di oggi e le edizioni 2026 collegate (ex legacyEditions.ts del prompt 06). */
const SERIES: Array<PlannedSeries & { editions: Array<{ slug: string; legacyIds: string[]; status?: EditionStatus; modules: ModuleKey[] }> }> = [
  {
    slug: 'zuccaland',
    name: 'Zuccaland',
    description: 'Il villaggio delle zucche di Gasperina.',
    landingPath: '/zuccaland',
    theme: { dot: 'orange' },
    editions: [
      {
        slug: 'zuccaland-2026',
        legacyIds: ['zuccaland-2026'],
        modules: ['time-slots', 'attendee-questions', 'postponement', 'invites', 'visitor-photos', 'paylink', 'broadcast', 'reviews', 'landing-page'],
      },
    ],
  },
  {
    slug: 'assaggia-e-passeggia',
    name: 'Assaggia e Passeggia',
    description: 'Percorso enogastronomico a tappe nel borgo.',
    landingPath: '/assaggia-e-passeggia',
    theme: { dot: 'blue' },
    editions: [
      { slug: 'assaggia-e-passeggia-2026', legacyIds: ['assaggia-passeggia-2026', 'assaggia-passeggia'], status: 'archived', modules: ['route-stops', 'reviews', 'landing-page'] },
    ],
  },
  {
    slug: 'baguette-da-record',
    name: 'Baguette da Record',
    description: null,
    landingPath: null,
    theme: { dot: 'gold' },
    editions: [{ slug: 'baguette-2026', legacyIds: ['baguette-2026'], modules: [] }],
  },
];

/** Stato dedotto dalla data: prima del giorno dell'evento in vendita (o pubblicata), poi conclusa. */
export function statusFromDate(date: string | null, today: string, bookable = true): EditionStatus {
  if (!date) return 'draft';
  if (date > today) return bookable ? 'on_sale' : 'published';
  if (date === today) return 'live';
  return 'concluded';
}

export function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'edizione'
  );
}

const yearOf = (date: Date | null, title: string) => (date ? Number(romeDateKey(date).slice(0, 4)) : Number(title.match(/20\d\d/)?.[0]) || null);
const eurosToCents = (euros: number) => Math.round(Number(euros) * 100);
const validTime = (t: string) => (/^\d{1,2}:\d{2}$/.test(t.trim()) ? t.trim().padStart(5, '0') : '00:00');

const dayLabel = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', day: 'numeric', month: 'short' });
export const sessionLabel = (d: Date) => {
  const s = dayLabel.format(d).replace(/\./g, '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Categoria della cassa → tipo di prodotto. */
export function cashierKind(category: string, department?: string): 'food' | 'drink' {
  return /bevand|bibit|\bbar\b|drink|vino|birra|caff|acqua/i.test(`${category} ${department ?? ''}`) ? 'drink' : 'food';
}

export function planBackfill(input: { events: LegacyEventRow[]; zuccaland: ZuccalandContent | null; cashier: CashierConfig | null; today: string }): BackfillPlan {
  const plan: BackfillPlan = { series: [], editions: [], sessions: [], products: [], quotas: [], skipped: [], notes: [] };
  const eventsById = new Map(input.events.map((e) => [e.id, e]));
  const usedEvents = new Set<string>();

  // 1. Format e le loro edizioni 2026.
  for (const s of SERIES) {
    plan.series.push({ slug: s.slug, name: s.name, description: s.description, landingPath: s.landingPath, theme: s.theme });
    for (const fixed of s.editions) {
      const row = fixed.legacyIds.map((id) => eventsById.get(id)).find(Boolean);
      fixed.legacyIds.forEach((id) => usedEvents.add(id));
      let startsAt = row ? romeDateTime(row.date, validTime(row.time)) : null;
      let endsAt: Date | null = null;
      if (fixed.slug === 'zuccaland-2026' && input.zuccaland?.event) {
        startsAt = new Date(input.zuccaland.event.startDate);
        endsAt = new Date(input.zuccaland.event.endDate);
      }
      const title = row?.title ?? `${s.name} 2026`;
      plan.editions.push({
        slug: fixed.slug,
        title,
        year: yearOf(startsAt, title),
        seriesSlug: s.slug,
        status: fixed.status ?? statusFromDate(row?.date ?? null, input.today, true),
        startsAt,
        endsAt,
        location: row?.location ?? null,
        coverImage: row?.image || null,
        publicPageMode: 'landing',
        enabledModules: fixed.modules,
        legacy: [
          ...(row ? [{ kind: 'event', id: row.id }] : []),
          ...fixed.legacyIds.map((id) => ({ kind: 'legacy_event_id', id })),
        ],
      });
      if (!row) plan.notes.push(`${title}: nessuna riga in events con ID ${fixed.legacyIds.join(' o ')}; date e luogo da completare a mano.`);
      if (row && fixed.slug !== 'zuccaland-2026') addEventCatalog(plan, fixed.slug, row);
    }
  }

  // 2. Zuccaland 2026: date da dateLimits, prodotti da ticketTypes.
  if (input.zuccaland) addZuccaland(plan, input.zuccaland);
  else plan.notes.push('pages_content[zuccaland] assente: Zuccaland 2026 resta senza date né prodotti.');

  // 3. Le altre righe di events diventano edizioni singole con la scheda generica.
  for (const row of input.events) {
    if (usedEvents.has(row.id)) continue;
    const slug = slugify(row.id);
    const startsAt = romeDateTime(row.date, validTime(row.time));
    plan.editions.push({
      slug,
      title: row.title,
      year: yearOf(startsAt, row.title),
      seriesSlug: null,
      status: statusFromDate(row.date, input.today, row.bookable),
      startsAt,
      endsAt: null,
      location: row.location || null,
      coverImage: row.image || null,
      publicPageMode: 'generic',
      enabledModules: row.bookable && (row.isFree || row.price === 0) ? ['free-booking'] : [],
      legacy: [{ kind: 'event', id: row.id }],
    });
    addEventCatalog(plan, slug, row);
  }

  // 4. Cassa: ogni evento della configurazione porta i suoi prodotti con il canale "pos".
  for (const evt of input.cashier?.events ?? []) {
    let edition = plan.editions.find((e) => e.legacy.some((l) => l.id === evt.id));
    if (!edition) {
      const slug = slugify(evt.id);
      if (slug !== evt.id) plan.notes.push(`Cassa "${evt.name}": l'ID ${evt.id} diventa lo slug ${slug}.`);
      edition = {
        slug,
        title: evt.name,
        year: yearOf(null, evt.name),
        seriesSlug: null,
        status: 'draft',
        startsAt: null,
        endsAt: null,
        location: null,
        coverImage: null,
        publicPageMode: 'generic',
        enabledModules: evt.enableDepartments ? ['departments'] : [],
        legacy: [{ kind: 'cashier_event', id: evt.id }],
      };
      plan.editions.push(edition);
      plan.notes.push(`"${evt.name}" esiste solo nella cassa: creata come bozza senza date. Completa date e stato dall'admin.`);
    } else {
      edition.legacy.push({ kind: 'cashier_event', id: evt.id });
    }
    evt.items.forEach((item, i) => {
      const ref = { kind: 'cashier_item', id: `${evt.id}:${item.id}` };
      if (!Number.isFinite(Number(item.price)) || Number(item.price) < 0) {
        plan.skipped.push({ source: 'cassa', id: ref.id, reason: `prezzo non valido (${String(item.price)})` });
        return;
      }
      plan.products.push({
        edition: edition.slug,
        kind: cashierKind(item.category, item.department),
        name: item.name,
        description: item.description ?? null,
        icon: item.icon ?? null,
        priceCents: eurosToCents(item.price),
        channels: ['pos'],
        requiresSession: false,
        issuesTicket: false,
        department: item.department || item.category || null,
        active: item.isAvailable !== false,
        sort: i,
        legacy: ref,
      });
      if (typeof item.stockQuantity === 'number' && item.stockQuantity >= 0) {
        plan.quotas.push({ edition: edition.slug, name: `Scorta: ${item.name}`, size: Math.floor(item.stockQuantity), products: [ref], legacy: { kind: 'cashier_stock', id: ref.id } });
      }
    });
  }

  return plan;
}

/** Una data e, se l'evento vende o prenota, un prodotto con la sua capienza. */
function addEventCatalog(plan: BackfillPlan, edition: string, row: LegacyEventRow) {
  const startsAt = romeDateTime(row.date, validTime(row.time));
  const sessionRef = { kind: 'event_session', id: row.id };
  plan.sessions.push({
    edition,
    label: sessionLabel(startsAt),
    startsAt,
    endsAt: null,
    capacity: row.maxParticipants > 0 ? row.maxParticipants : null,
    status: 'open',
    sort: 0,
    legacy: sessionRef,
  });
  const free = !!row.isFree || row.price === 0;
  if (!row.bookable && row.price <= 0) {
    plan.skipped.push({ source: 'events', id: row.id, reason: 'evento senza prezzo né prenotazione: nessun prodotto' });
    return;
  }
  plan.products.push({
    edition,
    kind: 'ticket',
    name: free ? 'Prenotazione' : 'Biglietto',
    description: null,
    icon: null,
    priceCents: free ? 0 : eurosToCents(row.price),
    channels: ['online'],
    requiresSession: true,
    issuesTicket: !free,
    department: null,
    active: true,
    sort: 0,
    legacy: { kind: 'event_product', id: row.id },
  });
}

function addZuccaland(plan: BackfillPlan, content: ZuccalandContent) {
  const edition = 'zuccaland-2026';
  const start = content.event?.startDate ? new Date(content.event.startDate) : romeDateTime('2026-10-17', '10:30');
  const monthKey = romeDateKey(start).slice(0, 8); // "2026-10-"
  const openAt = romeTime(start);
  const days = Object.entries(content.dateLimits ?? {}).sort(([a], [b]) => Number(a) - Number(b));
  days.forEach(([day, limit], i) => {
    if (!limit) return;
    const startsAt = romeDateTime(`${monthKey}${day.padStart(2, '0')}`, openAt);
    plan.sessions.push({
      edition,
      label: sessionLabel(startsAt),
      startsAt,
      endsAt: null,
      capacity: limit.enabled ? limit.maxTickets : null,
      status: limit.active === false ? 'closed' : limit.manualSoldOut ? 'sold_out' : 'open',
      sort: i,
      legacy: { kind: 'zuccaland_day', id: `${edition}:${day}` },
    });
  });
  if (days.length) plan.notes.push('Zuccaland 2026: le date non attive diventano "chiuse", quelle segnate esaurite a mano diventano "esaurite". Le capienze contano solo gli ingressi, come oggi.');

  (content.ticketTypes ?? []).forEach((t, i) => {
    const ref = { kind: 'ticket_type', id: `${edition}:${t.id}` };
    if (!Number.isFinite(Number(t.price)) || Number(t.price) < 0) {
      plan.skipped.push({ source: 'zuccaland.ticketTypes', id: t.id, reason: `prezzo non valido (${String(t.price)})` });
      return;
    }
    plan.products.push({
      edition,
      kind: t.isExtra ? 'addon' : 'ticket',
      name: t.label,
      description: t.description || null,
      icon: t.emoji || null,
      priceCents: eurosToCents(t.price),
      channels: ['online'],
      requiresSession: true,
      issuesTicket: true,
      department: null,
      active: true,
      sort: i,
      legacy: ref,
    });
  });
}
