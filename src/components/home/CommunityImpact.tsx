'use client';

import { useEffect, useRef, useState } from 'react';

interface StatItem { value: number; suffix: string; label: string; }
const stats: StatItem[] = [
  { value: 30, suffix: '+', label: 'Anni dalla fondazione' },
  { value: 7, suffix: '+', label: 'Eventi ogni anno' },
  { value: 10, suffix: 'k', label: 'Persone raggiunte' },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const duration = 1800;
        const step = 16;
        const increment = value / (duration / step);
        const timer = setInterval(() => {
          start += increment;
          if (start >= value) { setCount(value); clearInterval(timer); }
          else { setCount(Math.floor(start)); }
        }, step);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} style={{
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(2.5rem, 5vw, 4rem)',
      fontWeight: 400,
      color: 'var(--gold-400)',
      lineHeight: 1,
    }}>
      {count}{suffix}
    </span>
  );
}

export default function CommunityImpact() {
  return (
    <section className="section" style={{
      background: 'linear-gradient(135deg, var(--neutral-950) 0%, var(--neutral-900) 50%, var(--neutral-950) 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative circle */}
      <div style={{
        position: 'absolute',
        right: '-200px',
        top: '-200px',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        border: '1px solid rgba(27,75,170,0.2)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: '-150px',
        bottom: '-150px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        border: '1px solid rgba(232,169,26,0.1)',
        pointerEvents: 'none',
      }} />

      <div className="section-inner" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p className="label">Il nostro impatto</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto 0' }} />
          <h2 style={{ marginTop: '0' }}>
            Una comunità{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>viva</em>
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--neutral-400)', maxWidth: '540px', margin: '1rem auto 0', lineHeight: 1.7 }}>
            Ogni anno la Pro Loco Gasperina porta avanti la tradizione e la cultura locale
            con passione e dedizione per l'intera comunità.
          </p>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '2rem',
          marginBottom: '4rem',
        }}>
          {stats.map(stat => (
            <div key={stat.label} style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              background: 'var(--neutral-800)',
              border: '1px solid var(--neutral-700)',
              borderRadius: 'var(--radius-lg)',
              backdropFilter: 'blur(10px)',
            }}>
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.85rem',
                color: 'var(--neutral-400)',
                fontFamily: 'var(--font-body)',
              }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quote */}
        <blockquote style={{
          maxWidth: '700px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '2.5rem',
          background: 'rgba(232,169,26,0.06)',
          border: '1px solid rgba(232,169,26,0.18)',
          borderRadius: 'var(--radius-xl)',
        }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
            fontWeight: 400,
            fontStyle: 'italic',
            color: 'var(--color-heading)',
            lineHeight: 1.6,
            marginBottom: '1rem',
          }}>
            "Gasperina non è solo un luogo — è un sentimento, una radice,
            un legame che non si spezza con la distanza."
          </p>
          <cite style={{ fontSize: '0.85rem', color: 'var(--gold-500)', fontFamily: 'var(--font-body)', fontStyle: 'normal' }}>
            — Consiglio Direttivo, Pro Loco Gasperina APS
          </cite>
        </blockquote>
      </div>
    </section>
  );
}
