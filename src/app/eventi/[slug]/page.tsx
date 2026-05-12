import { notFound } from 'next/navigation';
import { getEventBySlug, isEventPast } from '@/lib/data/events';
import EventDetailContent from '@/components/events/EventDetailContent';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: 'Evento non trovato' };
  return { title: event.title, description: event.description };
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

  return (
    <EventDetailContent 
      event={event} 
      isPast={isPast} 
      showBooking={showBooking} 
      fullDate={fullDate} 
      pct={pct} 
    />
  );
}
