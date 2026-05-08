import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Clock, ArrowRight, Filter } from 'lucide-react';
import { events } from '@/lib/data/events';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Eventi',
  description: 'Scopri tutti gli eventi organizzati dalla Pro Loco Gasperina APS: feste patronali, sagre, concerti, escursioni e molto altro.',
};

const categoryColors: Record<string, string> = {
  cultura: 'badge-blue',
  musica: 'badge-gold',
  gastronomia: 'badge-green',
  sport: 'badge-blue',
  comunità: 'badge-gold',
};

export default function EventiPage() {
  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      {/* Page Hero */}
      <div style={{
        position: 'relative',
        height: '340px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Image src="/img/Event_1.jpeg" alt="Eventi" fill style={{ objectFit: 'cover', objectPosition: 'center 40%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,18,0.6), rgba(10,12,18,0.85))' }} />
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <p className="label">Calendario</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          <h1 style={{ fontWeight: 300 }}>
            I nostri <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>eventi</em>
          </h1>
        </div>
      </div>

      {/* Events list */}
      <section className="section">
        <div className="section-inner">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}>
            {events.map(event => {
              const dateObj = new Date(event.date);
              const day = dateObj.toLocaleDateString('it-IT', { day: '2-digit' });
              const month = dateObj.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();
              const fullDate = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
              const pct = Math.round((event.registeredCount / event.maxParticipants) * 100);

              return (
                <Link key={event.id} href={`/eventi/${event.slug}`} style={{ textDecoration: 'none' }}>
                  <article className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ position: 'relative', height: '210px', overflow: 'hidden' }}>
                      <Image src={event.image} alt={event.title} fill style={{ objectFit: 'cover', transition: 'transform 0.5s ease' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,18,0.6) 0%, transparent 50%)' }} />
                      <div style={{
                        position: 'absolute', top: '1rem', left: '1rem',
                        background: 'var(--gold-500)', color: 'var(--neutral-950)',
                        borderRadius: 'var(--radius-md)', padding: '0.4rem 0.75rem', textAlign: 'center',
                      }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>{day}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.6rem', fontWeight: 700 }}>{month}</div>
                      </div>
                      <span className={`badge ${categoryColors[event.category]}`} style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                        {event.category}
                      </span>
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--color-heading)', marginBottom: '0.6rem' }}>{event.title}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', lineHeight: 1.6, marginBottom: '0.9rem' }}>{event.description}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                        {[
                          { icon: Calendar, text: fullDate },
                          { icon: Clock, text: event.time },
                          { icon: MapPin, text: event.location },
                        ].map(({ icon: Icon, text }) => (
                          <div key={text} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem', color: 'var(--neutral-400)' }}>
                            <Icon size={12} style={{ color: 'var(--gold-500)', flexShrink: 0 }} />
                            <span style={{ textTransform: 'capitalize' }}>{text}</span>
                          </div>
                        ))}
                      </div>
                      {/* Capacity bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--neutral-400)', marginBottom: '0.3rem' }}>
                          <span>{event.registeredCount} iscritti</span>
                          <span>{event.maxParticipants} max</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--neutral-700)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: pct > 80 ? 'var(--gold-500)' : 'var(--blue-700)',
                            borderRadius: '2px',
                            transition: 'width 0.5s ease',
                          }} />
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
    </div>
  );
}
