import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

// GET /api/zuccaland/alert — public status of postponement banner/popup
export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT key, value FROM site_settings
      WHERE key IN ('zuccaland_postponed_enabled', 'zuccaland_postponed_title', 'zuccaland_postponed_new_date', 'zuccaland_postponed_message')
    `;

    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key as string] = r.value as string;
    }

    return NextResponse.json({
      success: true,
      enabled: settings.zuccaland_postponed_enabled === 'true',
      title: settings.zuccaland_postponed_title || 'AVVISO IMPORTANTE: RINVIO PER METEO AVVERSO',
      newDate: settings.zuccaland_postponed_new_date || 'Domenica 25 Ottobre 2026',
      message: settings.zuccaland_postponed_message || "Causa condizioni meteo avverse accertate, l'evento Zuccaland è rinviato alla nuova data stabilita. I biglietti già acquistati rimangono 100% validi per la data di recupero.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, enabled: false }, { status: 500 });
  }
}

// POST /api/zuccaland/alert — update postponement alert settings
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { enabled, title, newDate, message } = body;

    const sql = getDb();

    const updates = [
      { key: 'zuccaland_postponed_enabled', value: enabled ? 'true' : 'false' },
      { key: 'zuccaland_postponed_title', value: title || 'AVVISO IMPORTANTE: RINVIO PER METEO AVVERSO' },
      { key: 'zuccaland_postponed_new_date', value: newDate || 'Domenica 25 Ottobre 2026' },
      { key: 'zuccaland_postponed_message', value: message || '' },
    ];

    for (const item of updates) {
      await sql`
        INSERT INTO site_settings (key, value, "updatedAt")
        VALUES (${item.key}, ${item.value}, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, "updatedAt" = CURRENT_TIMESTAMP
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
