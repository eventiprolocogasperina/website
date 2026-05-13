import { notFound } from 'next/navigation';
import { getEventBySlug, isEventPast } from '@/lib/data/events';
import EventDetailContent from '@/components/events/EventDetailContent';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: 'Evento non trovato' };
  
  return { 
    title: event.title, 
    description: event.description,
    openGraph: {
      title: event.title,
      description: event.description,
      images: [{ url: event.image }],
      type: 'article',
    },
    alternates: {
      canonical: `https://prolocogasperina.it/eventi/${event.slug}`,
    }
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  
  if (!event) notFound();

  const isPast = isEventPast(event);
  const showBooking = event.bookable && !isPast;

  const dateObj = new Date(event.date + 'T12:00:00');
  const fullDate = event.dateLabel
    ? event.dateLabel
    : dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const pct = Math.round((event.registeredCount / event.maxParticipants) * 100);

  // JSON-LD for SEO (Schema.org Event)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.date,
    eventStatus: isPast ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location,
        addressLocality: 'Gasperina',
        addressRegion: 'CZ',
        addressCountry: 'IT',
      },
    },
    image: [event.image],
    description: event.description,
    offers: {
      '@type': 'Offer',
      url: `https://prolocogasperina.it/eventi/${event.slug}`,
      price: event.price,
      priceCurrency: 'EUR',
      availability: showBooking ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    organizer: {
      '@type': 'Organization',
      name: 'Pro Loco Gasperina APS',
      url: 'https://prolocogasperina.it',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventDetailContent 
        event={event} 
        isPast={isPast} 
        showBooking={showBooking} 
        fullDate={fullDate} 
        pct={pct} 
      />
    </>
  );
}
