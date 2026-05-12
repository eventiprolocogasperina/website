import { neon } from '@neondatabase/serverless';

export interface EventConfig {
  /** Override the accent colour for this event's page (CSS colour value, e.g. "#e84040") */
  accentColor?: string;
  /** Extra content sections rendered below the description */
  extraSections?: Array<{ title: string; content: string }>;
  /** Hide the capacity bar on the event page */
  hideCapacity?: boolean;
  /** A short tag line shown beneath the hero title */
  tagline?: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  date: string;
  dateLabel?: string;
  time: string;
  location: string;
  category: 'cultura' | 'musica' | 'gastronomia' | 'sport' | 'comunità';
  description: string;
  fullDescription: string;
  image: string;
  maxParticipants: number;
  registeredCount: number;
  price: number;
  featured: boolean;
  bookable: boolean;
  /** Per-event page personalisation (RCM) */
  config?: EventConfig | null;
}

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function getAllEvents(): Promise<Event[]> {
  try {
    const sql = getDb();
    const events = await sql`SELECT * FROM events ORDER BY date DESC`;
    return events as Event[];
  } catch (error) {
    console.error('Failed to get all events:', error);
    return [];
  }
}

export async function getUpcomingEvents(): Promise<Event[]> {
  try {
    const sql = getDb();
    const today = new Date().toISOString().split('T')[0];
    const events = await sql`SELECT * FROM events WHERE date >= ${today} ORDER BY date ASC`;
    return events as Event[];
  } catch (error) {
    console.error('Failed to get upcoming events:', error);
    return [];
  }
}

export async function getEventBySlug(slug: string): Promise<Event | undefined> {
  try {
    const sql = getDb();
    const events = await sql`SELECT * FROM events WHERE slug = ${slug} LIMIT 1`;
    return events.length > 0 ? (events[0] as Event) : undefined;
  } catch (error) {
    console.error('Failed to get event by slug:', error);
    return undefined;
  }
}

export function isEventPast(event: Event): boolean {
  const today = new Date().toISOString().split('T')[0];
  return event.date < today;
}
