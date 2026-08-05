import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  return neon(process.env.POSTGRES_URL!);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await req.json();
    const { code, type, value, max_uses, max_tickets, expiry_date, active } = data;

    if (!code || !type || value === undefined) {
      return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 });
    }

    const sql = getDb();

    await sql`
      UPDATE discounts 
      SET 
        code = ${code.toUpperCase()}, 
        type = ${type}, 
        value = ${value}, 
        max_uses = ${max_uses || 0}, 
        max_tickets = ${max_tickets || 0},
        expiry_date = ${expiry_date || null}, 
        active = ${active ?? true}
      WHERE id = ${(await params).id}
    `;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.message.includes('unique constraint')) {
      return NextResponse.json({ error: 'Il codice sconto esiste già' }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sql = getDb();
    await sql`DELETE FROM discounts WHERE id = ${(await params).id}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
