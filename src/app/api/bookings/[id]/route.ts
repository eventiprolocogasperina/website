import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { checkedIn, stato } = body;

    const sql = neon(process.env.POSTGRES_URL!);

    if (checkedIn !== undefined && stato !== undefined) {
      await sql`
        UPDATE bookings 
        SET "checkedIn" = ${checkedIn}, stato = ${stato}
        WHERE id = ${id}
      `;
    } else if (checkedIn !== undefined) {
      await sql`
        UPDATE bookings 
        SET "checkedIn" = ${checkedIn}
        WHERE id = ${id}
      `;
    } else if (stato !== undefined) {
      await sql`
        UPDATE bookings 
        SET stato = ${stato}
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const sql = neon(process.env.POSTGRES_URL!);

    // Get booking details first to know how many participants to decrement
    const bookings = await sql`SELECT event_id, partecipanti FROM bookings WHERE id = ${id}`;
    if (bookings.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const { event_id, partecipanti } = bookings[0];

    // 1. Delete booking
    await sql`DELETE FROM bookings WHERE id = ${id}`;

    // 2. Decrement registeredCount
    await sql`
      UPDATE events 
      SET "registeredCount" = GREATEST(0, "registeredCount" - ${partecipanti})
      WHERE id = ${event_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
