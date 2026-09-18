import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT value FROM site_settings WHERE key = 'whatsapp_topics'`;
    
    let topics: { id: string; label: string; phone: string }[] = [];
    if (rows.length > 0 && rows[0].value) {
      try {
        topics = JSON.parse(rows[0].value as string);
      } catch (e) {
        console.error('Failed to parse whatsapp_topics', e);
      }
    }

    // Ensure phone number is updated to 393505757501 if missing or set to old number
    let needsDbUpdate = false;
    if (topics.length === 0) {
      topics = [
        { id: 'tickets', label: 'Richiesta Informazioni & Biglietti', phone: '393505757501' },
        { id: 'iscrizione', label: 'Iscrizione alla Pro Loco', phone: '393505757501' },
        { id: 'pagamenti', label: 'Informazioni sui pagamenti', phone: '393505757501' },
      ];
      needsDbUpdate = true;
    } else {
      topics = topics.map(t => {
        if (!t.phone || t.phone !== '393505757501') {
          needsDbUpdate = true;
          return { ...t, phone: '393505757501' };
        }
        return t;
      });
    }

    if (needsDbUpdate) {
      try {
        await sql`
          INSERT INTO site_settings (key, value, "updatedAt")
          VALUES ('whatsapp_topics', ${JSON.stringify(topics)}, CURRENT_TIMESTAMP)
          ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value, "updatedAt" = CURRENT_TIMESTAMP
        `;
      } catch (err) {
        console.error('Failed to update whatsapp_topics in DB', err);
      }
    }

    return NextResponse.json({ success: true, data: topics });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
