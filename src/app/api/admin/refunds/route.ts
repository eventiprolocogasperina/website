import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { authorize, requirePermission } from '@/server/auth/context';
import { can } from '@/server/auth/permissions';

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function GET(request: Request) {
  const { ctx, denied } = await authorize('orders.read');
  if (denied) return denied;
  // L'IBAN lo vede solo chi ha refunds.view_iban (§8.3); agli altri arrivano le ultime 4 cifre.
  const showIban = can(ctx, 'refunds.view_iban');
  try {
    const { searchParams } = new URL(request.url);
    const eventSlug = searchParams.get('eventSlug');
    const sql = getDb();

    const query = eventSlug
      ? sql`SELECT * FROM refund_requests WHERE event_slug = ${eventSlug} ORDER BY created_at DESC`
      : sql`SELECT * FROM refund_requests ORDER BY created_at DESC`;

    const rows = await query;
    const refunds = showIban ? rows : rows.map((r) => ({ ...r, iban: r.iban ? `•••• ${String(r.iban).replace(/\s/g, '').slice(-4)}` : r.iban }));
    return NextResponse.json({ success: true, refunds });
  } catch (error: any) {
    console.error('Errore lettura richieste di rimborso:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = await requirePermission('orders.refund');
  if (denied) return denied;
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
  const denied = await requirePermission('orders.refund');
  if (denied) return denied;
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
