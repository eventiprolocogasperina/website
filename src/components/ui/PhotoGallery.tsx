'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, ZoomIn, X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface PhotoGalleryProps {
  photos: { src: string; alt?: string }[];
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (i: number) => {
    setLightboxIndex(i);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    document.body.style.overflow = '';
  }, []);

  const prevPhoto = useCallback(() => {
    setLightboxIndex(prev => prev !== null ? (prev - 1 + photos.length) % photos.length : null);
  }, [photos.length]);

  const nextPhoto = useCallback(() => {
    setLightboxIndex(prev => prev !== null ? (prev + 1) % photos.length : null);
  }, [photos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'ArrowRight') nextPhoto();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, closeLightbox, prevPhoto, nextPhoto]);

  if (!photos || photos.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--neutral-800)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'rgba(192,132,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ImageIcon size={15} style={{ color: '#c084fc' }} />
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--color-heading)' }}>Galleria Fotografica</h3>
      </div>

      {/* Scrollable thumbnail strip */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        overflowX: 'auto',
        paddingBottom: '0.75rem',
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
      }}>
        {photos.map((photo, i) => (
          <motion.div
            key={i}
            onClick={() => openLightbox(i)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: '0 0 auto',
              width: '220px',
              height: '165px',
              scrollSnapAlign: 'start',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              border: '1px solid var(--neutral-800)',
            }}
          >
            <img
              src={photo.src}
              alt={photo.alt || `Foto ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Zoom hint overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.25s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.35)';
                (e.currentTarget.querySelector('svg') as SVGElement | null)?.setAttribute('style', 'opacity:1');
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)';
                (e.currentTarget.querySelector('svg') as SVGElement | null)?.setAttribute('style', 'opacity:0');
              }}
            >
              <ZoomIn size={28} style={{ color: 'white', opacity: 0, transition: 'opacity 0.25s' }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Photo Lightbox ── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeLightbox}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(5,7,12,0.96)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '50%', width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', cursor: 'pointer', zIndex: 1,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              <X size={20} />
            </button>

            {/* Prev */}
            {photos.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); prevPhoto(); }}
                style={{
                  position: 'absolute', left: '1.25rem',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%', width: 50, height: 50,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
            >
              <img
                src={photos[lightboxIndex].src}
                alt={photos[lightboxIndex].alt || `Foto ${lightboxIndex + 1}`}
                style={{
                  maxWidth: '90vw', maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
                  display: 'block',
                }}
              />
              {photos[lightboxIndex].alt && (
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
                  {photos[lightboxIndex].alt}
                </p>
              )}
            </motion.div>

            {/* Next */}
            {photos.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); nextPhoto(); }}
                style={{
                  position: 'absolute', right: '1.25rem',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%', width: 50, height: 50,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Counter */}
            {photos.length > 1 && (
              <div style={{
                position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
                fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)',
                background: 'rgba(0,0,0,0.4)', padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-full)',
              }}>
                {lightboxIndex + 1} / {photos.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
