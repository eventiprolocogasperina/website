import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { crypto } from 'crypto';

function getDb() {
  return neon(process.env.POSTGRES_URL!);
}

export async function GET() {
  try {
    const sql = getDb();
    const discounts = await sql`SELECT * FROM discounts ORDER BY created_at DESC`;
    return NextResponse.json(discounts);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { code, type, value, max_uses, expiry_date, active } = data;

    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 });
    }

    const sql = getDb();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const id = require('crypto').randomUUID();

    await sql`
      INSERT INTO discounts (id, code, type, value, max_uses, current_uses, expiry_date, active)
      VALUES (${id}, ${code.toUpperCase()}, ${type}, ${value}, ${max_uses || 0}, 0, ${expiry_date || null}, ${active ?? true})
    `;

    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    if (e.message.includes('unique constraint')) {
      return NextResponse.json({ error: 'Il codice sconto esiste già' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
