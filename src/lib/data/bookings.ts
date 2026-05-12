import { neon } from '@neondatabase/serverless';

export interface Booking {
  id: string;
  event_id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  partecipanti: number;
  note?: string;
  stato: 'confermato' | 'annullato' | 'in attesa';
  createdAt: string;
  checkedIn: boolean;
  /** Joined field for UI */
  eventTitle?: string;
}

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function getAllBookings(): Promise<Booking[]> {
  try {
    const sql = getDb();
    const bookings = await sql`
      SELECT b.*, e.title as "eventTitle"
      FROM bookings b
      LEFT JOIN events e ON b.event_id = e.id
      ORDER BY b."createdAt" DESC
    `;
    return bookings as Booking[];
  } catch (error) {
    console.error('Failed to get all bookings:', error);
    return [];
  }
}

export async function getBookingsByEvent(eventId: string): Promise<Booking[]> {
  try {
    const sql = getDb();
    const bookings = await sql`
      SELECT * FROM bookings 
      WHERE event_id = ${eventId} 
      ORDER BY "createdAt" DESC
    `;
    return bookings as Booking[];
  } catch (error) {
    console.error('Failed to get bookings by event:', error);
    return [];
  }
}
