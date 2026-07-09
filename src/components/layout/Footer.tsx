'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Share2, Camera, Mail, Phone, MapPin, Heart } from 'lucide-react';



const footerLinks = {
  associazione: [
    { href: '/associazione', label: 'Chi Siamo' },
    { href: '/associazione#missione', label: 'Missione e Valori' },
    { href: '/trasparenza', label: 'Trasparenza' },
    { href: '/iscriviti', label: 'Diventa Socio' },
  ],
  territorio: [
    { href: '/scopri-gasperina', label: 'Scopri Gasperina' },
    { href: '/scopri-gasperina#storia', label: 'Storia e Cultura' },
    { href: '/scopri-gasperina#gastronomia', label: 'Gastronomia' },
    { href: '/scopri-gasperina#mappa', label: 'Mappa dei POI' },
  ],
  partecipa: [
    { href: '/eventi', label: 'Tutti gli Eventi' },
    { href: '/volontari', label: 'Diventa Volontario' },
    { href: '/sostienici', label: 'Sostienici' },
    { href: '/contatti', label: 'Contattaci' },
    { href: '/admin', label: 'Admin' },
  ],
};

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/assaggia-e-passeggia')) return null;
  return (
    <footer style={{ background: 'var(--neutral-900)', borderTop: '1px solid var(--neutral-800)', paddingTop: '4rem' }}>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Top grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '3rem', paddingBottom: '3rem', borderBottom: '1px solid var(--neutral-800)' }}>

          {/* Brand col */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Image src="/img/Logo_color_sm.png" alt="Pro Loco Gasperina" width={48} height={48} style={{ objectFit: 'contain' }} />
              <div>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'var(--gold-500)', textTransform: 'uppercase' }}>Pro Loco</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-heading)' }}>Gasperina APS</div>
              </div>
            </Link>
            <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              Associazione di Promozione Sociale per la valorizzazione della cultura, delle tradizioni e del turismo di Gasperina, Calabria.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                { icon: Camera, href: 'https://www.instagram.com/prolocogasperina_aps/', label: 'Instagram' },
                { icon: Share2, href: 'https://www.facebook.com/prolocogasperina/', label: 'Facebook' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  style={{
                    width: 38, height: 38,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--neutral-800)',
                    border: '1px solid var(--neutral-700)',
                    borderRadius: 'var(--radius-full)',
                    color: 'var(--neutral-400)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--white)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue-700)';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(27,75,170,0.2)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--neutral-400)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--neutral-700)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--neutral-800)';
                  }}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Link cols */}
          {Object.entries(footerLinks).map(([key, links]) => (
            <div key={key}>
              <h4 style={{
                fontFamily: 'var(--font-label)',
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--gold-500)',
                marginBottom: '1.1rem',
              }}>
                {key === 'associazione' ? 'Associazione' : key === 'territorio' ? 'Territorio' : 'Partecipa'}
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.target as HTMLElement).style.color = 'var(--white)'}
                      onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--neutral-400)'}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contatti */}
          <div>
            <h4 style={{ fontFamily: 'var(--font-label)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-500)', marginBottom: '1.1rem' }}>
              Contatti
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { icon: MapPin, text: 'Via Raffaele Milano SNC, Gasperina (CZ)' },
                { icon: Mail, text: 'prolocogasperina@gmail.com' },
                { icon: Phone, text: '+39 327 978 3232' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <Icon size={15} style={{ color: 'var(--gold-500)', marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: '1.25rem 0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: 'var(--neutral-600)',
        }}>
          <span>© {new Date().getFullYear()} Pro Loco Gasperina APS · C.F. 99330790793 · P.IVA 03923590792 · Tutti i diritti riservati</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            Fatto con <Heart size={12} style={{ color: 'var(--gold-500)' }} fill="currentColor" /> in Calabria
          </span>
        </div>
      </div>
    </footer>
  );
}
