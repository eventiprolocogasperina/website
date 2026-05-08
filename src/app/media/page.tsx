'use client';

import { useState } from 'react';
import Image from 'next/image';
import { galleryItems, type GalleryItem } from '@/lib/data/gallery';
import { X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';

const categories = ['tutte', 'eventi', 'territorio', 'cultura', 'comunità'] as const;

export default function GalleryPage() {
  const [filter, setFilter] = useState<string>('tutte');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = filter === 'tutte'
    ? galleryItems
    : galleryItems.filter(item => item.category === filter);

  const openLightbox = (idx: number) => { setLightbox(idx); document.body.style.overflow = 'hidden'; };
  const closeLightbox = () => { setLightbox(null); document.body.style.overflow = ''; };
  const prevImg = () => lightbox !== null && setLightbox((lightbox - 1 + filtered.length) % filtered.length);
  const nextImg = () => lightbox !== null && setLightbox((lightbox + 1) % filtered.length);

  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      {/* Header */}
      <section className="section" style={{ paddingBottom: '2rem' }}>
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <p className="label">Immagini</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          <h1 style={{ fontWeight: 300, marginBottom: '0.75rem', color: '#ffffff' }}>
            La nostra <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>galleria</em>
          </h1>
          <p style={{ color: 'var(--neutral-400)', maxWidth: '540px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
            Momenti, eventi e scorci del territorio di Gasperina catturati in immagini.
          </p>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: filter === cat ? '1.5px solid var(--blue-700)' : '1.5px solid var(--neutral-700)',
                  background: filter === cat ? 'rgba(27,75,170,0.2)' : 'transparent',
                  color: filter === cat ? 'var(--blue-500)' : 'var(--neutral-400)',
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Masonry grid */}
      <section style={{ padding: '0 1.5rem 5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          columns: 'auto 300px',
          columnGap: '1rem',
          gap: '1rem',
        }}>
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => openLightbox(idx)}
              style={{
                position: 'relative',
                breakInside: 'avoid',
                marginBottom: '1rem',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'block',
              }}
            >
              <Image
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                style={{ width: '100%', height: 'auto', display: 'block', transition: 'transform 0.4s ease' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(10,12,18,0.7) 0%, transparent 50%)',
                opacity: 0, transition: 'opacity 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
              >
                <ZoomIn size={32} style={{ color: 'white' }} />
              </div>
              <div style={{
                position: 'absolute', bottom: '0.75rem', left: '0.75rem',
              }}>
                <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{item.category}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(5,7,12,0.97)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={closeLightbox}
        >
          {/* Close */}
          <button onClick={closeLightbox} style={{
            position: 'absolute', top: '1.5rem', right: '1.5rem',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 'var(--radius-full)', width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--white)', cursor: 'pointer', zIndex: 201,
          }}>
            <X size={20} />
          </button>

          {/* Prev */}
          <button onClick={e => { e.stopPropagation(); prevImg(); }} style={{
            position: 'absolute', left: '1.5rem',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 'var(--radius-full)', width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--white)', cursor: 'pointer',
          }}>
            <ChevronLeft size={22} />
          </button>

          {/* Image */}
          <div style={{ maxWidth: '90vw', maxHeight: '85vh', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <Image
              src={filtered[lightbox].src}
              alt={filtered[lightbox].alt}
              width={filtered[lightbox].width}
              height={filtered[lightbox].height}
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 'var(--radius-lg)' }}
            />
            <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--neutral-400)' }}>
              {filtered[lightbox].alt}
            </p>
          </div>

          {/* Next */}
          <button onClick={e => { e.stopPropagation(); nextImg(); }} style={{
            position: 'absolute', right: '1.5rem',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 'var(--radius-full)', width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--white)', cursor: 'pointer',
          }}>
            <ChevronRight size={22} />
          </button>

          {/* Counter */}
          <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
            fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
            {lightbox + 1} / {filtered.length}
          </div>
        </div>
      )}
    </div>
  );
}
