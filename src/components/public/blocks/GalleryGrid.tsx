'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

type Photo = { src: string; alt: string; width: number; height: number };

/** Griglia della Galleria: le prime `step` foto, poi "Mostra altre", e la foto grande a tutto schermo. */
export function GalleryGrid({ photos, step }: { photos: Photo[]; step: number }) {
  const [shown, setShown] = useState(step);
  const [open, setOpen] = useState<number | null>(null);
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

  const current = open === null ? null : photos[open];
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 @3xl:grid-cols-3 @5xl:grid-cols-4">
        {photos.slice(0, shown).map((p, i) => (
          <li key={p.src + i} className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--brand-soft)]">
            <button type="button" onClick={() => setOpen(i)} className="block size-full cursor-zoom-in" aria-label={`Apri la foto ${i + 1} di ${photos.length}`}>
              <Image src={p.src} alt={p.alt || ''} fill sizes="(max-width: 768px) 50vw, 300px" className="object-cover transition-transform duration-300 hover:scale-105" />
            </button>
          </li>
        ))}
      </ul>
      {shown < photos.length && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + step)}
            className="rounded-full border-2 border-[var(--brand)] px-6 py-2.5 font-bold text-[var(--brand)] transition-colors hover:bg-[var(--brand)] hover:text-white"
          >
            Mostra altre foto ({photos.length - shown})
          </button>
        </div>
      )}
      {current && (
        <div role="dialog" aria-modal="true" aria-label="Foto" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={close}>
          <Image src={current.src} alt={current.alt || ''} width={current.width} height={current.height} sizes="100vw" className="max-h-[88vh] w-auto max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} priority />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm tabular-nums text-white/80">
            {open! + 1} / {photos.length}
          </p>
          <button type="button" onClick={close} aria-label="Chiudi" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X size={24} />
          </button>
          {photos.length > 1 && (
            <>
              <button type="button" onClick={(e) => (e.stopPropagation(), move(-1))} aria-label="Foto precedente" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                <ChevronLeft size={28} />
              </button>
              <button type="button" onClick={(e) => (e.stopPropagation(), move(1))} aria-label="Foto successiva" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                <ChevronRight size={28} />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
