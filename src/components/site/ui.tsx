import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { EventCardData } from '@/lib/public/calendar';
import type { NewsArticle } from '@/lib/data/news';
import { v3Fonts } from './fonts';

/** Contenitore delle pagine v3: fondo blu del logo, pannelli arrotondati dentro. */
export function V3Page({ children }: { children: ReactNode }) {
  return (
    <div className={`v3 ${v3Fonts}`}>
      <div className="page">{children}</div>
    </div>
  );
}

/** Titolo di pagina: occhiello, titolo con la seconda parte in oro, testo e foto facoltativa. */
export function PageHero({ eyebrow, title, accent, lede, image, imageAlt = '', children }: { eyebrow?: string; title: string; accent?: string; lede?: ReactNode; image?: string; imageAlt?: string; children?: ReactNode }) {
  return (
    <section className="hero">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="h1">
        {title}
        {accent && <span> {accent}</span>}
      </h1>
      {lede && <p className="lede">{lede}</p>}
      {children}
      {image && (
        <div className="hero-img">
          <Image src={image} alt={imageAlt} width={1600} height={610} priority sizes="(max-width: 1280px) 100vw, 1280px" />
        </div>
      )}
    </section>
  );
}

const MONTHS = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];

/** "sabato 10 ottobre 2026 · ore 10:30"; senza orario se manca (oggi capita "00:00" o "TBD"). */
export function whenLabel(e: Pick<EventCardData, 'date' | 'dateLabel' | 'time'>): string {
  if (!e.date) return e.dateLabel ?? 'Data da definire';
  const day = new Date(`${e.date}T12:00:00Z`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const time = /^\d{1,2}:\d{2}$/.test(e.time) && e.time !== '00:00' ? ` · ore ${e.time}` : '';
  return `${day}${time}`;
}

export function EventCardV3({ event, past }: { event: EventCardData; past: boolean }) {
  const [, m, d] = event.date ? event.date.split('-') : [];
  return (
    <Link className="ev" href={event.href}>
      <div className="ph">
        <Image src={event.image} alt="" fill sizes="(max-width: 960px) 100vw, 400px" />
        {d && (
          <span className="date">
            {d}
            <small>{MONTHS[Number(m) - 1]}</small>
          </span>
        )}
        {past && <span className="state">CONCLUSO</span>}
      </div>
      <h3 className="h3">{event.title}</h3>
      {event.description && <p>{event.description.length > 150 ? `${event.description.slice(0, 147)}…` : event.description}</p>}
      <div className="meta">
        <span>{whenLabel(event)}</span>
        <span>{event.location}</span>
      </div>
    </Link>
  );
}

// Anteprima di una notizia: toglie la sintassi del testo (grassetto, corsivo, link) e taglia a `max` caratteri.
export const excerptOf = (content: string, max: number) => {
  const plain = content.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_#]/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
};

export function NewsCardV3({ article }: { article: NewsArticle }) {
  return (
    <Link className="news-card" href={`/notizie/${article.slug}`}>
      {article.coverImage ? <Image src={article.coverImage} alt="" width={800} height={500} sizes="(max-width: 960px) 100vw, 400px" /> : <div className="news-ph" />}
      <div className="body">
        <time dateTime={article.publishedAt}>{newsDate(article.publishedAt)}</time>
        <h3 className="h3">{article.title}</h3>
        <p className="muted">{excerptOf(article.content, 160)}</p>
      </div>
    </Link>
  );
}

export const newsDate = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
