import { ExternalLink, FileText, MapPin } from 'lucide-react';
import { safeHref } from './markup';
import type { BlockProps } from './schema';
import { card, display, h2, section, wrap } from './ui';

/*
 * Blocchi piccoli: allegati, numeri chiave, video e mappa. Video e mappa caricano l'iframe solo
 * quando entrano nello schermo (loading="lazy") e con dimensioni fisse, senza spostare la pagina.
 */

export function Allegati({ props }: { props: BlockProps<'Allegati'> }) {
  const items = props.items.filter((i) => safeHref(i.url));
  if (!items.length) return null;
  return (
    <section className={section}>
      <div className="mx-auto max-w-3xl">
        <h2 className={h2}>{props.title || 'Regolamento e allegati'}</h2>
        <ul className="grid gap-3">
          {items.map((it, i) => (
            <li key={i}>
              <a href={it.url} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 rounded-2xl bg-white px-5 py-4 font-semibold text-[var(--brand-ink)] shadow-sm hover:bg-[var(--brand-soft)]">
                <FileText size={20} className="shrink-0 text-[var(--brand)]" aria-hidden />
                <span className="flex-1">{it.label || it.url}</span>
                <ExternalLink size={16} className="text-[var(--brand-ink-soft)]" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function NumeriChiave({ props }: { props: BlockProps<'NumeriChiave'> }) {
  if (!props.items.length) return null;
  return (
    <section className={section}>
      <div className={wrap}>
        {props.title && <h2 className={h2}>{props.title}</h2>}
        <dl className="grid grid-cols-2 gap-4 @3xl:grid-cols-4">
          {props.items.map((n, i) => (
            <div key={i} className={`${card} text-center`}>
              <dt className="sr-only">{n.label}</dt>
              <dd className={`${display} text-[clamp(2.2rem,7vw,3.5rem)] font-bold leading-none text-[var(--brand)]`}>{n.value}</dd>
              <dd className="mt-2 text-[0.92rem] font-semibold text-[var(--brand-ink-soft)]">{n.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** ID di un video YouTube da un link qualsiasi (watch, youtu.be, embed, shorts). */
export function youtubeId(url: string): string | null {
  const m = /(?:youtu\.be\/|v\/|embed\/|shorts\/|watch\?v=|&v=)([\w-]{11})/.exec(url);
  return m ? m[1] : null;
}

export function Video({ props }: { props: BlockProps<'Video'> }) {
  const id = youtubeId(props.url);
  if (!id) return null;
  return (
    <section className={section}>
      <div className={wrap}>
        {props.title && <h2 className={h2}>{props.title}</h2>}
        <div className="relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-[2rem] bg-black shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
            title={props.title || 'Video'}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            className="absolute inset-0 size-full"
          />
        </div>
      </div>
    </section>
  );
}

export function Mappa({ props }: { props: BlockProps<'Mappa'> }) {
  const has = props.lat !== null && props.lng !== null;
  const link = props.mapsUrl || (has ? `https://www.google.com/maps/search/?api=1&query=${props.lat},${props.lng}` : props.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.address)}` : '');
  if (!has && !link) return null;
  const d = 0.004;
  return (
    <section className={section}>
      <div className={wrap}>
        <h2 className={h2}>{props.title || 'Come arrivare'}</h2>
        {has && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] bg-[var(--brand-soft)] shadow-sm @3xl:aspect-[21/9]">
            <iframe
              title={`Mappa: ${props.address || 'luogo dell’evento'}`}
              loading="lazy"
              className="absolute inset-0 size-full"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${props.lng! - d},${props.lat! - d},${props.lng! + d},${props.lat! + d}&layer=mapnik&marker=${props.lat},${props.lng}`}
            />
          </div>
        )}
        <p className="mt-4 flex flex-wrap items-center justify-center gap-3 text-center font-semibold text-[var(--brand-ink)]">
          {props.address && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={18} className="text-[var(--brand)]" aria-hidden /> {props.address}
            </span>
          )}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-[var(--brand)] underline">
              Apri in Google Maps
            </a>
          )}
        </p>
      </div>
    </section>
  );
}
