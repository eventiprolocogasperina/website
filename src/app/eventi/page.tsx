import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { events, isEventPast } from '@/lib/data/events';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Eventi',
  description: 'Scopri tutti gli eventi organizzati dalla Pro Loco Gasperina APS: sagre, concerti, esperienze enogastronomiche e molto altro.',
};

const categoryColors: Record<string, string> = {
  cultura: 'badge-blue',
  musica: 'badge-gold',
  gastronomia: 'badge-green',
  sport: 'badge-blue',
  comunità: 'badge-gold',
};

export default function EventiPage() {
  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date >= today);
  const past = events.filter(e => e.date < today);

  const EventCard = ({ event }: { event: typeof events[0] }) => {
    const isPast = isEventPast(event);
    // Use dateLabel override if present, otherwise format the date
    let displayDay = '';
    let displayMonth = '';
    let displayFull = '';

    if (event.dateLabel) {
      displayFull = event.dateLabel;
      const parts = event.dateLabel.split(' ');
      displayDay = '';
      displayMonth = event.dateLabel;
    } else {
      const dateObj = new Date(event.date + 'T12:00:00');
      displayDay = dateObj.toLocaleDateString('it-IT', { day: '2-digit' });
      displayMonth = dateObj.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();
      displayFull = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    return (
      <Link href={`/eventi/${event.slug}`} style={{ textDecoration: 'none' }}>
        <article className="card" style={{ overflow: 'hidden', opacity: isPast ? 0.8 : 1 }}>
          <div style={{ position: 'relative', height: '210px', overflow: 'hidden' }}>
            <Image src={event.image} alt={event.title} fill style={{ objectFit: 'cover', transition: 'transform 0.5s ease', filter: isPast ? 'grayscale(30%)' : 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,18,0.6) 0%, transparent 50%)' }} />
            {/* Date badge */}
            <div style={{
              position: 'absolute', top: '1rem', left: '1rem',
              background: isPast ? 'rgba(120,115,105,0.9)' : 'var(--gold-500)',
              color: isPast ? '#fff' : 'var(--neutral-950)',
              borderRadius: 'var(--radius-md)', padding: '0.4rem 0.75rem', textAlign: 'center',
              backdropFilter: 'blur(4px)',
            }}>
              {event.dateLabel ? (
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{event.dateLabel}</div>
              ) : (
                <>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>{displayDay}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', fontWeight: 700 }}>{displayMonth}</div>
                </>
              )}
            </div>
            <span className={`badge ${categoryColors[event.category]}`} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
              {event.category}
            </span>
            {isPast && (
              <span style={{
                position: 'absolute', bottom: '0.75rem', right: '0.75rem',
                background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.7)',
                fontSize: '0.65rem', fontFamily: 'var(--font-body)', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-full)',
                backdropFilter: 'blur(4px)',
              }}>Concluso</span>
            )}
          </div>
          <div style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--color-heading)', marginBottom: '0.6rem' }}>{event.title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', lineHeight: 1.6, marginBottom: '0.9rem' }}>{event.description}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {([
                { icon: Calendar, text: displayFull || event.dateLabel || '' },
                (!event.dateLabel && event.time !== 'TBD') ? { icon: Clock, text: `Ore ${event.time}` } : null,
                { icon: MapPin, text: event.location },
              ].filter((x): x is { icon: typeof Calendar; text: string } => x !== null)).map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--neutral-400)' }}>
                  <Icon size={12} style={{ color: 'var(--gold-500)', flexShrink: 0 }} />
                  <span style={{ textTransform: 'capitalize' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </Link>
    );
  };

  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      {/* Page Hero */}
      <div style={{ position: 'relative', height: '340px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src="/img/Event_1.jpeg" alt="Eventi" fill style={{ objectFit: 'cover', objectPosition: 'center 40%' }} />
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

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <section className="section">
          <div className="section-inner">
            <div style={{ marginBottom: '2rem' }}>
              <p className="label">In programma</p>
              <h2 style={{ marginTop: '0.5rem' }}>
                Prossimi <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>eventi</em>
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {upcoming.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          </div>
        </section>
      )}

      {/* Past events */}
      {past.length > 0 && (
        <section className="section" style={{ background: 'var(--neutral-900)' }}>
          <div className="section-inner">
            <div style={{ marginBottom: '2rem' }}>
              <p className="label">Archivio</p>
              <h2 style={{ marginTop: '0.5rem' }}>
                Edizioni <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>passate</em>
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {past.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
