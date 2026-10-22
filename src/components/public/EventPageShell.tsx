import { ArrowLeft, CalendarDays, LifeBuoy, MapPin, Ticket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatDate } from '@/lib/dates';
import { editionTheme, editionThemeStyle, type EditionBrand } from '@/lib/edition-theme';
import { brandFontVariables } from './brand-fonts';
import { FallingMarks, MotionRoot, PopIn, Reveal } from './motion';

type ShellEdition = {
  title: string;
  subtitle?: string | null;
  location: string | null;
  coverImage: string | null;
  startsAt: string | Date | null;
  endsAt?: string | Date | null;
  theme: string | null;
  /** Logo, icona e font del format; senza, titolo testuale e colori del pallino. */
  brand?: EditionBrand | null;
  /** Pagina del format, per il link nella barra in alto. */
  format?: { name: string; path: string } | null;
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
 * Cornice delle pagine d'acquisto, di conferma e dei biglietti: barra compatta del format al posto della
 * Navbar del sito, logo del format, fondo crema con macchie di colore (come l'hero di produzione) e fondo
 * chiaro anche quando il resto del sito è in tema scuro.
 */
export function EventPageShell({ edition, eyebrow = 'Biglietteria ufficiale', children }: { edition: ShellEdition; eyebrow?: string; children: ReactNode }) {
  const t = editionTheme(edition.theme);
  const brand = edition.brand ?? null;
  const when = dateRange(edition.startsAt, edition.endsAt);
  const back = edition.format ?? { name: 'Pro Loco Gasperina', path: '/' };
  return (
    <MotionRoot>
      <main
        data-theme="light"
        className={`ui-root ${brandFontVariables} relative isolate min-h-screen overflow-x-clip font-ev-body text-fg`}
        style={{ ...editionThemeStyle(edition.theme, brand), background: 'linear-gradient(180deg, var(--ev-surface) 0%, var(--ev-softer) 520px, #ffffff 100%)' }}
      >
        {/* Barra del format (P1.2): torna alla pagina del format, aiuto. La Navbar del sito qui è nascosta. */}
        <nav aria-label="Navigazione dell’evento" className="sticky top-0 z-30 border-b border-[var(--ev-border)]/70 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
            <Link href={back.path} className="inline-flex min-h-11 items-center gap-1.5 rounded-full pr-2 text-pub-sm font-semibold text-[var(--ev-ink)] hover:text-primary">
              <ArrowLeft size={18} strokeWidth={2.5} aria-hidden />
              <span className="max-w-[40vw] truncate">{back.name}</span>
            </Link>
            <span className="flex min-w-0 items-center gap-2">
              {brand?.mark && <Image src={brand.mark} alt="" width={28} height={28} className="size-7 object-contain" />}
              <span className="truncate text-pub-sm font-bold text-[var(--ev-ink)]">{edition.title}</span>
            </span>
            <Link href="/contatti" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-pub-sm font-semibold text-[var(--ev-ink)] hover:text-primary">
              <LifeBuoy size={18} aria-hidden />
              <span className="hidden sm:inline">Aiuto</span>
              <span className="sr-only sm:hidden">Aiuto</span>
            </Link>
          </div>
        </nav>

        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden">
          {edition.coverImage && <Image src={edition.coverImage} alt="" fill priority sizes="100vw" className="object-cover opacity-[0.12] [mask-image:linear-gradient(to_bottom,black,transparent)]" />}
          <div className="absolute -left-24 -top-24 size-[420px] rounded-full bg-[var(--ev-blob-1)] opacity-70 blur-3xl" />
          <div className="absolute -right-20 top-10 size-[380px] rounded-full bg-[var(--ev-blob-2)] opacity-70 blur-3xl" />
        </div>
        {brand?.mark && <FallingMarks src={brand.mark} />}

        <header className="px-4 pb-8 pt-8 text-center sm:pb-10 sm:pt-12">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <Reveal>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ev-border)] bg-white px-3.5 py-1.5 text-pub-xs font-bold uppercase tracking-[0.12em] text-primary shadow-sm">
                <Ticket size={14} aria-hidden /> {eyebrow}
              </p>
            </Reveal>
            {brand?.logo ? (
              <>
                <h1 className="sr-only">{edition.title}</h1>
                <PopIn delay={0.1} className="mt-5 w-full">
                  <Image
                    src={brand.logo}
                    alt=""
                    width={640}
                    height={200}
                    priority
                    className="mx-auto h-auto max-h-24 w-auto max-w-[min(100%,520px)] object-contain drop-shadow-[0_6px_16px_var(--ev-glow)] transition-transform duration-300 hover:scale-[1.03] sm:max-h-32"
                  />
                </PopIn>
              </>
            ) : (
              <Reveal delay={0.05}>
                <h1 className="mt-4 font-ev-display text-[clamp(2rem,6vw,3.25rem)] font-bold leading-tight tracking-tight text-[var(--ev-ink)]">
                  {edition.title} <span aria-hidden>{t.emoji}</span>
                </h1>
              </Reveal>
            )}
            <Reveal delay={0.2}>
              {edition.subtitle && <p className="mt-3 font-ev-display text-pub-xl font-semibold italic text-[var(--ev-ink)]/85">{edition.subtitle}</p>}
              <ul className="mt-4 flex flex-wrap justify-center gap-2 text-pub-sm font-medium text-[var(--ev-ink)]">
                {when && (
                  <li className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ev-border)] bg-white/80 px-3 py-1.5 shadow-sm">
                    <CalendarDays size={16} aria-hidden className="text-primary" /> {when}
                  </li>
                )}
                {edition.location && (
                  <li className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ev-border)] bg-white/80 px-3 py-1.5 shadow-sm">
                    <MapPin size={16} aria-hidden className="text-primary" /> {edition.location}
                  </li>
                )}
              </ul>
            </Reveal>
          </div>
        </header>
        <div className="relative px-4 pb-28 lg:pb-20">
          <div className="mx-auto max-w-5xl">{children}</div>
        </div>
      </main>
    </MotionRoot>
  );
}
