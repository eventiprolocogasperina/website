import 'server-only';
import { desc } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { events } from '@/server/db/schema';
import type { EditionStatus, EditionSummary } from './types';

/*
 * Adattatore provvisorio (prompt 06): ricostruisce le "edizioni" dalla tabella events e dagli ID
 * fissi usati oggi nel codice. Il prompt 08 lo sostituisce con le tabelle formats/editions.
 */

type FixedEdition = Omit<EditionSummary, 'status' | 'startsOn'> & {
  /** Stato forzato; se assente si deduce dalla data. */
  status?: EditionStatus;
};

const FIXED: FixedEdition[] = [
  {
    slug: 'zuccaland-2026',
    title: 'Zuccaland 2026',
    format: 'zuccaland',
    dot: 'orange',
    modules: ['invites', 'visitor-photos', 'reviews'],
    legacyIds: ['zuccaland-2026'],
    hasPageEditor: true,
  },
  {
    slug: 'assaggia-e-passeggia-2026',
    title: 'Assaggia e Passeggia 2026',
    format: 'assaggia-e-passeggia',
    dot: 'blue',
    status: 'archived',
    modules: ['reviews'],
    legacyIds: ['assaggia-passeggia-2026', 'assaggia-passeggia'],
    hasPageEditor: true,
  },
  {
    slug: 'baguette-2026',
    title: 'La Baguette da Record 2026',
    format: null,
    dot: 'gold',
    modules: [],
    legacyIds: ['baguette-2026'],
    hasPageEditor: false,
  },
];

type EventRow = { id: string; title: string; date: string };

/** Stato dedotto dalla data: prima del giorno dell'evento è in vendita o pubblicato, poi concluso. */
export function statusFromDate(date: string | null, today: string, bookable = true): EditionStatus {
  if (!date) return 'draft';
  if (date > today) return bookable ? 'on_sale' : 'published';
  if (date === today) return 'live';
  return 'concluded';
}

/** Funzione pura, testabile: unisce gli ID fissi con le righe di events. */
export function buildLegacyEditions(rows: Array<EventRow & { bookable?: boolean | null }>, today: string): EditionSummary[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const used = new Set<string>();
  const out: EditionSummary[] = FIXED.map((f) => {
    const row = f.legacyIds.map((id) => byId.get(id)).find(Boolean);
    f.legacyIds.forEach((id) => used.add(id));
    const startsOn = row?.date ?? null;
    return { ...f, startsOn, status: f.status ?? statusFromDate(startsOn, today) };
  });
  for (const r of rows) {
    if (used.has(r.id)) continue;
    out.push({
      slug: r.id,
      title: r.title,
      format: null,
      status: statusFromDate(r.date, today, !!r.bookable),
      startsOn: r.date,
      dot: 'gray',
      modules: [],
      legacyIds: [r.id],
      hasPageEditor: false,
    });
  }
  // Prima le edizioni future (dalla più vicina), poi le passate (dalla più recente).
  return out.sort((a, b) => {
    const af = (a.startsOn ?? '') >= today;
    const bf = (b.startsOn ?? '') >= today;
    if (af !== bf) return af ? -1 : 1;
    return af ? (a.startsOn ?? '').localeCompare(b.startsOn ?? '') : (b.startsOn ?? '').localeCompare(a.startsOn ?? '');
  });
}

export async function listLegacyEditions(today: string): Promise<EditionSummary[]> {
  const rows = await getDb()
    .select({ id: events.id, title: events.title, date: events.date, bookable: events.bookable })
    .from(events)
    .orderBy(desc(events.date));
  return buildLegacyEditions(rows, today);
}
