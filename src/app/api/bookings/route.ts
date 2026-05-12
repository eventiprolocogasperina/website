import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: Request) {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_id, nome, cognome, email, telefono, partecipanti, note } = body;

    if (!event_id || !nome || !cognome || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sql = neon(process.env.POSTGRES_URL!);
    const id = `bk_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

    // 1. Insert booking
    await sql`
      INSERT INTO bookings (id, event_id, nome, cognome, email, telefono, partecipanti, note)
      VALUES (${id}, ${event_id}, ${nome}, ${cognome}, ${email}, ${telefono}, ${partecipanti}, ${note})
    `;

    // 2. Increment registeredCount in events
    await sql`
      UPDATE events 
      SET "registeredCount" = "registeredCount" + ${parseInt(partecipanti)}
      WHERE id = ${event_id}
    `;

    return NextResponse.json({ id, success: true });
  } catch (error: any) {
    console.error('Booking POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
