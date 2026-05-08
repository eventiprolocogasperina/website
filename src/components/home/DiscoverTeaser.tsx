import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export default function DiscoverTeaser() {
  return (
    <section className="section" style={{ background: 'var(--neutral-900)', overflow: 'hidden' }}>
      <div className="section-inner">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '4rem',
          alignItems: 'center',
        }}>
          {/* Text col */}
          <div>
            <p className="label">Il nostro territorio</p>
            <div className="divider-gold" />
            <h2>
              Scopri{' '}
              <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>Gasperina</em>
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--neutral-400)', lineHeight: 1.8, margin: '1.25rem 0' }}>
              Arroccata sulle colline della Calabria centrale, a pochi chilometri dal Mar Ionio,
              Gasperina è un borgo di antiche tradizioni e paesaggi mozzafiato.
              Dal centro storico con le sue vie suggestive, alla vista panoramica sul mare,
              ogni angolo racconta secoli di storia.
            </p>
            <p style={{ fontSize: '1rem', color: 'var(--neutral-400)', lineHeight: 1.8, marginBottom: '2rem' }}>
              La Pro Loco Gasperina promuove e tutela questo patrimonio unico,
              organizzando eventi, percorsi turistici e attività culturali per residenti e visitatori.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              {['Tradizioni popolari e artigianato locale', 'Gastronomia tipica calabrese', 'Sentieri naturalistici e panorami sul Jonio', 'Storia e architettura del borgo medievale'].map(item => (
                <div key={item} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold-500)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.9rem', color: 'var(--neutral-300)' }}>{item}</span>
                </div>
              ))}
            </div>
            <Link href="/scopri-gasperina" className="btn btn-primary" id="teaser-cta-scopri">
              Esplora il territorio <ArrowRight size={16} />
            </Link>
          </div>

          {/* Image grid col */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', position: 'relative' }}>
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '280px', gridRow: 'span 2' }}>
              <Image src="/img/IMG1.jpg" alt="Centro storico di Gasperina" fill style={{ objectFit: 'cover' }} />
            </div>
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '130px', position: 'relative' }}>
              <Image src="/img/IMG_2.jpg" alt="Gasperina vista dall'alto" fill style={{ objectFit: 'cover' }} />
            </div>
            <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', height: '130px', position: 'relative' }}>
              <Image src="/img/IMG_3.jpg" alt="Gasperina di notte" fill style={{ objectFit: 'cover' }} />
            </div>
            {/* Decorative label */}
            <div style={{
              position: 'absolute',
              bottom: '-1rem',
              left: '-1rem',
              background: 'var(--blue-700)',
              color: 'var(--white)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem',
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontStyle: 'italic',
              boxShadow: '0 8px 30px rgba(27,75,170,0.4)',
            }}>
              450 m s.l.m.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
