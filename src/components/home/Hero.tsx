'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Calendar, Map, Users } from 'lucide-react';

export default function Hero() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Logo shrinks as user scrolls: 110px → 0px over 300px scroll
  const logoSize = Math.max(0, 110 - scrollY * 0.37);
  const logoOpacity = Math.max(0, 1 - scrollY / 200);

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/img/IMG_2.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundAttachment: 'fixed',
          transform: 'scale(1.05)',
        }}
      />

      {/* Gradient overlays */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(10,12,18,0.55) 0%, rgba(10,12,18,0.4) 40%, rgba(10,12,18,0.85) 100%)',
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center top, rgba(27,75,170,0.15) 0%, transparent 60%)',
      }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        textAlign: 'center',
        padding: '2rem 1.5rem',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Logo — shrinks on scroll */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: logoSize > 10 ? '1.25rem' : '0',
          overflow: 'hidden',
          transition: 'margin-bottom 0.1s',
        }}>
          <img
            src="/img/Logo_color.png"
            alt="Pro Loco Gasperina"
            style={{
              width: logoSize,
              height: logoSize,
              objectFit: 'contain',
              opacity: logoOpacity,
              filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
              transition: 'width 0.05s linear, height 0.05s linear, opacity 0.05s linear',
              display: 'block',
            }}
          />
        </div>

        {/* Label */}
        <div className="label animate-fade-up" style={{ marginBottom: '1.5rem' }}>
          Gasperina · Calabria · dal 1995
        </div>

        {/* Title */}
        <h1 className="animate-fade-up delay-200" style={{
          fontWeight: 300,
          color: 'var(--white)',
          marginBottom: '1rem',
          textShadow: '0 2px 40px rgba(0,0,0,0.5)',
        }}>
          La nostra{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>terra</em>,<br />
          la nostra{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>storia</em>
        </h1>

        {/* Divider */}
        <div className="animate-fade-in delay-400" style={{
          width: '80px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, var(--gold-500), transparent)',
          margin: '1.5rem auto',
        }} />

        {/* Subtitle */}
        <p className="animate-fade-up delay-500" style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          color: 'rgba(255,255,255,0.8)',
          lineHeight: 1.7,
          marginBottom: '2.5rem',
          maxWidth: '640px',
          margin: '0 auto 2.5rem',
        }}>
          Pro Loco Gasperina APS valorizza la cultura, le tradizioni e il turismo
          del nostro splendido borgo calabrese. Unisciti a noi.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up delay-700" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/iscriviti" className="btn btn-gold" id="hero-cta-iscriviti">
            <Users size={16} /> Iscriviti
          </Link>
          <Link href="/eventi" className="btn btn-primary" id="hero-cta-eventi">
            <Calendar size={16} /> Prossimi Eventi
          </Link>
          <Link href="/scopri-gasperina" className="btn btn-outline" id="hero-cta-scopri">
            <Map size={16} /> Scopri Gasperina
          </Link>
        </div>

        {/* Stats strip */}
        <div className="animate-fade-up delay-1000" style={{
          display: 'flex',
          gap: '2rem',
          justifyContent: 'center',
          marginTop: '4rem',
          flexWrap: 'wrap',
        }}>
          {[
            { value: '30+', label: 'Anni di attività' },
            { value: '47', label: 'Soci attivi' },
            { value: '7+', label: 'Eventi ogni anno' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                fontWeight: 500,
                color: 'var(--gold-400)',
                lineHeight: 1,
              }}>{stat.value}</div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.3rem', fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="animate-float"
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'max-content',
          color: 'rgba(255,255,255,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        <span>Scorri</span>
        <ChevronDown size={18} />
      </div>
    </section>
  );
}
