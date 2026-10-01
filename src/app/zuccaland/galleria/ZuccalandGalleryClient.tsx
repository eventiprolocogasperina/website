'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CldImage } from 'next-cloudinary';
import { Loader2, Camera, X } from 'lucide-react';
import Image from 'next/image';

type Photo = {
  id: number;
  cloudinary_public_id: string;
  frame_name: string | null;
  created_at: string;
};

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '420px', width: '100%',
          borderRadius: '1.25rem', overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
      >
        <CldImage
          src={photo.cloudinary_public_id}
          width={1080}
          height={1350}
          crop="fill"
          alt={`Foto #${photo.id}`}
          sizes="420px"
          style={{ display: 'block', width: '100%', height: 'auto' }}
          overlays={photo.frame_name ? [{
            publicId: photo.frame_name,
            flags: ['relative'],
            width: '1.0',
            height: '1.0',
          }] : []}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '0.75rem', right: '0.75rem',
            background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
            width: 36, height: 36, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <X size={18} color="white" />
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Galleria ─────────────────────────────────────────────────────────────────
export default function ZuccalandGalleryClient() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  useEffect(() => {
    fetch('/api/zuccaland/photos')
      .then(r => r.json())
      .then(data => setPhotos(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdf7f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '1.5rem 1rem 4rem',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/zuccaland/Logo.png" alt="Zuccaland" style={{ height: 52, objectFit: 'contain' }} />
      </div>

      <div style={{ maxWidth: '640px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
            color: '#431407', margin: '0 0 0.5rem',
          }}>
            🖼️ Galleria Zuccaland
          </h1>
          <p style={{ color: '#9a3412', fontSize: '0.9rem', margin: 0 }}>
            Le foto più belle della giornata magica
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loader2 size={32} color="#ea580c" className="animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div style={{
            background: 'white', borderRadius: '1.5rem', border: '1.5px solid #eaddd0',
            padding: '3rem 2rem', textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎃</div>
            <p style={{ color: '#7a4820', fontWeight: 600, fontSize: '1rem', margin: '0 0 0.5rem' }}>
              Nessuna foto ancora!
            </p>
            <p style={{ color: '#9a3412', fontSize: '0.88rem', margin: '0 0 1.5rem' }}>
              Sii il primo a condividere la tua foto di Zuccaland.
            </p>
            <a href="/zuccaland/photo" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'linear-gradient(135deg, #e07848, #c85a0e)',
              color: 'white', padding: '0.85rem 1.75rem',
              borderRadius: '999px', textDecoration: 'none',
              fontWeight: 700, fontSize: '0.95rem',
              boxShadow: '0 4px 16px rgba(200,90,14,0.3)',
            }}>
              <Camera size={18} /> Scatta la tua foto
            </a>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.75rem',
              marginBottom: '2rem',
            }}>
              {photos.map((photo, i) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  onClick={() => setLightbox(photo)}
                  style={{
                    aspectRatio: '1080/1350',
                    borderRadius: '0.875rem', overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    border: '1.5px solid #eaddd0',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  whileHover={{ scale: 1.03, boxShadow: '0 8px 28px rgba(0,0,0,0.14)' }}
                >
                  <CldImage
                    src={photo.cloudinary_public_id}
                    width={400}
                    height={500}
                    crop="fill"
                    alt={`Foto #${photo.id}`}
                    sizes="200px"
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                    overlays={photo.frame_name ? [{
                      publicId: photo.frame_name,
                      flags: ['relative'],
                      width: '1.0',
                      height: '1.0',
                    }] : []}
                  />
                </motion.div>
              ))}
            </div>

            {/* CTA scatta anche tu */}
            <div style={{
              background: 'white', borderRadius: '1.25rem',
              border: '1.5px solid #eaddd0', padding: '1.5rem',
              textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            }}>
              <p style={{ color: '#7a4820', fontSize: '0.9rem', margin: '0 0 1rem', fontWeight: 600 }}>
                Anche tu vuoi apparire qui? 🎃
              </p>
              <a href="/zuccaland/photo" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'linear-gradient(135deg, #e07848, #c85a0e)',
                color: 'white', padding: '0.8rem 1.5rem',
                borderRadius: '999px', textDecoration: 'none',
                fontWeight: 700, fontSize: '0.9rem',
                boxShadow: '0 4px 14px rgba(200,90,14,0.3)',
              }}>
                <Camera size={16} /> Scatta la tua foto
              </a>
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </div>
  );
}
