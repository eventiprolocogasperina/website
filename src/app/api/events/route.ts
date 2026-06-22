import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Helper for DB connection
function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function GET(request: Request) {
  try {
    const sql = getDb();
    
    // Check if we need only upcoming events
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');

    let events;
    if (filter === 'upcoming') {
      const today = new Date().toISOString().split('T')[0];
      // Get events from today onwards, sorted by date ASC (closest first)
      events = await sql`SELECT * FROM events WHERE date >= ${today} ORDER BY date ASC`;
    } else {
      // Get all events, sorted by date DESC (newest first)
      events = await sql`SELECT * FROM events ORDER BY date DESC`;
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error('API /events GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = getDb();
    const body = await request.json();

    const {
      id, slug, title, date, dateLabel, time, location, category,
      description, fullDescription, image, maxParticipants,
      registeredCount, price, isFree, featured, bookable, config
    } = body;

    if (!id || !slug || !title || !date || !time || !location || !category || !description || !fullDescription || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const configJson = config ? JSON.stringify(config) : null;

    const result = await sql`
      INSERT INTO events (
        id, slug, title, date, "dateLabel", time, location, category, 
        description, "fullDescription", image, "maxParticipants", "registeredCount", 
        price, "isFree", featured, bookable, config
      ) VALUES (
        ${id}, ${slug}, ${title}, ${date}, ${dateLabel || null}, ${time}, ${location}, ${category},
        ${description}, ${fullDescription}, ${image}, ${maxParticipants || 0}, ${registeredCount || 0},
        ${price || 0}, ${isFree || false}, ${featured || false}, ${bookable || false},
        ${configJson}::jsonb
      )
      RETURNING *;
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('API /events POST error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
