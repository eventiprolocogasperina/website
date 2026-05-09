import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, MapPin, Clock, Users, ArrowLeft } from 'lucide-react';
import { getAllEvents, getEventBySlug, isEventPast } from '@/lib/data/events';
import BookingForm from '@/components/events/BookingForm';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  const events = await getAllEvents();
  return events.map(e => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: 'Evento non trovato' };
  return { title: event.title, description: event.description };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  
  if (!event) notFound();

  const isPast = isEventPast(event);
  const showBooking = event.bookable && !isPast;

  const dateObj = new Date(event.date + 'T12:00:00');
  const fullDate = event.dateLabel
    ? event.dateLabel
    : dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const pct = Math.round((event.registeredCount / event.maxParticipants) * 100);

  const infoPills = [
    { icon: Calendar, text: fullDate },
    ...(!event.dateLabel && event.time !== 'TBD' ? [{ icon: Clock, text: `Ore ${event.time}` }] : []),
    { icon: MapPin, text: event.location },
    { icon: Users, text: isPast ? `${event.registeredCount} partecipanti` : `${event.maxParticipants - event.registeredCount} posti disponibili` },
  ];

  return (
    <>
      <style>{`
        .event-detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 3rem;
          align-items: start;
        }
        .event-sidebar {
          position: sticky;
          top: 6rem;
        }
        .event-hero {
          height: 480px;
        }
        .event-hero-text {
          bottom: 3rem;
          padding: 0 1.5rem;
        }
        .event-hero h1 {
          font-size: clamp(1.6rem, 5vw, 2.8rem);
        }
        @media (max-width: 768px) {
          .event-detail-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .event-sidebar {
            position: static;
            order: -1;
          }
          .event-hero {
            height: 340px;
          }
          .event-hero-text {
            bottom: 1.5rem;
            padding: 0 1rem;
          }
          .event-info-pills {
            gap: 0.5rem;
          }
          .event-info-pill {
            font-size: 0.78rem;
            padding: 0.4rem 0.75rem;
            max-width: 100%;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
        }
      `}</style>

      <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
        {/* Hero image */}
        <div className="event-hero" style={{ position: 'relative', overflow: 'hidden' }}>
          <Image src={event.image} alt={event.title} fill style={{ objectFit: 'cover', objectPosition: 'center 40%' }} priority />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,18,0.2) 0%, rgba(10,12,18,0.92) 100%)' }} />
          <div className="event-hero-text" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '900px' }}>
            <Link href="/eventi" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.75rem', transition: 'color 0.2s' }}>
              <ArrowLeft size={14} /> Torna agli eventi
            </Link>
            <br />
            <span className={`badge ${event.category === 'musica' ? 'badge-gold' : event.category === 'gastronomia' ? 'badge-green' : 'badge-blue'}`} style={{ marginBottom: '0.6rem', display: 'inline-flex' }}>
              {event.category}
            </span>
            <h1 style={{ fontWeight: 400, color: '#ffffff', marginBottom: '0.4rem', lineHeight: 1.15 }}>{event.title}</h1>
            {event.price === 0 ? (
              <span style={{ fontSize: '0.85rem', color: '#4ade80' }}>Evento Gratuito</span>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--gold-400)' }}>€{event.price} a persona</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="section">
          <div className="section-inner">
            <div className="event-detail-grid">

              {/* Left: details */}
              <div>
                {/* Info pills */}
                <div className="event-info-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                  {infoPills.map(({ icon: Icon, text }) => (
                    <div key={text} className="event-info-pill" style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
                      borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem',
                      fontSize: '0.85rem', color: 'var(--neutral-200)',
                      textTransform: 'capitalize',
                    }}>
                      <Icon size={14} style={{ color: 'var(--gold-500)', flexShrink: 0 }} /> {text}
                    </div>
                  ))}
                </div>

                {/* Capacity bar */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--neutral-400)', marginBottom: '0.4rem' }}>
                    <span>Posti occupati</span><span>{pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--neutral-700)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'var(--gold-500)' : 'var(--blue-700)', borderRadius: '3px' }} />
                  </div>
                </div>

                <div style={{ width: '50px', height: '2px', background: 'var(--gold-500)', marginBottom: '1.5rem' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '1rem' }}>Descrizione</h2>
                {event.fullDescription.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i} style={{ color: 'var(--neutral-300)', lineHeight: 1.8, marginBottom: '0.9rem', fontSize: '0.95rem' }}>{para.trim()}</p>
                ))}
              </div>

              {/* Right: sidebar card — moves above description on mobile via order:-1 */}
              <div className="event-sidebar">
                {showBooking ? (
                  <div style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem 1.5rem 0', borderBottom: '1px solid var(--neutral-700)' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 500, marginBottom: '0.25rem' }}>Prenota il tuo posto</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', paddingBottom: '1rem' }}>
                        Posti disponibili: {event.maxParticipants - event.registeredCount}
                      </p>
                    </div>
                    <div style={{ padding: '1.5rem' }}>
                      <BookingForm eventTitle={event.title} eventSlug={event.slug} />
                    </div>
                  </div>
                ) : isPast ? (
                  <div style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.5rem' }}>Evento concluso</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.6 }}>
                      Questo evento si è già svolto. Resta aggiornato sui nostri prossimi appuntamenti!
                    </p>
                    <a href="/eventi" className="btn btn-primary" style={{ marginTop: '1.25rem', display: 'inline-flex' }}>Vedi i prossimi</a>
                  </div>
                ) : (
                  <div style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📅</div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.5rem' }}>Dettagli in arrivo</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.6 }}>
                      Le iscrizioni per questo evento non sono ancora aperte. Seguici sui social per non perderti gli aggiornamenti!
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                      <a href="https://www.instagram.com/prolocogasperina_aps/" target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ fontSize: '0.82rem', padding: '0.55rem 1.2rem' }}>Instagram</a>
                      <a href="https://www.facebook.com/prolocogasperina/" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.55rem 1.2rem' }}>Facebook</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
