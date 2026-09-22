import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventSlug = searchParams.get('eventSlug');
    const sql = getDb();

    let query = eventSlug
      ? sql`SELECT * FROM refund_requests WHERE event_slug = ${eventSlug} ORDER BY created_at DESC`
      : sql`SELECT * FROM refund_requests ORDER BY created_at DESC`;

    const refunds = await query;
    return NextResponse.json({ success: true, refunds });
  } catch (error: any) {
    console.error('Errore lettura richieste di rimborso:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID richiesta mancante.' }, { status: 400 });
    }

    const sql = getDb();

    await sql`
      UPDATE refund_requests
      SET 
        status = COALESCE(${status}, status),
        admin_notes = COALESCE(${adminNotes}, admin_notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true, message: 'Richiesta aggiornata con successo.' });
  } catch (error: any) {
    console.error('Errore aggiornamento richiesta di rimborso:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID richiesta mancante.' }, { status: 400 });
    }

    const sql = getDb();
    await sql`DELETE FROM refund_requests WHERE id = ${id}`;

    return NextResponse.json({ success: true, message: 'Richiesta eliminata.' });
  } catch (error: any) {
    console.error('Errore eliminazione richiesta rimborso:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
