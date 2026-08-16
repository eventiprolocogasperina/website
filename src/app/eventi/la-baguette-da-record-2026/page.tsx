'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ruler, Wheat, GripHorizontal, Flame, Play, Camera, ArrowLeft, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import BaguetteGame from '@/components/events/BaguetteGame';

export default function BaguetteRecordPage() {
  const customAccent = '#e85d04'; // Warm amber/orange for the record theme
  const lightBg = '#fdfaf6'; // Warm light background
  const textDark = '#2a150a'; // Dark brown text
  const textMuted = '#6a4a3a'; // Muted brown text

  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/gallery')
      .then(res => res.json())
      .then((data: any[]) => {
        const b26Photos = data.filter(d => d.category === 'baguette26');
        if (b26Photos.length > 0) {
          setGalleryPhotos(b26Photos);
        } else {
          import('@/lib/data/baguette-2026-gallery.json')
            .then(module => setGalleryPhotos(module.default || []))
            .catch(() => console.log('Galleria JSON non trovata.'));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') setLightboxIndex(prev => prev !== null ? (prev > 0 ? prev - 1 : galleryPhotos.length - 1) : null);
      if (e.key === 'ArrowRight') setLightboxIndex(prev => prev !== null ? (prev < galleryPhotos.length - 1 ? prev + 1 : 0) : null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, galleryPhotos.length]);

  const stats = [
    {
      icon: <Ruler size={32} color={customAccent} />,
      value: '149,4 m',
      label: 'Lunghezza Registrata',
    },
    {
      icon: <Wheat size={32} color={customAccent} />,
      value: '+300 kg',
      label: 'di Baguette',
    },
    {
      icon: <Flame size={32} color={customAccent} />,
      value: '+350 kg',
      label: 'Ripieno (Peperoni e Patate)',
    },
    {
      icon: <GripHorizontal size={32} color={customAccent} />,
      value: '+60',
      label: 'Pannelli per i Tavoli',
    },
  ];

  return (
    <main style={{ backgroundColor: lightBg, minHeight: '100vh', color: textDark }}>
      
      {/* Hero Section */}
      <section style={{ position: 'relative', minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '6rem 2rem 2rem' }}>
        {/* Background Video Placeholder */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: '#f0e6d2' }}>
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15 }}
          >
            {/* Inserisci qui l'URL del video di background in futuro */}
            {/* <source src="/video/baguette-hero.mp4" type="video/mp4" /> */}
          </video>
          {/* Gradient Overlay to ensure text readability */}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(45deg, ${lightBg}, transparent, ${lightBg})` }} />
        </div>
        
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '800px' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Link href="/eventi" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: textMuted, textDecoration: 'none', marginBottom: '2rem', transition: 'color 0.2s', fontWeight: 500 }}>
              <ArrowLeft size={16} /> Torna agli Eventi
            </Link>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2 }}>
            <span style={{ display: 'inline-block', padding: '0.5rem 1rem', border: `1px solid ${customAccent}`, borderRadius: '50px', color: customAccent, fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              Agosto 2026
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1.1, margin: '0 0 1.5rem 0', textShadow: '0 4px 20px rgba(255,255,255,0.8)' }}
          >
            <span style={{ color: 'var(--gold-500, #b48530)' }}>La Baguette</span> <br />
            <span style={{ color: customAccent }}>da Record</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', color: textMuted, maxWidth: '600px', margin: '0 auto', lineHeight: 1.6, fontWeight: 500 }}
          >
            Un'impresa titanica che ha unito tutta Gasperina. Una notte all'insegna della tradizione, 
            del gusto e di una sfida senza precedenti.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.8 }}
            style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
          >
            <span style={{ fontSize: '0.8rem', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Main Partner</span>
            <Image src="/img/logo_la_spiga.png" alt="La Spiga Logo" width={180} height={80} style={{ objectFit: 'contain' }} />
          </motion.div>
        </div>
      </section>

      {/* Stats & Video Section */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 10, display: 'flex', flexWrap: 'wrap', gap: '4rem', alignItems: 'center' }}>
        
        {/* Left Side: Stats */}
        <div style={{ flex: '1 1 600px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            {stats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '1.5rem',
                  padding: '2.5rem 2rem',
                  textAlign: 'center',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: `linear-gradient(90deg, transparent, ${customAccent}, transparent)` }} />
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(232, 93, 4, 0.1)', marginBottom: '1.5rem' }}>
                  {stat.icon}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', margin: '0 0 0.5rem 0', color: textDark }}>
                  {stat.value}
                </h3>
                <p style={{ margin: 0, color: textMuted, fontSize: '1rem', fontWeight: 600 }}>
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side: Video Shorts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}
        >
          <div style={{ position: 'relative', width: '315px', height: '560px', maxWidth: '100%' }}>
            <iframe 
              width="100%" 
              height="100%" 
              src="https://www.youtube.com/embed/x3vgthYppzE?autoplay=1&mute=1&controls=0&loop=1&playlist=x3vgthYppzE&rel=0" 
              title="Baguette da Record Shorts" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowFullScreen
              style={{ borderRadius: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', background: '#000' }}
            ></iframe>
          </div>
          
          <a 
            href="https://www.instagram.com/reel/DcGfi1Etrjj/?igsh=ZDFqOTJmdzhqdjFv&igsi=ZDFqOTJmdzhqdjFv"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.75rem 1.5rem', 
              background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '2rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <Camera size={20} />
            Apri su Instagram
          </a>
        </motion.div>

      </section>

      {/* Mini-Game Section */}
      <section style={{ padding: '2rem 2rem 4rem', maxWidth: '800px', margin: '0 auto' }}>
        <BaguetteGame />
      </section>

      {/* Video Placeholder is now replaced by real video above */}
      {/* Gallery Section */}
      <section style={{ padding: '4rem 2rem 8rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', margin: '0 0 1rem 0' }}>I Momenti Salienti</h2>
          <p style={{ color: textMuted, fontSize: '1.1rem' }}>Rivivi le emozioni di questo record incredibile.</p>
        </div>

        {galleryPhotos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', gridAutoRows: 'minmax(200px, auto)' }}>
            {galleryPhotos.map((photo, i) => (
              <motion.div
                key={photo.src}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "100px" }}
                transition={{ duration: 0.5, delay: (i % 10) * 0.05 }}
                style={{
                  position: 'relative',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  background: '#f4ede1',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                  aspectRatio: photo.width > photo.height ? '4/3' : '3/4',
                  cursor: 'pointer'
                }}
                onClick={() => setLightboxIndex(i)}
              >
                <Image
                  src={photo.src}
                  alt="Foto Baguette da Record"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  loading={i < 6 ? 'eager' : 'lazy'}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: textMuted }}>
            <Loader2 className="animate-spin" size={40} style={{ margin: '0 auto 1rem', color: customAccent }} />
            <p>Elaborazione e caricamento foto in corso...</p>
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxIndex !== null && galleryPhotos[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxIndex(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: 'rgba(0,0,0,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}
          >
            <button 
              onClick={() => setLightboxIndex(null)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', padding: '0.5rem', zIndex: 210, transition: 'background 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              <X size={32} />
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : galleryPhotos.length - 1); }}
              style={{ position: 'absolute', left: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', padding: '0.75rem', zIndex: 210, transition: 'background 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              <ChevronLeft size={36} />
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex < galleryPhotos.length - 1 ? lightboxIndex + 1 : 0); }}
              style={{ position: 'absolute', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', padding: '0.75rem', zIndex: 210, transition: 'background 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              <ChevronRight size={36} />
            </button>

            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'relative', width: '90vw', height: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image 
                src={galleryPhotos[lightboxIndex].src} 
                alt="Fullscreen photo" 
                fill 
                style={{ objectFit: 'contain' }} 
                quality={90}
                priority
              />
            </motion.div>
            
            <div style={{ position: 'absolute', bottom: '1.5rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
              {lightboxIndex + 1} / {galleryPhotos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </main>
  );
}
