'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { photoLoader } from '@/lib/photo';
import { submitReviewAction } from '@/server/public/notify-actions';
import type { BlockProps } from './schema';
import type { BlockData } from './types';
import { display } from './ui';

/*
 * Pagina "Grazie" di fine edizione, come la vecchia di Assaggia & Passeggia: copertina a tutto schermo con
 * le foto che si alternano, "Grazie!" al centro, poi la galleria scura che si carica scorrendo, la foto
 * grande a tutto schermo e la recensione. Le foto vengono dall'album webp e/o dalla categoria della galleria.
 */

type Photo = { src: string; width: number; height: number };
const PAGE = 24;
const SLIDES = 8;

export function Ricordi({ props, data }: { props: BlockProps<'Ricordi'>; data: BlockData }) {
  const fromAlbum = props.album ? (data.albums[props.album] ?? []) : [];
  const fromCategory = props.category ? (data.gallery[props.category] ?? []) : [];
  const all = [...fromAlbum, ...fromCategory];
  const photos = all.filter((p, i) => all.findIndex((x) => x.src === p.src) === i);
  const accent = props.accent || '#f0ba3a';
  // Copertina: foto prese lungo tutto l'album, non solo le prime.
  const slides = photos.length <= SLIDES ? photos : Array.from({ length: SLIDES }, (_, i) => photos[Math.floor((i * photos.length) / SLIDES)]);

  const [slide, setSlide] = useState(0);
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  // Le foto si caricano scorrendo: quando la fine della griglia si avvicina, ne arrivano altre.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || shown >= photos.length) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setShown((n) => Math.min(n + PAGE, photos.length)), { rootMargin: '800px' });
    io.observe(el);
    return () => io.disconnect();
  }, [shown, photos.length]);

  const close = useCallback(() => setOpen(null), []);
  const move = useCallback((d: number) => setOpen((i) => (i === null ? null : (i + d + photos.length) % photos.length)), [photos.length]);
  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', key);
    };
  }, [open, close, move]);

  const outline = 'rounded-full border border-white/50 px-8 py-3 font-semibold text-white no-underline transition-colors hover:bg-white/10';
  return (
    <div className="relative bg-[#0a0a0a] text-white">
      <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden">
        <AnimatePresence mode="sync">
          {slides[slide] && (
            <motion.div key={slides[slide].src} className="absolute inset-0" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.5, ease: 'easeInOut' }}>
              <Image src={slides[slide].src} {...photoLoader(slides[slide].src)} alt="" fill sizes="100vw" priority={slide === 0} className="object-cover" />
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`${display} m-0 text-[clamp(4rem,15vw,10rem)] font-bold leading-[1.1] tracking-wide [text-shadow:0_10px_30px_rgba(0,0,0,0.8)]`}
            style={{ color: accent }}
          >
            {props.title || 'Grazie!'}
          </motion.h1>
          {props.text && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1 }} className="mt-6 max-w-[700px] whitespace-pre-line text-[clamp(1rem,3vw,1.5rem)] leading-normal text-white/90 [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
              {props.text}
            </motion.p>
          )}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1.5 }} className="mt-14 flex flex-wrap justify-center gap-4">
            <Link href="/" className={outline}>
              Torna alla Home
            </Link>
            {photos.length > 0 && (
              <a href="#ricordi" className={outline}>
                Guarda le foto
              </a>
            )}
            {props.reviewSource && (
              <button type="button" onClick={() => setReviewing(true)} className="rounded-full px-8 py-3 font-bold text-[#1a1a1a] transition-transform hover:scale-[1.03]" style={{ background: accent }}>
                Lascia una recensione
              </button>
            )}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 2, repeat: Infinity, repeatType: 'reverse' }} className="absolute bottom-8 text-white/60" aria-hidden>
            <ChevronDown size={40} />
          </motion.div>
        </div>
      </section>

      {photos.length > 0 && (
        <section id="ricordi" className="mx-auto min-h-[50vh] max-w-[1400px] scroll-mt-20 px-4 py-16 @3xl:px-8">
          <div className="mb-12 text-center">
            <h2 className={`${display} mb-4 text-5xl font-bold`} style={{ color: accent }}>
              {props.galleryTitle || 'I Ricordi'}
            </h2>
            {props.gallerySubtitle && <p className="text-neutral-400">{props.gallerySubtitle}</p>}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
            {photos.slice(0, shown).map((p, i) => (
              <motion.button
                type="button"
                key={p.src}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '100px' }}
                transition={{ duration: 0.5, delay: (i % 10) * 0.05 }}
                onClick={() => setOpen(i)}
                aria-label={`Apri la foto ${i + 1} di ${photos.length}`}
                className="relative cursor-zoom-in overflow-hidden rounded-xl bg-neutral-900 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                style={{ aspectRatio: p.width > p.height ? '4/3' : '3/4' }}
              >
                <Image src={p.src} {...photoLoader(p.src)} alt="" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" loading={i < 6 ? 'eager' : 'lazy'} />
              </motion.button>
            ))}
          </div>
          <div ref={sentinel} aria-hidden />
        </section>
      )}

      <AnimatePresence>
        {open !== null && photos[open] && (
          <Lightbox photo={photos[open]} index={open} total={photos.length} onClose={close} onMove={move} />
        )}
      </AnimatePresence>
      <AnimatePresence>{reviewing && props.reviewSource && <ReviewDialog source={props.reviewSource} accent={accent} preview={!!data.preview} onClose={() => setReviewing(false)} />}</AnimatePresence>
    </div>
  );
}

