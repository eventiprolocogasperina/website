import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getEventBySlug, isEventPast, type Event } from '@/lib/data/events';
import EventDetailContent from '@/components/events/EventDetailContent';
import { EditionDetail } from '@/components/events/EditionDetail';
import { isPastEdition, romeDay, type PublicEdition } from '@/lib/public/editions';
import { absoluteUrl, eventJsonLd, jsonLdText } from '@/lib/seo/jsonld';
import { getCheckout } from '@/server/domain/checkout';
import { editionSessionsForJsonLd, findPublicEdition } from '@/server/public/editions';
import { newCheckoutEnabled, publicV2Enabled } from '@/server/public/flags';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

type Resolved = { kind: 'redirect'; to: string } | { kind: 'edition'; edition: PublicEdition } | { kind: 'legacy'; slug: string } | null;

/**
 * Cosa mostra /eventi/[slug] (§13.2, decisione 1A). Con il flag public_v2:
 * - edizione con pagina dedicata → 308 verso /zuccaland, /zuccaland/2026…;
 * - vecchio slug di un'edizione generica → 308 verso /eventi/<slug dell'edizione>;
 * - edizione generica → scheda nuova col catalogo se il checkout nuovo è attivo, altrimenti la scheda di oggi.
 * Senza flag, o se lo slug non è un'edizione: la scheda di oggi dalla tabella `events`.
 */
async function resolve(slug: string): Promise<Resolved> {
  if (await publicV2Enabled()) {
    const found = await findPublicEdition(slug);
    if (found) {
      if (found.href !== `/eventi/${slug}`) return { kind: 'redirect', to: found.href };
      const { edition } = found;
      if (newCheckoutEnabled() || !edition.legacySlug) return { kind: 'edition', edition };
      return { kind: 'legacy', slug: edition.legacySlug };
    }
  }
  return { kind: 'legacy', slug };
}

async function legacyEvent(r: Resolved): Promise<Event | undefined> {
  return r?.kind === 'legacy' ? getEventBySlug(r.slug) : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await resolve(slug);
  if (r?.kind === 'edition') {
    const e = r.edition;
    const description = e.description ?? `${e.title} a ${e.location ?? 'Gasperina'}, organizzato dalla Pro Loco Gasperina APS.`;
    return {
      title: e.title,
      description,
      alternates: { canonical: `/eventi/${e.slug}` },
      openGraph: { title: e.title, description, type: 'website', url: `/eventi/${e.slug}` },
    };
  }
  const event = await legacyEvent(r);
  if (!event) return { title: 'Evento non trovato' };
  return {
    title: event.title,
    description: event.description,
    openGraph: { title: event.title, description: event.description, type: 'article' },
    alternates: { canonical: `https://prolocogasperina.it/eventi/${event.slug}` },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const r = await resolve(slug);
  if (r?.kind === 'redirect') permanentRedirect(r.to);
  if (r?.kind === 'edition') return <EditionPage edition={r.edition} />;

  const event = await legacyEvent(r);
  if (!event) notFound();
  return <LegacyEventPage event={event} />;
}

async function EditionPage({ edition: e }: { edition: PublicEdition }) {
  const url = `/eventi/${e.slug}`;
  const isPast = isPastEdition(e, romeDay(new Date())!);
  const [checkout, sessions, legacy] = await Promise.all([
    newCheckoutEnabled() ? getCheckout(e.slug) : Promise.resolve(null),
    editionSessionsForJsonLd(e.id),
    e.legacySlug ? getEventBySlug(e.legacySlug) : Promise.resolve(undefined),
  ]);
  const jsonLd = eventJsonLd(e, {
    url,
    sessions,
    offers: checkout?.products.map((p) => ({ name: p.name, priceCents: p.priceCents, available: Object.values(p.remaining).some((n) => n === null || n > 0) })),
    buyUrl: checkout?.selling ? `/acquista/${e.slug}` : null,
  });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <EditionDetail edition={e} checkout={checkout} body={legacy?.fullDescription ?? null} isPast={isPast} />
    </>
  );
}

function LegacyEventPage({ event }: { event: Event }) {
  const isPast = isEventPast(event);
  const showBooking = event.bookable && !isPast;
  const dateObj = new Date(event.date + 'T12:00:00');
  const fullDate = event.dateLabel ? event.dateLabel : dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const pct = Math.round((event.registeredCount / event.maxParticipants) * 100);

  // JSON-LD for SEO (Schema.org Event)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.date,
    // Schema.org non ha uno stato "concluso": per gli eventi passati il campo si omette.
    ...(isPast ? {} : { eventStatus: 'https://schema.org/EventScheduled' }),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location,
      address: { '@type': 'PostalAddress', streetAddress: event.location, addressLocality: 'Gasperina', addressRegion: 'CZ', addressCountry: 'IT' },
    },
    image: [absoluteUrl(event.image)],
    description: event.description,
    offers: {
      '@type': 'Offer',
      url: `https://prolocogasperina.it/eventi/${event.slug}`,
      price: event.price,
      priceCurrency: 'EUR',
      availability: showBooking ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    organizer: { '@type': 'Organization', name: 'Pro Loco Gasperina APS', url: 'https://prolocogasperina.it' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <EventDetailContent event={event} isPast={isPast} showBooking={showBooking} fullDate={fullDate} pct={pct} />
    </>
  );
}
