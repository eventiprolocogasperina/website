import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT value FROM site_settings WHERE key = 'whatsapp_topics'`;
    
    let topics = [];
    if (rows.length > 0 && rows[0].value) {
      try {
        topics = JSON.parse(rows[0].value as string);
      } catch (e) {
        console.error('Failed to parse whatsapp_topics', e);
      }
    }

    // Default fallback if nothing is set in the DB
    if (topics.length === 0) {
      topics = [
        { id: 'tickets', label: 'Problemi con i biglietti di A&P', phone: '393888693529' },
        { id: 'iscrizione', label: 'Iscrizione alla Pro Loco', phone: '393279783232' },
        { id: 'pagamenti', label: 'Informazioni sui pagamenti', phone: '393888693529' },
      ];
    }

    return NextResponse.json({ success: true, data: topics });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
