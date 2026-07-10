import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

// GET /api/admin/settings — get all settings as key/value object
export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT key, value FROM site_settings`;
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key as string] = row.value as string;
    }
    return NextResponse.json({ success: true, data: settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/admin/settings — upsert settings (body: { key: value, ... })
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sql = getDb();

    for (const [key, value] of Object.entries(body)) {
      await sql`
        INSERT INTO site_settings (key, value, "updatedAt")
        VALUES (${key}, ${String(value)}, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, "updatedAt" = CURRENT_TIMESTAMP
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
