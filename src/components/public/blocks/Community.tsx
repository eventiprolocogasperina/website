import { Star } from 'lucide-react';
import Image from 'next/image';
import { GalleryGrid } from './GalleryGrid';
import type { BlockProps } from './schema';
import type { BlockData } from './types';
import { h2, section, wrap } from './ui';

/*
 * Blocchi che leggono contenuti del sito invece di ripeterli: foto della galleria, sponsor attivi,
 * recensioni dei visitatori. Le foto scelte a mano nel blocco vengono prima di quelle della categoria
 * e dell'album webp (scripts/foto.ts); se ce ne sono più di `limit`, le altre si aprono con "Mostra altre".
 */

export function Galleria({ props, data }: { props: BlockProps<'Galleria'>; data: BlockData }) {
  const fromCategory = props.category ? (data.gallery[props.category] ?? []) : [];
  const fromAlbum = props.album ? (data.albums[props.album] ?? []).map((p) => ({ ...p, alt: props.title || '' })) : [];
  const all = [...props.photos.filter((p) => p.src).map((p) => ({ ...p, width: 1200, height: 900 })), ...fromCategory, ...fromAlbum];
  // Una foto scelta a mano che è anche nell'album compare una volta sola.
  const photos = all.filter((p, i) => all.findIndex((x) => x.src === p.src) === i);
  if (!photos.length) return null;
  return (
    <section id="galleria" className={`${section} scroll-mt-32`}>
      <div className={wrap}>
        <h2 className={h2}>{props.title || 'I ricordi'}</h2>
        {props.subtitle && <p className="-mt-3 mb-6 text-center text-[1.05rem] text-[var(--brand-ink-soft)]">{props.subtitle}</p>}
        <GalleryGrid photos={photos} step={props.limit} />
      </div>
    </section>
  );
}

export function Sponsor({ props, data }: { props: BlockProps<'Sponsor'>; data: BlockData }) {
  if (!data.sponsors.length) return null;
  return (
    <section className={section}>
      <div className={wrap}>
        <h2 className={h2}>{props.title || 'Grazie ai nostri sponsor'}</h2>
        <ul className="flex flex-wrap items-center justify-center gap-4">
          {data.sponsors.map((s) => {
            const logo = <Image src={s.logoUrl} alt={s.name} width={160} height={80} className="h-16 w-auto object-contain" />;
            return (
              <li key={s.name} className="flex h-24 min-w-36 items-center justify-center rounded-2xl bg-white px-5 shadow-sm">
                {s.websiteUrl ? (
                  <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer sponsored">
                    {logo}
                  </a>
                ) : (
                  logo
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function Recensioni({ props, data }: { props: BlockProps<'Recensioni'>; data: BlockData }) {
  const list = (data.reviews[props.source] ?? []).filter((r) => r.comment).slice(0, props.limit);
  if (!list.length) return null;
  return (
    <section className={section}>
      <div className={wrap}>
        <h2 className={h2}>{props.title || 'Dicono di noi'}</h2>
        <ul className="grid gap-4 @3xl:grid-cols-2 @5xl:grid-cols-3">
          {list.map((r, i) => (
            <li key={i} className="rounded-3xl bg-white p-6 shadow-[0_4px_15px_rgba(0,0,0,0.04)]">
              <p className="flex gap-0.5 text-[var(--brand-accent)]" aria-label={`${r.rating} stelle su 5`}>
                {Array.from({ length: 5 }, (_, s) => (
                  <Star key={s} size={18} aria-hidden fill={s < r.rating ? 'currentColor' : 'none'} />
                ))}
              </p>
              <blockquote className="mt-3 leading-relaxed text-[var(--brand-ink)]">“{r.comment}”</blockquote>
              {r.name && <p className="mt-3 text-[0.9rem] font-bold text-[var(--brand-ink-soft)]">{r.name}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
