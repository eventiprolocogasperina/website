'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, ChevronRight, Clock } from 'lucide-react';
import { getUpcomingEvents } from '@/lib/data/events';

const categoryColors: Record<string, string> = {
  cultura: 'badge-blue',
  musica: 'badge-gold',
  gastronomia: 'badge-green',
  sport: 'badge-blue',
  comunità: 'badge-gold',
};

export default function UpcomingEvents() {
  const events = getUpcomingEvents().filter(e => e.featured).slice(0, 3);

  return (
    <section className="section" style={{ background: 'var(--neutral-950)' }}>
      <div className="section-inner">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="label">Calendario</p>
            <div className="divider-gold" />
            <h2>Prossimi <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>eventi</em></h2>
          </div>
          <Link href="/eventi" className="btn btn-outline" style={{ gap: '0.4rem' }}>
            Tutti gli eventi <ChevronRight size={15} />
          </Link>
        </div>

        {/* Cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem',
        }}>
          {events.map((event) => {
            const dateObj = new Date(event.date);
            const day = dateObj.toLocaleDateString('it-IT', { day: '2-digit' });
            const month = dateObj.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();
            const yearFull = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            return (
              <Link key={event.id} href={`/eventi/${event.slug}`} style={{ textDecoration: 'none' }}>
                <article className="card" style={{ overflow: 'hidden' }}>
                  {/* Image */}
                  <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      style={{ objectFit: 'cover', transition: 'transform 0.5s ease' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                    />
                    {/* Date badge */}
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '1rem',
                      background: 'var(--gold-500)',
                      color: 'var(--neutral-950)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.4rem 0.75rem',
                      textAlign: 'center',
                      minWidth: '48px',
                    }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{day}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>{month}</div>
                    </div>
                    {/* Category */}
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                      <span className={`badge ${categoryColors[event.category]}`}>{event.category}</span>
                    </div>
                    {/* Free badge */}
                    {event.price === 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '1rem',
                        right: '1rem',
                        background: 'rgba(34,197,94,0.15)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        color: '#4ade80',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        fontFamily: 'var(--font-body)',
                      }}>Gratuito</div>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: '1.25rem 1.25rem 1.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--color-heading)', marginBottom: '0.75rem', lineHeight: 1.3 }}>
                      {event.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.6, marginBottom: '1rem' }}>
                      {event.description}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                        <Calendar size={13} style={{ color: 'var(--gold-500)' }} />
                        <span style={{ textTransform: 'capitalize' }}>{yearFull}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                        <Clock size={13} style={{ color: 'var(--gold-500)' }} />
                        <span>{event.time}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                        <MapPin size={13} style={{ color: 'var(--gold-500)' }} />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
