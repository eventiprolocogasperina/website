import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function GET() {
  try {
    const sql = getDb();
    const members = await sql`SELECT * FROM members ORDER BY "createdAt" DESC`;
    return NextResponse.json(members);
  } catch (error) {
    console.error('API /members GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sql = getDb();
    const body = await request.json();

    const id = body.id || Date.now().toString();
    const { nome, cognome, email, tipo, dataIscrizione, stato } = body;

    const result = await sql`
      INSERT INTO members (id, nome, cognome, email, tipo, "dataIscrizione", stato)
      VALUES (${id}, ${nome}, ${cognome}, ${email}, ${tipo}, ${dataIscrizione}, ${stato})
      RETURNING *;
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('API /members POST error:', error);
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
}
