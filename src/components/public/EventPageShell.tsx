import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { formatDate } from '@/lib/dates';
import { editionTheme, editionThemeStyle } from '@/lib/edition-theme';

type ShellEdition = {
  title: string;
  subtitle?: string | null;
  location: string | null;
  coverImage: string | null;
  startsAt: string | Date | null;
  endsAt?: string | Date | null;
  theme: string | null;
};

/** "17 – 25 ottobre 2026" oppure la sola data d'inizio. */
function dateRange(start: string | Date | null, end?: string | Date | null): string | null {
  if (!start) return null;
  const from = formatDate(start);
  if (!end) return from;
  const to = formatDate(end);
  if (from === to) return from;
  const [d1, ...rest1] = from.split(' ').slice(-3);
  const [d2, ...rest2] = to.split(' ').slice(-3);
  return rest1.join(' ') === rest2.join(' ') ? `${d1} – ${d2} ${rest2.join(' ')}` : `${from} – ${to}`;
}

/**
 * Cornice delle pagine d'acquisto e di conferma: copertina dell'evento, colori del format e fondo chiaro
 * anche quando il resto del sito è in tema scuro.
 */
export function EventPageShell({ edition, eyebrow = 'Biglietteria ufficiale', children }: { edition: ShellEdition; eyebrow?: string; children: ReactNode }) {
  const t = editionTheme(edition.theme);
  const when = dateRange(edition.startsAt, edition.endsAt);
  return (
    <main data-theme="light" className="ui-root min-h-screen text-fg" style={{ ...editionThemeStyle(edition.theme), background: 'linear-gradient(180deg, var(--ev-soft) 0%, var(--ev-softer) 420px, #ffffff 100%)' }}>
      <header className="relative isolate overflow-hidden px-4 pb-24 pt-32 sm:pb-28 sm:pt-36">
        {edition.coverImage && <Image src={edition.coverImage} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />}
        <div aria-hidden className="absolute inset-0 -z-10" style={{ background: `linear-gradient(160deg, ${t.ink}e6 0%, ${t.accent}d9 55%, ${t.accent}b3 100%)` }} />
        <div aria-hidden className="absolute -right-10 -top-10 -z-10 size-48 rounded-full bg-white/10 blur-2xl" />
        <div className="mx-auto max-w-5xl text-white">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-label font-bold uppercase tracking-wider shadow-lg" style={{ color: t.accent }}>
            <Ticket size={15} aria-hidden /> {eyebrow}
          </p>
          <h1 className="mt-4 text-[clamp(2rem,6vw,3.25rem)] font-bold leading-tight tracking-tight">
            {edition.title} <span aria-hidden>{t.emoji}</span>
          </h1>
          {edition.subtitle && <p className="mt-1 text-[1.05rem] text-white/90">{edition.subtitle}</p>}
          <ul className="mt-4 flex flex-wrap gap-2 text-body">
            {when && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                <CalendarDays size={16} aria-hidden /> {when}
              </li>
            )}
            {edition.location && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">
                <MapPin size={16} aria-hidden /> {edition.location}
              </li>
            )}
          </ul>
        </div>
      </header>
      <div className="relative -mt-16 px-4 pb-20 sm:-mt-20">
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>
    </main>
  );
}
