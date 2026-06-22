import { neon } from '@neondatabase/serverless';

export interface EventSection {
  type: 'text' | 'image' | 'gallery' | 'link' | 'html';
  title?: string;
  content?: string;
  src?: string;
  linkText?: string;
  linkUrl?: string;
}

export interface EventAttachment {
  /** Etichetta mostrata all'utente, es. "Locandina", "Programma", "Modulo iscrizione" */
  label: string;
  /** URL diretto al PDF (Google Drive, Cloudinary, ecc.) */
  url: string;
  /** Nome file opzionale per il download, es. "locandina-festa-2026.pdf" */
  filename?: string;
}

export interface EventVideo {
  /** Titolo del video */
  title: string;
  /** URL YouTube (sia watch?v= che youtu.be/ sono supportati) */
  youtubeUrl: string;
  /** Descrizione breve opzionale */
  description?: string;
}

export interface EventLink {
  /** Testo del link */
  label: string;
  /** URL di destinazione */
  url: string;
  /** Icona da mostrare accanto al link */
  icon?: 'external' | 'map' | 'phone' | 'mail' | 'instagram' | 'facebook' | 'ticket' | 'info';
}

export interface EventConfig {
  accentColor?: string;
  hideCapacity?: boolean;
  hideFreeEntryPanel?: boolean;
  tagline?: string;
  /** Logo personalizzato (PNG trasparente) da mostrare al posto del titolo testuale */
  logoSrc?: string;
  /** Foto aggiuntive da mostrare in un carosello a scorrimento orizzontale */
  carouselPhotos?: { src: string; alt?: string }[];
  /** Legacy JSON sezioni aggiuntive (es. testo, immagini, html/instagram) */
  extraSections?: {
    type: 'text' | 'image' | 'link' | 'html';
    title?: string;
    content?: string;
    src?: string;
    linkUrl?: string;
    linkText?: string;
  }[];
  /** Allegati (PDF ecc) collegati all'evento */
  attachments?: EventAttachment[];
  /** Video YouTube collegati all'evento */
  videos?: EventVideo[];
  /** Link utili relativi all'evento */
  links?: EventLink[];
  /** Native oEmbed JSON support (e.g., pasted Instagram JSON) */
  type?: string;
  media_url?: string;
  // Fallback for any other custom keys injected via advanced JSON
  [key: string]: any;
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
  isFree: boolean;
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
