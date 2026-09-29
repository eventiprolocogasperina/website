import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(request: Request) {
  try {
    const { ticketId } = await request.json();

    if (!ticketId) {
      return NextResponse.json({ success: false, message: 'Ticket ID mancante' }, { status: 400 });
    }

    const sql = neon(process.env.POSTGRES_URL!);

    await sql`
      UPDATE tickets 
      SET "isCheckedIn" = false, "checkInTime" = NULL 
      WHERE id = ${ticketId}
    `;

    return NextResponse.json({ success: true, message: 'Validazione annullata con successo' });
  } catch (error: any) {
    console.error('Ticket unverify error:', error);
    return NextResponse.json({ success: false, message: 'Errore interno del server' }, { status: 500 });
  }
}
