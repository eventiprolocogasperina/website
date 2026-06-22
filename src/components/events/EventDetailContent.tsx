'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Clock, Users, ArrowLeft,
  FileText, Download, Play, ExternalLink, Phone,
  Mail, AtSign, Share2, Ticket, Info as InfoIcon,
  Link2, Image as ImageIcon, X, ChevronLeft, ChevronRight, ZoomIn,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import BookingForm from '@/components/events/BookingForm';
import type { Event, EventLink } from '@/lib/data/events';

// ─── YouTube helpers ──────────────────────────────────────────────────────────
function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getYoutubeEmbed(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
}

// ─── Icon map for links ───────────────────────────────────────────────────────
const LINK_ICONS: Record<string, React.FC<{ size?: number; style?: React.CSSProperties }>> = {
  external:  ExternalLink,
  map:       MapPin,
  phone:     Phone,
  mail:      Mail,
  instagram: AtSign,
  facebook:  Share2,
  ticket:    Ticket,
  info:      InfoIcon,
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface EventDetailContentProps {
  event: Event;
  isPast: boolean;
  showBooking: boolean;
  fullDate: string;
  pct: number;
}

export default function EventDetailContent({ event, isPast, showBooking, fullDate, pct }: EventDetailContentProps) {
  const cfg = event.config || {};
  const accentColor = cfg.accentColor || 'var(--gold-500)';
  const extraSections = cfg.extraSections || [];
  const hideCapacity = cfg.hideCapacity ?? false;
  const tagline = cfg.tagline || '';
  const attachments = cfg.attachments || [];
  const videos = cfg.videos || [];
  const links = cfg.links || [];

  // ─── Carousel lightbox state ──────────────────────────────────────────────
  const carouselPhotos = cfg.carouselPhotos || [];
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
    setLightboxIndex(prev => prev !== null ? (prev - 1 + carouselPhotos.length) % carouselPhotos.length : null);
  }, [carouselPhotos.length]);
  const nextPhoto = useCallback(() => {
    setLightboxIndex(prev => prev !== null ? (prev + 1) % carouselPhotos.length : null);
  }, [carouselPhotos.length]);

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

  // Special case: User pasted Instagram oEmbed JSON directly
  const isInstagramJson = cfg.type === 'instagram' && cfg.media_url;
  const instagramUrl = isInstagramJson ? cfg.media_url : null;

  const infoPills = [
    { icon: Calendar, text: fullDate },
    ...(!event.dateLabel && event.time !== 'TBD' ? [{ icon: Clock, text: `Ore ${event.time}` }] : []),
    { icon: MapPin, text: event.location },
    ...(event.bookable ? [{
      icon: Users,
      text: isPast
        ? `${event.registeredCount} partecipanti`
        : `${event.maxParticipants - event.registeredCount} posti disponibili`,
    }] : []),
  ];

  // ─── Execute Instagram embed scripts ──────────────────────────────────────────
  useEffect(() => {
    const hasHtmlSection = extraSections.some(s => s.type === 'html' && s.content?.includes('instagram-media'));
    if (hasHtmlSection) {
      // Load Instagram script if not already present
      if (!window.document.getElementById('instagram-embed-script')) {
        const script = window.document.createElement('script');
        script.id = 'instagram-embed-script';
        script.src = '//www.instagram.com/embed.js';
        script.async = true;
        window.document.body.appendChild(script);
      } else {
        // If already loaded, trigger processing again (e.g. for client-side navigation)
        // @ts-ignore
        if (window.instgrm) {
          // @ts-ignore
          window.instgrm.Embeds.process();
        }
      }
    }
  }, [extraSections]);

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
  } as const;

  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div className="event-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <Image
          src={event.image}
          alt={event.title}
          fill
          style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
          priority
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,18,0.2) 0%, rgba(10,12,18,0.92) 100%)' }} />
        <div className="event-hero-text" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '900px' }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Link href="/eventi" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.75rem', transition: 'color 0.2s' }}>
              <ArrowLeft size={14} /> Torna agli eventi
            </Link>
          </motion.div>
          <br />
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className={`badge ${event.category === 'musica' ? 'badge-gold' : event.category === 'gastronomia' ? 'badge-green' : 'badge-blue'}`}
            style={{ marginBottom: '0.6rem', display: 'inline-flex' }}
          >
            {event.category}
          </motion.span>
          {event.config?.logoSrc ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              style={{ marginBottom: '0.4rem', display: 'flex', justifyContent: 'center' }}
            >
              <img src={event.config.logoSrc} alt={event.title} style={{ maxHeight: '140px', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
            </motion.div>
          ) : (
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              style={{ fontWeight: 400, color: '#ffffff', marginBottom: '0.4rem', lineHeight: 1.15 }}
            >
              {event.title}
            </motion.h1>
          )}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            {event.isFree ? (
              <span style={{ fontSize: '0.85rem', color: '#4ade80' }}>Evento Gratuito</span>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--gold-400)' }}>€{event.price} a persona</span>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="section">
        <div className="section-inner">
          <div className="event-detail-grid">

            {/* ── Left: main content ── */}
            <motion.div {...fadeIn}>

              {/* Info pills */}
              <div className="event-info-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
                {infoPills.map(({ icon: Icon, text }) => (
                  <div key={text} className="event-info-pill" style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
                    borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem',
                    fontSize: '0.85rem', color: 'var(--neutral-200)', textTransform: 'capitalize',
                  }}>
                    <Icon size={14} style={{ color: accentColor, flexShrink: 0 }} /> {text}
                  </div>
                ))}
              </div>

              {/* Capacity bar */}
              {event.bookable && !hideCapacity && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  style={{ marginBottom: '2.5rem', transformOrigin: 'left' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--neutral-400)', marginBottom: '0.4rem' }}>
                    <span>Percentuale occupazione</span><span>{pct}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--neutral-700)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? accentColor : 'var(--blue-700)', borderRadius: '3px' }} />
                  </div>
                </motion.div>
              )}

              {/* Accent bar */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 50 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                style={{ height: '2px', background: accentColor, marginBottom: '1.5rem' }}
              />

              {/* Description */}
              <h2 style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '1rem' }}>Descrizione</h2>
              {event.fullDescription.split('\n').filter(Boolean).map((para, i) => (
                <p key={i} style={{ color: 'var(--neutral-300)', lineHeight: 1.8, marginBottom: '0.9rem', fontSize: '0.95rem' }}>{para.trim()}</p>
              ))}

              {/* ── PDF Attachments ── */}
              {attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--neutral-800)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={15} style={{ color: '#f87171' }} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--color-heading)' }}>Allegati</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {attachments.map((att, i) => (
                      <motion.a
                        key={i}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.filename || true}
                        initial={{ opacity: 0, scale: 0.96 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.07 }}
                        whileHover={{ y: -2 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.9rem 1.1rem',
                          background: 'var(--neutral-800)',
                          border: '1px solid var(--neutral-700)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.4)';
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(248,113,113,0.1)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--neutral-700)';
                          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-sm)', background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={18} style={{ color: '#f87171' }} />
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--neutral-100)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.label}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)', marginTop: '0.1rem' }}>PDF</div>
                        </div>
                        <Download size={14} style={{ color: 'var(--neutral-500)', flexShrink: 0 }} />
                      </motion.a>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Videos ── */}
              {videos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--neutral-800)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'rgba(255,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={15} style={{ color: '#ff4444' }} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--color-heading)' }}>Video</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {videos.map((vid, i) => {
                      const embedUrl = getYoutubeEmbed(vid.youtubeUrl);
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1 }}
                        >
                          {vid.title && (
                            <h4 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--neutral-100)', marginBottom: '0.75rem' }}>{vid.title}</h4>
                          )}
                          {embedUrl ? (
                            <div style={{
                              position: 'relative',
                              paddingBottom: '56.25%', // 16:9
                              height: 0,
                              overflow: 'hidden',
                              borderRadius: 'var(--radius-lg)',
                              border: '1px solid var(--neutral-700)',
                              background: '#000',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            }}>
                              <iframe
                                src={embedUrl}
                                title={vid.title || 'Video'}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                              />
                            </div>
                          ) : (
                            <a
                              href={vid.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline"
                              style={{ display: 'inline-flex' }}
                            >
                              <Play size={14} /> Guarda su YouTube
                            </a>
                          )}
                          {vid.description && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', marginTop: '0.75rem', lineHeight: 1.6 }}>{vid.description}</p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Useful Links ── */}
              {links.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--neutral-800)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'rgba(27,75,170,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Link2 size={15} style={{ color: 'var(--blue-500)' }} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--color-heading)' }}>Link Utili</h3>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                    {links.map((lnk, i) => {
                      const IconComp = LINK_ICONS[lnk.icon ?? 'external'] || ExternalLink;
                      return (
                        <motion.a
                          key={i}
                          href={lnk.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.05 }}
                          whileHover={{ y: -2 }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                            padding: '0.55rem 1.1rem',
                            background: 'var(--neutral-800)',
                            border: '1px solid var(--neutral-700)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.85rem', fontWeight: 500,
                            color: 'var(--neutral-200)',
                            textDecoration: 'none',
                            transition: 'border-color 0.2s, color 0.2s, box-shadow 0.2s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = accentColor;
                            (e.currentTarget as HTMLElement).style.color = 'var(--color-heading)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = 'var(--neutral-700)';
                            (e.currentTarget as HTMLElement).style.color = 'var(--neutral-200)';
                          }}
                        >
                          <IconComp size={13} style={{ color: accentColor }} />
                          {lnk.label}
                        </motion.a>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Legacy extra sections ── */}
              {extraSections.map((sec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--neutral-800)' }}
                >
                  {sec.title && <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--color-heading)', marginBottom: '1.25rem' }}>{sec.title}</h3>}
                  {sec.type === 'text' && sec.content && (
                    sec.content.split('\n').filter(Boolean).map((line, j) => (
                      <p key={j} style={{ color: 'var(--neutral-300)', lineHeight: 1.8, marginBottom: '0.8rem', fontSize: '0.95rem' }}>{line.trim()}</p>
                    ))
                  )}
                  {sec.type === 'image' && sec.src && (
                    <div style={{ position: 'relative', width: '100%', height: '350px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '1rem' }}>
                      <Image src={sec.src} alt={sec.title || 'Image'} fill style={{ objectFit: 'cover' }} />
                    </div>
                  )}
                  {sec.type === 'link' && sec.linkUrl && (
                    <div style={{ marginTop: '1rem' }}>
                      <a href={sec.linkUrl} target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ display: 'inline-flex' }}>
                        {sec.linkText || 'Scopri di più'}
                      </a>
                    </div>
                  )}
                  {sec.type === 'html' && sec.content && (
                    <div dangerouslySetInnerHTML={{ __html: sec.content }} style={{ color: 'var(--neutral-300)', lineHeight: 1.8 }} />
                  )}
                </motion.div>
              ))}

              {/* ── Carousel Photos ── */}
              {carouselPhotos.length > 0 && (
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
                    {carouselPhotos.map((photo, i) => (
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
                          alt={photo.alt || `Foto evento ${i + 1}`}
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
                </motion.div>
              )}

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
                    {carouselPhotos.length > 1 && (
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
                        src={carouselPhotos[lightboxIndex].src}
                        alt={carouselPhotos[lightboxIndex].alt || `Foto ${lightboxIndex + 1}`}
                        style={{
                          maxWidth: '90vw', maxHeight: '80vh',
                          objectFit: 'contain',
                          borderRadius: 'var(--radius-lg)',
                          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
                          display: 'block',
                        }}
                      />
                      {carouselPhotos[lightboxIndex].alt && (
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
                          {carouselPhotos[lightboxIndex].alt}
                        </p>
                      )}
                    </motion.div>

                    {/* Next */}
                    {carouselPhotos.length > 1 && (
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
                    {carouselPhotos.length > 1 && (
                      <div style={{
                        position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
                        fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)',
                        background: 'rgba(0,0,0,0.4)', padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-full)',
                      }}>
                        {lightboxIndex + 1} / {carouselPhotos.length}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Native Instagram JSON Support ── */}
              {instagramUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--neutral-800)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'rgba(225,48,108,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AtSign size={15} style={{ color: '#E1306C' }} />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 500, color: 'var(--color-heading)' }}>Post di Instagram</h3>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <iframe 
                      src={`${instagramUrl.replace(/\/$/, '')}/embed`} 
                      width="400" 
                      height="480" 
                      frameBorder="0" 
                      scrolling="no" 
                      allowTransparency={true}
                      style={{ maxWidth: '100%', borderRadius: 'var(--radius-lg)', border: '1px solid var(--neutral-700)', background: '#fff' }}
                    />
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* ── Right: sidebar ── */}
            <motion.div
              className="event-sidebar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {showBooking ? (
                <div style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                  <div style={{ padding: '1.5rem 1.5rem 0', borderBottom: '1px solid var(--neutral-700)' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 500, marginBottom: '0.25rem' }}>Prenota il tuo posto</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', paddingBottom: '1rem' }}>
                      Posti disponibili: {event.maxParticipants - event.registeredCount}
                    </p>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <BookingForm eventId={event.id} eventTitle={event.title} eventSlug={event.slug} />
                  </div>
                </div>
              ) : isPast ? (
                <div style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.5rem' }}>Evento concluso</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.6 }}>
                    Questo evento si è già svolto. Resta aggiornato sui nostri prossimi appuntamenti!
                  </p>
                  <Link href="/eventi" className="btn btn-primary" style={{ marginTop: '1.25rem', display: 'inline-flex' }}>Vedi i prossimi</Link>
                </div>
              ) : tagline ? (
                <div style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', padding: '2.5rem 2rem', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 500, marginBottom: '1rem', color: accentColor, fontStyle: 'italic' }}>In Breve</h3>
                  <p style={{ fontSize: '1rem', color: 'var(--neutral-300)', lineHeight: 1.6 }}>
                    {tagline}
                  </p>
                </div>
              ) : !event.bookable && !cfg.hideFreeEntryPanel ? (
                <div style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', padding: '2.5rem 2rem', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✨</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '0.75rem', color: 'var(--color-heading)' }}>Ingresso Libero</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.7 }}>
                    Per questo evento non è necessaria la prenotazione. Ti aspettiamo direttamente sul posto!
                  </p>
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--neutral-700)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aggiungi al calendario</p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Google</button>
                      <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Apple</button>
                    </div>
                  </div>
                </div>
              ) : !event.bookable && cfg.hideFreeEntryPanel ? (
                null
              ) : (
                <div style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📅</div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.5rem' }}>Dettagli in arrivo</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.6 }}>
                    Le iscrizioni per questo evento non sono ancora aperte. Seguici sui social per non perderti gli aggiornamenti!
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    <a href="https://www.instagram.com/prolocogasperina_aps/" target="_blank" rel="noopener noreferrer" className="btn btn-gold" style={{ fontSize: '0.82rem', padding: '0.55rem 1.2rem' }}>Instagram</a>
                    <a href="https://www.facebook.com/prolocogasperina/" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.55rem 1.2rem' }}>Facebook</a>
                  </div>
                </div>
              )}
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
