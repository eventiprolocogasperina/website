import 'server-only';
import { legacyCard } from '@/components/events/EventCard';
import { getAllEvents, isEventPast } from '@/lib/data/events';
import { buildCalendar, type Calendar, type CalendarFilters, type EventCardData } from '@/lib/public/calendar';
import { romeDay } from '@/lib/public/editions';
import { listPublicEditionsWithHref } from './editions';
import { publicV2Enabled } from './flags';

export type EventCards = { upcoming: EventCardData[]; past: EventCardData[]; calendar: Calendar | null };

/**
 * Card degli eventi per home e calendario. Con il flag public_v2: le edizioni dall'admin (con i filtri);
 * senza: gli eventi di oggi, come prima.
 */
export async function loadEventCards(filters: CalendarFilters = { category: null, month: null }): Promise<EventCards> {
  if (await publicV2Enabled()) {
    const { list, hrefs } = await listPublicEditionsWithHref();
    const calendar = buildCalendar(list, hrefs, filters, romeDay(new Date())!);
    return { upcoming: calendar.upcoming, past: calendar.past, calendar };
  }
  const events = await getAllEvents();
  const today = new Date().toISOString().split('T')[0];
  return {
    upcoming: events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).map(legacyCard),
    past: events.filter((e) => isEventPast(e)).map(legacyCard),
    calendar: null,
  };
}
