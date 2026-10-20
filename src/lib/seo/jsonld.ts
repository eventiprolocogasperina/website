// Dati strutturati schema.org per i motori di ricerca (§13.5): Event sull'edizione, EventSeries sul format.
// Funzioni pure: le pagine passano edizione, catalogo e indirizzo assoluto.
import type { PublicEdition } from '@/lib/public/editions';

export const SITE_URL = 'https://prolocogasperina.it';
export const absoluteUrl = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`);

const ORGANIZER = { '@type': 'Organization', name: 'Pro Loco Gasperina APS', url: SITE_URL } as const;

export type JsonLdSession = { startsAt: Date; endsAt: Date | null; status: 'open' | 'closed' | 'sold_out' | 'cancelled' | 'postponed'; rescheduled: boolean };
export type JsonLdOffer = { name: string; priceCents: number; available: boolean };

/**
 * Stato per schema.org: annullato se tutte le date lo sono, rinviato se l'edizione è sospesa o se le date
 * rinviate non hanno ancora un recupero, riprogrammato se il recupero c'è, altrimenti in programma.
 * Per le edizioni concluse si omette (schema.org non ha uno stato "concluso").
 */
export function eventStatusOf(status: PublicEdition['status'], sessions: readonly JsonLdSession[]): string | null {
  if (status === 'concluded' || status === 'archived') return null;
  if (sessions.length > 0 && sessions.every((s) => s.status === 'cancelled')) return 'https://schema.org/EventCancelled';
  if (status === 'suspended') return 'https://schema.org/EventPostponed';
  const postponed = sessions.filter((s) => s.status === 'postponed');
  if (postponed.some((s) => !s.rescheduled)) return 'https://schema.org/EventPostponed';
  if (postponed.length > 0) return 'https://schema.org/EventRescheduled';
  return 'https://schema.org/EventScheduled';
}

const place = (location: string | null) => ({
  '@type': 'Place',
  name: location || 'Gasperina',
  address: { '@type': 'PostalAddress', streetAddress: location || undefined, addressLocality: 'Gasperina', postalCode: '88060', addressRegion: 'CZ', addressCountry: 'IT' },
});

export function eventJsonLd(e: PublicEdition, opts: { url: string; sessions?: readonly JsonLdSession[]; offers?: readonly JsonLdOffer[]; buyUrl?: string | null }) {
  const sessions = (opts.sessions ?? []).filter((s) => s.status !== 'cancelled');
  const starts = sessions.map((s) => s.startsAt).sort((a, b) => a.getTime() - b.getTime());
  const startDate = e.startsAt ?? starts[0] ?? null;
  const endDate = e.endsAt ?? sessions.map((s) => s.endsAt ?? s.startsAt).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const status = eventStatusOf(e.status, opts.sessions ?? []);
  const selling = e.status === 'on_sale' || e.status === 'live';
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title,
    description: e.description ?? e.subtitle ?? undefined,
    url: absoluteUrl(opts.url),
    ...(startDate ? { startDate: startDate.toISOString() } : {}),
    ...(endDate ? { endDate: endDate.toISOString() } : {}),
    ...(status ? { eventStatus: status } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: place(e.location),
    ...(e.coverImage ? { image: [absoluteUrl(e.coverImage)] } : {}),
    organizer: ORGANIZER,
    ...(opts.offers?.length
      ? {
          offers: opts.offers.map((o) => ({
            '@type': 'Offer',
            name: o.name,
            price: (o.priceCents / 100).toFixed(2),
            priceCurrency: 'EUR',
            availability: selling && o.available ? 'https://schema.org/InStock' : e.status === 'sold_out' ? 'https://schema.org/SoldOut' : 'https://schema.org/OutOfStock',
            url: absoluteUrl(opts.buyUrl || opts.url),
          })),
        }
      : {}),
  };
}

export function eventSeriesJsonLd(series: { name: string; description: string | null; url: string }, editions: ReadonlyArray<{ title: string; startsAt: Date | null; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EventSeries',
    name: series.name,
    ...(series.description ? { description: series.description } : {}),
    url: absoluteUrl(series.url),
    organizer: ORGANIZER,
    location: place(null),
    subEvent: editions
      .filter((e) => e.startsAt)
      .map((e) => ({ '@type': 'Event', name: e.title, startDate: e.startsAt!.toISOString(), url: absoluteUrl(e.url), location: place(null) })),
  };
}

/** Testo da mettere in <script type="application/ld+json">: "<" diventa < per non chiudere lo script. */
export const jsonLdText = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
