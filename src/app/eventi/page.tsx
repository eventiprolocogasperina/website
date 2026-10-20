import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import EventCard, { legacyCard } from '@/components/events/EventCard';
import { CalendarFilterBar } from '@/components/events/CalendarFilterBar';
import { getAllEvents, isEventPast } from '@/lib/data/events';
import { buildCalendar, parseCalendarFilters, type EventCardData } from '@/lib/public/calendar';
import { romeDay } from '@/lib/public/editions';
import { listPublicEditionsWithHref } from '@/server/public/editions';
import { publicV2Enabled } from '@/server/public/flags';

export const metadata: Metadata = {
  title: 'Eventi',
  description: 'Scopri tutti gli eventi organizzati dalla Pro Loco Gasperina APS: sagre, concerti, esperienze enogastronomiche e molto altro.',
  alternates: { canonical: '/eventi' },
  openGraph: { title: 'Eventi della Pro Loco Gasperina', url: '/eventi', images: [{ url: '/img/Event_1.jpeg' }] },
};

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: '1.5rem' } as const;

function Section({ label, title, accent, cards, past, dark }: { label: string; title: string; accent: string; cards: EventCardData[]; past: boolean; dark?: boolean }) {
  return (
    <section className="section" style={dark ? { background: 'var(--neutral-900)' } : undefined}>
      <div className="section-inner">
        <div style={{ marginBottom: '2rem' }}>
          <p className="label">{label}</p>
          <h2 style={{ marginTop: '0.5rem' }}>
            {title} <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>{accent}</em>
          </h2>
        </div>
        <div style={grid}>
          {cards.map((event) => (
            <EventCard key={event.id} event={event} isPast={past} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Calendario (§13.2). Con il flag public_v2: le edizioni dall'admin, con filtri per categoria e mese, e le
 * card delle pagine dedicate che portano a /zuccaland, /assaggia-e-passeggia… Senza: gli eventi di oggi.
 */
export default async function EventiPage({ searchParams }: Props) {
  const v2 = await publicV2Enabled();
  let upcoming: EventCardData[];
  let past: EventCardData[];
  let filters: React.ReactNode = null;
  let empty = false;

  if (v2) {
    const { list, hrefs } = await listPublicEditionsWithHref();
    const current = parseCalendarFilters(await searchParams);
    const cal = buildCalendar(list, hrefs, current, romeDay(new Date())!);
    upcoming = cal.upcoming;
    past = cal.past;
    empty = !upcoming.length && !past.length;
    filters = <CalendarFilterBar filters={current} months={cal.months} categories={cal.categories} />;
  } else {
    const events = await getAllEvents();
    const today = new Date().toISOString().split('T')[0];
    upcoming = events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(legacyCard);
    past = events.filter((e) => isEventPast(e)).map(legacyCard);
  }

  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      {/* Page Hero */}
      <div style={{ position: 'relative', height: '340px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src="/img/Event_1.jpeg" alt="" fill priority sizes="100vw" style={{ objectFit: 'cover', objectPosition: 'center 40%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,18,0.6), rgba(10,12,18,0.85))' }} />
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <p className="label">Calendario</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          {/* Force white text — this is on a dark photo overlay */}
          <h1 style={{ fontWeight: 300, color: '#ffffff' }}>
            I nostri <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>eventi</em>
          </h1>
        </div>
      </div>

      {filters}

      {empty && (
        <section className="section">
          <div className="section-inner" role="status" style={{ textAlign: 'center', color: 'var(--neutral-400)' }}>
            <p>Nessun evento con questi filtri.</p>
            <Link href="/eventi" className="btn btn-outline" style={{ marginTop: '1rem' }}>
              Mostra tutti gli eventi
            </Link>
          </div>
        </section>
      )}

      {upcoming.length > 0 && <Section label="In programma" title="Prossimi" accent="eventi" cards={upcoming} past={false} />}
      {past.length > 0 && <Section label="Archivio" title="Edizioni" accent="passate" cards={past} past dark />}
    </div>
  );
}