const round = 'absolute z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20';

function Lightbox({ photo, index, total, onClose, onMove }: { photo: Photo; index: number; total: number; onClose: () => void; onMove: (d: number) => void }) {
  return (
    <motion.div role="dialog" aria-modal="true" aria-label="Foto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md">
      <button type="button" onClick={onClose} aria-label="Chiudi" className={`${round} right-6 top-6`}>
        <X size={32} />
      </button>
      {total > 1 && (
        <>
          <button type="button" onClick={(e) => (e.stopPropagation(), onMove(-1))} aria-label="Foto precedente" className={`${round} left-6 p-3`}>
            <ChevronLeft size={36} />
          </button>
          <button type="button" onClick={(e) => (e.stopPropagation(), onMove(1))} aria-label="Foto successiva" className={`${round} right-6 p-3`}>
            <ChevronRight size={36} />
          </button>
        </>
      )}
      <motion.div key={photo.src} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="relative h-[85vh] w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <Image src={photo.src} {...photoLoader(photo.src)} alt="" fill sizes="90vw" quality={90} priority className="object-contain" />
      </motion.div>
      <p className="absolute bottom-6 text-sm tabular-nums text-white/50">
        {index + 1} / {total}
      </p>
    </motion.div>
  );
}

function ReviewDialog({ source, accent, preview, onClose }: { source: string; accent: string; preview: boolean; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'busy' | 'done' | 'error'; message?: string }>({ status: 'idle' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || preview) return;
    setState({ status: 'busy' });
    const res = await submitReviewAction({ source, rating, name, comment, website: '' });
    setState(res.ok ? { status: 'done' } : { status: 'error', message: res.error });
    if (res.ok) setTimeout(onClose, 3000);
  }

  const input = 'w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 text-white placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none';
  return (
    <motion.div role="dialog" aria-modal="true" aria-label="Lascia una recensione" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4">
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="relative w-full max-w-[450px] rounded-2xl border border-neutral-800 bg-neutral-900 p-8">
        <button type="button" onClick={onClose} aria-label="Chiudi" className="absolute right-6 top-6 text-neutral-400 hover:text-white">
          <X size={24} />
        </button>
        {state.status === 'done' ? (
          <div role="status" className="py-8 text-center">
            <Star size={48} className="mx-auto mb-4" style={{ color: accent, fill: accent }} />
            <h3 className="mb-2 text-2xl text-white">Grazie!</h3>
            <p className="text-neutral-400">Il tuo feedback è preziosissimo per noi.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <h3 className="m-0 text-2xl text-white">La tua esperienza</h3>
            <p className="m-0 text-sm text-neutral-400">Raccontaci come è andata.</p>
            <div className="flex justify-center gap-2" role="radiogroup" aria-label="Voto">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" role="radio" aria-checked={rating === s} aria-label={`${s} stelle`} onClick={() => setRating(s)} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} className="transition-transform hover:scale-110">
                  <Star size={36} style={{ color: s <= (hover || rating) ? accent : '#525252', fill: s <= (hover || rating) ? accent : 'none' }} />
                </button>
              ))}
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Il tuo nome (facoltativo)" className={input} />
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={4} placeholder="Cosa ti è piaciuto di più?" className={input} />
            {state.status === 'error' && <p className="m-0 text-sm text-red-400">{state.message}</p>}
            <button type="submit" disabled={!rating || state.status === 'busy'} className="rounded-full py-3 font-bold text-[#1a1a1a] disabled:opacity-50" style={{ background: accent }}>
              {state.status === 'busy' ? 'Invio…' : 'Invia recensione'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
