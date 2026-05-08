import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, MapPin, Clock, Users, ArrowLeft, ExternalLink } from 'lucide-react';
import { events, getEventBySlug } from '@/lib/data/events';
import BookingForm from '@/components/events/BookingForm';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return events.map(e => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) return { title: 'Evento non trovato' };
  return {
    title: event.title,
    description: event.description,
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();

  const dateObj = new Date(event.date);
  const fullDate = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const pct = Math.round((event.registeredCount / event.maxParticipants) * 100);

  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      {/* Hero image */}
      <div style={{ position: 'relative', height: '480px', overflow: 'hidden' }}>
        <Image src={event.image} alt={event.title} fill style={{ objectFit: 'cover', objectPosition: 'center 40%' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,18,0.3) 0%, rgba(10,12,18,0.9) 100%)' }} />
        <div style={{ position: 'absolute', bottom: '3rem', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '900px', padding: '0 1.5rem' }}>
          <Link href="/eventi" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '1rem', transition: 'color 0.2s' }}>
            <ArrowLeft size={14} /> Torna agli eventi
          </Link>
          <span className={`badge ${event.category === 'musica' ? 'badge-gold' : event.category === 'gastronomia' ? 'badge-green' : 'badge-blue'}`} style={{ marginBottom: '0.75rem', display: 'inline-flex' }}>
            {event.category}
          </span>
          <h1 style={{ fontWeight: 400, color: 'var(--color-heading)', marginBottom: '0.5rem' }}>{event.title}</h1>
          {event.price === 0 ? (
            <span style={{ fontSize: '0.85rem', color: '#4ade80' }}>Evento Gratuito</span>
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--gold-400)' }}>€{event.price} a persona</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="section">
        <div className="section-inner" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '3rem', alignItems: 'start' }}>

          {/* Left: details */}
          <div>
            {/* Info pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
              {[
                { icon: Calendar, text: fullDate },
                { icon: Clock, text: `Ore ${event.time}` },
                { icon: MapPin, text: event.location },
                { icon: Users, text: `${event.registeredCount} / ${event.maxParticipants} partecipanti` },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
                  borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem',
                  fontSize: '0.85rem', color: 'var(--neutral-200)',
                  textTransform: 'capitalize',
                }}>
                  <Icon size={14} style={{ color: 'var(--gold-500)' }} /> {text}
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

          {/* Right: booking form */}
          <div style={{ position: 'sticky', top: '6rem' }}>
            <div style={{
              background: 'var(--neutral-800)',
              border: '1px solid var(--neutral-700)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
            }}>
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
          </div>
        </div>
      </div>
    </div>
  );
}
