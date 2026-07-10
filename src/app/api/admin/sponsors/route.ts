import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
  tier: 'gold' | 'silver' | 'bronze' | 'partner';
  active: boolean;
  sort_order: number;
  createdAt?: string;
}

// GET /api/admin/sponsors — list all sponsors (even inactive)
export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM sponsors ORDER BY sort_order ASC, "createdAt" DESC`;
    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/admin/sponsors — create a new sponsor
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, logo_url, website_url, tier, active, sort_order } = body;

    if (!name || !logo_url) {
      return NextResponse.json({ error: 'name e logo_url sono obbligatori' }, { status: 400 });
    }

    const sql = getDb();
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO sponsors (id, name, logo_url, website_url, tier, active, sort_order)
      VALUES (${id}, ${name}, ${logo_url}, ${website_url || null}, ${tier || 'bronze'}, ${active ?? true}, ${sort_order ?? 0})
    `;
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT /api/admin/sponsors — update a sponsor
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, logo_url, website_url, tier, active, sort_order } = body;

    if (!id) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 });

    const sql = getDb();
    await sql`
      UPDATE sponsors
      SET name = ${name}, logo_url = ${logo_url}, website_url = ${website_url || null},
          tier = ${tier}, active = ${active}, sort_order = ${sort_order ?? 0}
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/admin/sponsors?id=... — delete a sponsor
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obbligatorio' }, { status: 400 });

    const sql = getDb();
    await sql`DELETE FROM sponsors WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
