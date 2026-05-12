'use client';

import { motion } from 'framer-motion';
import { Calendar, MapPin, Clock, Users, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import BookingForm from '@/components/events/BookingForm';
import type { Event } from '@/lib/data/events';

interface EventDetailContentProps {
  event: Event;
  isPast: boolean;
  showBooking: boolean;
  fullDate: string;
  pct: number;
}

export default function EventDetailContent({ event, isPast, showBooking, fullDate, pct }: EventDetailContentProps) {
  const cfg = event.config || {};
  const accentColor = cfg.accentColor || 'var(--gold-500)';
  const extraSections: Array<{ title: string; content: string }> = cfg.extraSections || [];
  const hideCapacity = cfg.hideCapacity ?? false;
  const tagline = cfg.tagline || '';

  // Only show the capacity/users info if the event is bookable
  const infoPills = [
    { icon: Calendar, text: fullDate },
    ...(!event.dateLabel && event.time !== 'TBD' ? [{ icon: Clock, text: `Ore ${event.time}` }] : []),
    { icon: MapPin, text: event.location },
    ...(event.bookable ? [{ 
      icon: Users, 
      text: isPast ? `${event.registeredCount} partecipanti` : `${event.maxParticipants - event.registeredCount} posti disponibili` 
    }] : []),
  ];

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      {/* Hero image */}
      <div className="event-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <Image src={event.image} alt={event.title} fill style={{ objectFit: 'cover', objectPosition: 'center 40%' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,18,0.2) 0%, rgba(10,12,18,0.92) 100%)' }} />
        <div className="event-hero-text" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '900px' }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Link href="/eventi" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.75rem', transition: 'color 0.2s' }}>
              <ArrowLeft size={14} /> Torna agli eventi
            </Link>
          </motion.div>
          <br />
          <motion.span 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.1, duration: 0.4 }}
            className={`badge ${event.category === 'musica' ? 'badge-gold' : event.category === 'gastronomia' ? 'badge-green' : 'badge-blue'}`} 
            style={{ marginBottom: '0.6rem', display: 'inline-flex' }}
          >
            {event.category}
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2, duration: 0.6 }}
            style={{ fontWeight: 400, color: '#ffffff', marginBottom: '0.4rem', lineHeight: 1.15 }}
          >
            {event.title}
          </motion.h1>
          {tagline && (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              transition={{ delay: 0.4, duration: 0.6 }}
              style={{ fontSize: '1rem', color: accentColor, marginBottom: '0.4rem', fontStyle: 'italic' }}
            >
              {tagline}
            </motion.p>
          )}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.5 }}
          >
            {event.price === 0 ? (
              <span style={{ fontSize: '0.85rem', color: '#4ade80' }}>Evento Gratuito</span>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--gold-400)' }}>€{event.price} a persona</span>
            )}
          </motion.div>
        </div>
      </div>

      <div className="section">
        <div className="section-inner">
          <div className="event-detail-grid">

            {/* Left: details */}
            <motion.div {...fadeIn}>
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
                    <Icon size={14} style={{ color: accentColor, flexShrink: 0 }} /> {text}
                  </div>
                ))}
              </div>

              {/* Capacity bar - Only show if bookable AND not hidden by config */}
              {event.bookable && !hideCapacity && (
                <motion.div 
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  style={{ marginBottom: '2.5rem', transformOrigin: 'left' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--neutral-400)', marginBottom: '0.4rem' }}>
                    <span>Percentuale occupazione</span><span>{pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--neutral-700)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? accentColor : 'var(--blue-700)', borderRadius: '3px' }} />
                  </div>
                </motion.div>
              )}

              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: 50 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                style={{ height: '2px', background: accentColor, marginBottom: '1.5rem' }} 
              />
              
              <h2 style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '1rem' }}>Descrizione</h2>
              {event.fullDescription.split('\n').filter(Boolean).map((para, i) => (
                <p key={i} style={{ color: 'var(--neutral-300)', lineHeight: 1.8, marginBottom: '0.9rem', fontSize: '0.95rem' }}>{para.trim()}</p>
              ))}

              {/* Extra sections from RCM config */}
              {extraSections.map((sec, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--neutral-800)' }}
                >
                  <div style={{ width: '30px', height: '2px', background: accentColor, marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--white)', marginBottom: '0.75rem' }}>{sec.title}</h3>
                  {sec.content.split('\n').filter(Boolean).map((line, j) => (
                    <p key={j} style={{ color: 'var(--neutral-400)', lineHeight: 1.8, marginBottom: '0.5rem', fontSize: '0.9rem' }}>{line.trim()}</p>
                  ))}
                </motion.div>
              ))}
            </motion.div>

            {/* Right: sidebar card */}
            <motion.div 
              className="event-sidebar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
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
                  <Link href="/eventi" className="btn btn-primary" style={{ marginTop: '1.25rem', display: 'inline-flex' }}>Vedi i prossimi</Link>
                </div>
              ) : !event.bookable ? (
                <div style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', padding: '2.5rem 2rem', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✨</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '0.75rem', color: 'var(--white)' }}>Ingresso Libero</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.7 }}>
                    Per questo evento non è necessaria la prenotazione. Ti aspettiamo direttamente sul posto!
                  </p>
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--neutral-700)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aggiungi al calendario</p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Google</button>
                      <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Apple</button>
                    </div>
                  </div>
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
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
