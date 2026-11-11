import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requirePermission } from '@/server/auth/context';

// L'invio di recensioni dal sito è stato tolto il 2026-11-11 (non più usato): resta la lettura per la moderazione.
export async function GET(request: Request) {
  const denied = await requirePermission('reviews.moderate');
  if (denied) return denied;
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
