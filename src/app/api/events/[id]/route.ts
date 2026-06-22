import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = getDb();
    // Assuming `id` in URL could be the ID or the SLUG
    // We will search by SLUG primarily, or ID.
    const identifier = id;
    
    const events = await sql`SELECT * FROM events WHERE id = ${identifier} OR slug = ${identifier} LIMIT 1`;
    
    if (events.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(events[0]);
  } catch (error) {
    console.error('API /events/[id] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = getDb();
    const body = await request.json();

    const {
      slug, title, date, dateLabel, time, location, category,
      description, fullDescription, image, maxParticipants,
      registeredCount, price, isFree, featured, bookable, config
    } = body;

    // Always write config explicitly — the previous CASE WHEN trick doesn't
    // work with Neon's tagged template driver. configJson is either a JSON
    // string to cast to JSONB, or null to set the column to NULL.
    const configJson: string | null = config !== null && config !== undefined
      ? JSON.stringify(config)
      : null;

    // Neon's tagged template driver handles null → SQL NULL automatically,
    // and a string gets sent as a text parameter which Postgres casts to JSONB.
    const result = await sql`
      UPDATE events SET
        slug              = COALESCE(${slug}, slug),
        title             = COALESCE(${title}, title),
        date              = COALESCE(${date}, date),
        "dateLabel"       = ${dateLabel ?? null},
        time              = COALESCE(${time}, time),
        location          = COALESCE(${location}, location),
        category          = COALESCE(${category}, category),
        description       = COALESCE(${description}, description),
        "fullDescription" = COALESCE(${fullDescription}, "fullDescription"),
        image             = COALESCE(${image}, image),
        "maxParticipants" = COALESCE(${maxParticipants}, "maxParticipants"),
        "registeredCount" = COALESCE(${registeredCount}, "registeredCount"),
        price             = COALESCE(${price}, price),
        "isFree"          = COALESCE(${isFree !== undefined ? isFree : null}, "isFree"),
        featured          = COALESCE(${featured !== undefined ? featured : null}, featured),
        bookable          = COALESCE(${bookable !== undefined ? bookable : null}, bookable),
        config            = ${configJson}::jsonb
      WHERE id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('API /events/[id] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = getDb();

    const result = await sql`
      DELETE FROM events WHERE id = ${id} RETURNING id;
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('API /events/[id] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
