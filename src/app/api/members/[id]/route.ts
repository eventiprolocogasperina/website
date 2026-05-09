import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = getDb();
    const body = await request.json();

    const { nome, cognome, email, tipo, dataIscrizione, stato } = body;

    const result = await sql`
      UPDATE members SET
        nome = COALESCE(${nome}, nome),
        cognome = COALESCE(${cognome}, cognome),
        email = COALESCE(${email}, email),
        tipo = COALESCE(${tipo}, tipo),
        "dataIscrizione" = COALESCE(${dataIscrizione}, "dataIscrizione"),
        stato = COALESCE(${stato}, stato)
      WHERE id = ${id}
      RETURNING *;
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('API /members/[id] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sql = getDb();

    const result = await sql`
      DELETE FROM members WHERE id = ${id} RETURNING id;
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('API /members/[id] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
}
