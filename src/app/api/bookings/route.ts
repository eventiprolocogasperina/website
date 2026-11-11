import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requirePermission } from '@/server/auth/context';

export async function GET(request: Request) {
  const denied = await requirePermission('orders.read');
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    
    const sql = neon(process.env.POSTGRES_URL!);
    
    let bookings;
    if (eventId) {
      bookings = await sql`
        SELECT b.*, e.title as "eventTitle"
        FROM bookings b
        JOIN events e ON b.event_id = e.id
        WHERE b.event_id = ${eventId}
        ORDER BY b."createdAt" DESC
      `;
    } else {
      bookings = await sql`
        SELECT b.*, e.title as "eventTitle"
        FROM bookings b
        LEFT JOIN events e ON b.event_id = e.id
        ORDER BY b."createdAt" DESC
      `;
    }
    
    return NextResponse.json(bookings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// La prenotazione dalle schede evento di prima è stata tolta il 2026-11-11: si prenota dalle edizioni (modulo Prenotazione gratuita).
