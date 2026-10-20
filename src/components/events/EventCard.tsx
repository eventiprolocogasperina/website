import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Clock } from 'lucide-react';
import FormattedText from '@/components/ui/FormattedText';
import type { EventCardData } from '@/lib/public/calendar';
import type { Event } from '@/lib/data/events';

// Card di un evento nel calendario /eventi (estratta da app/eventi/page.tsx, stesso aspetto di prima).

export const categoryColors: Record<string, string> = {
  cultura: 'badge-blue',
  musica: 'badge-gold',
  gastronomia: 'badge-green',
  sport: 'badge-blue',
  comunità: 'badge-gold',
};

/** Evento delle tabelle di oggi → dati della card (scheda /eventi/<slug>). */
export function legacyCard(e: Event): EventCardData {
  return {
    id: e.id,
    slug: e.slug,
    href: `/eventi/${e.slug}`,
    title: e.title,
    date: e.date,
    dateLabel: e.dateLabel,
    time: e.time,
    location: e.location,
    category: e.category,
    description: e.description,
    image: e.image,
    featured: e.featured,
  };
}

export default function EventCard({ event, isPast }: { event: EventCardData; isPast: boolean }) {
  let displayDay = '';
  let displayMonth = '';
  let displayFull = '';
  if (event.dateLabel) {
    displayFull = event.dateLabel;
    displayMonth = event.dateLabel;
  } else {
    const dateObj = new Date(event.date + 'T12:00:00');
    displayDay = dateObj.toLocaleDateString('it-IT', { day: '2-digit' });
    displayMonth = dateObj.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();
    displayFull = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  return (
    <Link href={event.href} style={{ textDecoration: 'none' }}>
      <article className="card" style={{ overflow: 'hidden', opacity: isPast ? 0.8 : 1 }}>
        <div style={{ position: 'relative', height: '210px', overflow: 'hidden' }}>
          <Image
            src={event.image}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            style={{ objectFit: 'cover', transition: 'transform 0.5s ease', filter: isPast ? 'grayscale(30%)' : 'none' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,18,0.6) 0%, transparent 50%)' }} />
          {/* Date badge */}
          <div
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              background: isPast ? 'rgba(120,115,105,0.9)' : 'var(--gold-500)',
              color: isPast ? '#fff' : 'var(--neutral-950)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem 0.75rem',
              textAlign: 'center',
              backdropFilter: 'blur(4px)',
            }}
          >
            {event.dateLabel ? (
              // Only month abbreviation, no year, no day
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.08em' }}>{event.dateLabel.split(' ')[0].slice(0, 3).toUpperCase()}</div>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>{displayDay}</div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', fontWeight: 700 }}>{displayMonth}</div>
              </>
            )}
          </div>
          {event.category && (
            <span className={`badge ${categoryColors[event.category]}`} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
              {event.category}
            </span>
          )}
          {isPast && (
            <span
              style={{
                position: 'absolute',
                bottom: '0.75rem',
                right: '0.75rem',
                background: 'rgba(0,0,0,0.55)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '0.25rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                backdropFilter: 'blur(4px)',
              }}
            >
              Concluso
            </span>
          )}
        </div>
        <div style={{ padding: '1.25rem' }}>
          <FormattedText as="h3" style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--color-heading)', marginBottom: '0.6rem' }} text={event.title} />
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', lineHeight: 1.6, marginBottom: '0.9rem' }}>{event.description.replace(/\*\*?/g, '')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {[
              { icon: Calendar, text: displayFull || event.dateLabel || '' },
              !event.dateLabel && event.time !== 'TBD' ? { icon: Clock, text: `Ore ${event.time}` } : null,
              { icon: MapPin, text: event.location },
            ]
              .filter((x): x is { icon: typeof Calendar; text: string } => x !== null)
              .map(({ icon: Icon, text }) => (
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
}
