'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
  tier: string;
}

// Fallback placeholder sponsors when DB is empty or loading
const FALLBACK_SPONSORS: Sponsor[] = [
  { id: '1', name: 'Comune di Gasperina', logo_url: '', tier: 'gold' },
  { id: '2', name: 'Regione Calabria', logo_url: '', tier: 'silver' },
  { id: '3', name: 'Cantine Statti', logo_url: '', tier: 'bronze' },
  { id: '4', name: 'Oleificio Vono', logo_url: '', tier: 'partner' },
  { id: '5', name: 'Pro Loco UNPLI', logo_url: '', tier: 'partner' },
  { id: '6', name: 'Panificio Tradizionale', logo_url: '', tier: 'bronze' },
];

const tierIcons: Record<string, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
  partner: '🤝',
};

interface SponsorsMarqueeProps {
  /** If provided, use these sponsors instead of fetching from API (useful for SSR) */
  initialSponsors?: Sponsor[];
}

export default function SponsorsMarquee({ initialSponsors }: SponsorsMarqueeProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors || []);
  const [loaded, setLoaded] = useState(!!initialSponsors);

  useEffect(() => {
    if (initialSponsors) return;
    fetch('/api/admin/sponsors')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data.length > 0) {
          setSponsors(d.data.filter((s: any) => s.active));
        } else {
          setSponsors(FALLBACK_SPONSORS);
        }
      })
      .catch(() => setSponsors(FALLBACK_SPONSORS))
      .finally(() => setLoaded(true));
  }, [initialSponsors]);

  const displayList = sponsors.length > 0 ? sponsors : FALLBACK_SPONSORS;
  // Triplicate to ensure seamless loop
  const marqueeItems = [...displayList, ...displayList, ...displayList];

  return (
    <div style={{
      width: '100%',
      overflow: 'hidden',
      padding: '3rem 0',
      background: 'transparent',
      position: 'relative',
    }}>
      {/* Soft gradient masks for the edges */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '100px',
        background: 'linear-gradient(to right, var(--background, #F9F3E4) 0%, transparent 100%)',
        zIndex: 2, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '100px',
        background: 'linear-gradient(to left, var(--background, #F9F3E4) 0%, transparent 100%)',
        zIndex: 2, pointerEvents: 'none',
      }} />

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2rem', fontWeight: 600 }}>
          Realizzato con il supporto di
        </p>
      </div>

      <motion.div
        animate={{ x: [0, -1920] }}
        transition={{ repeat: Infinity, ease: 'linear', duration: 30 }}
        style={{
          display: 'flex',
          gap: '3rem',
          width: 'max-content',
          alignItems: 'center',
          paddingLeft: '3rem',
        }}
      >
        {marqueeItems.map((sponsor, idx) => (
          <div
            key={`${sponsor.id}-${idx}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              opacity: 0.6,
              filter: 'grayscale(100%)',
              transition: 'all 0.3s ease',
              cursor: sponsor.website_url ? 'pointer' : 'default',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.filter = 'grayscale(0%)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.filter = 'grayscale(100%)'; }}
            onClick={() => sponsor.website_url && window.open(sponsor.website_url, '_blank')}
          >
            {sponsor.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sponsor.logo_url}
                alt={sponsor.name}
                style={{ height: '40px', width: 'auto', maxWidth: '120px', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: '1.5rem' }}>{tierIcons[sponsor.tier] || '🤝'}</span>
            )}
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#283983',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-display)'
            }}>
              {sponsor.name}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
