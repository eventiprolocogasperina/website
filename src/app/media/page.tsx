'use client';

import { useState, useEffect } from 'react';
import { galleryItems, type GalleryItem } from '@/lib/data/gallery';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHero, V3Page } from '@/components/site/ui';

const categories = ['tutte', 'eventi', 'territorio', 'cultura', 'comunità'] as const;

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>(galleryItems);
  const [filter, setFilter] = useState<string>('tutte');
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Hydrate from DB on mount (falls back to static if API fails)
  useEffect(() => {
    fetch('/api/gallery')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setItems(data); })
      .catch(() => {/* keep static fallback */});
  }, []);

  const images = items.filter(item => item.category !== 'video');
  const videos = items.filter(item => item.category === 'video');

  const filtered = filter === 'tutte'
    ? images
    : images.filter(item => item.category === filter);

  const openLightbox = (idx: number) => { setLightbox(idx); document.body.style.overflow = 'hidden'; };
  const closeLightbox = () => { setLightbox(null); document.body.style.overflow = ''; };
  const prevImg = () => lightbox !== null && setLightbox((lightbox - 1 + filtered.length) % filtered.length);
  const nextImg = () => lightbox !== null && setLightbox((lightbox + 1) % filtered.length);

  const roundBtn = { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', cursor: 'pointer' } as const;

  return (
    <V3Page>
      <PageHero eyebrow="Immagini" title="La nostra" accent="galleria." lede="Momenti, eventi e scorci del territorio di Gasperina catturati in immagini." />

      <section className="panel p-cream">
        <div className="chips" role="group" aria-label="Filtra per categoria" style={{ marginBottom: 32 }}>
          {categories.map(cat => (
            <button key={cat} type="button" className={filter === cat ? 'chip on' : 'chip'} aria-pressed={filter === cat} onClick={() => setFilter(cat)} style={{ textTransform: 'capitalize', cursor: 'pointer' }}>
              {cat}
            </button>
          ))}
        </div>
        <div className="gallery">
          {filtered.map((item, idx) => (
            <button key={item.id} type="button" onClick={() => openLightbox(idx)} aria-label={`Ingrandisci: ${item.alt || item.category}`} style={{ display: 'block', width: '100%', padding: 0, border: 0, background: 'none', cursor: 'zoom-in' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.src} alt={item.alt} loading="lazy" />
            </button>
          ))}
        </div>
      </section>

      {videos.length > 0 && (
        <section className="panel p-white">
          <div className="panel-head">
            <div>
              <span className="eyebrow">In movimento</span>
              <h2 className="h2">I nostri video.</h2>
            </div>
          </div>
          <div className="grid g3">
            {videos.map(item => {
              const videoId = extractYoutubeId(item.src);
              if (!videoId) return null;
              return (
                <div key={item.id} className="vcard" style={{ padding: 0, overflow: 'hidden' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    title={item.alt || 'Video'}
                    width="100%"
                    style={{ aspectRatio: '16/9', display: 'block', border: 0 }}
                    allowFullScreen
                  />
                  <p style={{ padding: '16px 20px' }}>{item.alt}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel p-gold">
        <div className="split">
          <div>
            <span className="eyebrow">Hai scattato delle foto?</span>
            <h2 className="h2">Condividile con noi.</h2>
          </div>
          <p className="lede">Durante gli eventi puoi caricare le tue foto dalla pagina dell&apos;evento.</p>
        </div>
      </section>

      {lightbox !== null && filtered[lightbox] && (
        <div role="dialog" aria-modal="true" aria-label="Foto ingrandita" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,12,28,0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeLightbox}>
          <button type="button" aria-label="Chiudi" onClick={closeLightbox} style={{ ...roundBtn, position: 'absolute', top: 24, right: 24, width: 44, height: 44, zIndex: 201 }}>
            <X size={20} />
          </button>
          <button type="button" aria-label="Foto precedente" onClick={e => { e.stopPropagation(); prevImg(); }} style={{ ...roundBtn, position: 'absolute', left: 24, width: 48, height: 48 }}>
            <ChevronLeft size={22} />
          </button>
          <div style={{ maxWidth: '90vw', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={filtered[lightbox].src} alt={filtered[lightbox].alt} style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 18 }} />
            <p style={{ textAlign: 'center', marginTop: 12, fontSize: 14, color: 'rgba(251,244,230,.8)' }}>{filtered[lightbox].alt}</p>
          </div>
          <button type="button" aria-label="Foto successiva" onClick={e => { e.stopPropagation(); nextImg(); }} style={{ ...roundBtn, position: 'absolute', right: 24, width: 48, height: 48 }}>
            <ChevronRight size={22} />
          </button>
          <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', fontSize: 13, color: 'rgba(251,244,230,.8)' }}>
            {lightbox + 1} / {filtered.length}
          </div>
        </div>
      )}
    </V3Page>
  );
}
