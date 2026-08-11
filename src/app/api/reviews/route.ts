import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { eventId, name, rating, comment } = data;

    if (!eventId || !rating) {
      return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 });
    }

    if (!process.env.POSTGRES_URL) {
      throw new Error('Missing POSTGRES_URL');
    }
    const sql = neon(process.env.POSTGRES_URL);

    await sql`
      INSERT INTO reviews ("eventId", name, rating, comment)
      VALUES (${eventId}, ${name || null}, ${rating}, ${comment || null})
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error saving review:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!process.env.POSTGRES_URL) {
      throw new Error('Missing POSTGRES_URL');
    }
    const sql = neon(process.env.POSTGRES_URL);

    let reviews;
    if (eventId) {
      reviews = await sql`SELECT * FROM reviews WHERE "eventId" = ${eventId} ORDER BY "createdAt" DESC`;
    } else {
      reviews = await sql`SELECT * FROM reviews ORDER BY "createdAt" DESC`;
    }

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('API Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
