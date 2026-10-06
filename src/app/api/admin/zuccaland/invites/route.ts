import { NextResponse } from 'next/server';
import { createOrderWithTickets, getOrder } from '@/lib/data/tickets';
import { sendZuccalandInviteEmail } from '@/lib/tickets/sendZuccalandInviteEmail';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      buyerName,
      buyerEmail,
      buyerPhone,
      eventDateLabel, // e.g. "Domenica 25 Ottobre 2026"
      inviteCount = 1,
      customNotes, // e.g. "Invito omaggio. Eventuali servizi aggiuntivi..."
    } = body;

    if (!buyerName || !buyerEmail) {
      return NextResponse.json(
        { success: false, error: 'Nome e Email sono campi obbligatori' },
        { status: 400 }
      );
    }

    const orderId = 'zinv_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const dateStr = eventDateLabel || 'Domenica 25 Ottobre 2026';
    const notesContent = `INVITO UFFICIALE ZUCCALAND | Data: ${dateStr} | Ingressi: ${inviteCount} | ${customNotes || ''}`;

    // Prepare tickets list
    const tickets = [];
    for (let i = 0; i < Number(inviteCount || 1); i++) {
      tickets.push({
        eventId: 'zuccaland-2026',
        type: 'Ingresso Omaggio Zuccaland',
        price: 0,
      });
    }

    // 1. Create order & tickets in DB
    await createOrderWithTickets(
      {
        id: orderId,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim().toLowerCase(),
        buyerPhone: buyerPhone ? buyerPhone.trim() : undefined,
        totalAmount: 0,
        status: 'PAID',
        notes: notesContent,
      },
      tickets
    );

    // 2. Retrieve order with generated tickets & QR code
    const fullOrder = await getOrder(orderId);
    if (!fullOrder || fullOrder.tickets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Errore durante la creazione dei biglietti' },
        { status: 500 }
      );
    }

    const primaryQrCode = fullOrder.tickets[0].qrCodeData;
    const orderRef = orderId.replace('zinv_', '').substring(0, 8).toUpperCase();

    // 3. Send email without PDF, with embedded QR code
    const emailRes = await sendZuccalandInviteEmail({
      recipientName: buyerName.trim(),
      recipientEmail: buyerEmail.trim().toLowerCase(),
      recipientPhone: buyerPhone ? buyerPhone.trim() : undefined,
      eventDateLabel: dateStr,
      inviteCount: Number(inviteCount || 1),
      customNotes: customNotes ? customNotes.trim() : 'Eventuali servizi e attività aggiuntivi possono essere acquistate in loco dietro un contributo libero.',
      orderRef,
      primaryQrCode,
    });

    return NextResponse.json({
      success: true,
      orderId,
      orderRef,
      primaryQrCode,
      emailSent: emailRes.success,
      emailError: emailRes.error ? String(emailRes.error) : undefined,
    });
  } catch (err: any) {
    console.error('Error creating Zuccaland invitation:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Errore server durante la creazione dell\'invito' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT 
        o.id,
        o."buyerName",
        o."buyerEmail",
        o."buyerPhone",
        o."totalAmount",
        o.status,
        o."createdAt",
        o.notes,
        COUNT(t.id) as "ticketCount"
      FROM orders o
      LEFT JOIN tickets t ON o.id = t."orderId"
      WHERE o.notes ILIKE '%INVITO%' OR o.notes ILIKE '%zuccaland%'
      GROUP BY o.id
      ORDER BY o."createdAt" DESC
      LIMIT 100
    `;

    return NextResponse.json({ success: true, invites: rows });
  } catch (err: any) {
    console.error('Error fetching Zuccaland invitations:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Errore caricamento inviti' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId richiesto' }, { status: 400 });
    }

    const fullOrder = await getOrder(orderId);
    if (!fullOrder) {
      return NextResponse.json({ success: false, error: 'Ordine invito non trovato' }, { status: 404 });
    }

    const primaryQrCode = fullOrder.tickets[0]?.qrCodeData || fullOrder.id;
    const orderRef = fullOrder.id.replace('zinv_', '').substring(0, 8).toUpperCase();

    // Extract date label from notes if possible
    let eventDateLabel = 'Domenica 25 Ottobre 2026';
    if (fullOrder.notes?.includes('Data:')) {
      const match = fullOrder.notes.match(/Data:\s*([^|]+)/);
      if (match) eventDateLabel = match[1].trim();
    }

    let customNotes = 'Eventuali servizi e attività aggiuntivi possono essere acquistate in loco dietro un contributo libero.';
    if (fullOrder.notes?.includes('|')) {
      const parts = fullOrder.notes.split('|');
      if (parts.length >= 3) customNotes = parts.slice(2).join('|').trim();
    }

    const emailRes = await sendZuccalandInviteEmail({
      recipientName: fullOrder.buyerName,
      recipientEmail: fullOrder.buyerEmail,
      recipientPhone: fullOrder.buyerPhone,
      eventDateLabel,
      inviteCount: fullOrder.tickets.length || 1,
      customNotes,
      orderRef,
      primaryQrCode,
    });

    return NextResponse.json({
      success: true,
      emailSent: emailRes.success,
      emailError: emailRes.error ? String(emailRes.error) : undefined,
    });
  } catch (err: any) {
    console.error('Error resending invitation email:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Errore reinvio email' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId richiesto' }, { status: 400 });
    }

    const sql = getDb();
    await sql`DELETE FROM tickets WHERE "orderId" = ${orderId}`;
    await sql`DELETE FROM orders WHERE id = ${orderId}`;

    return NextResponse.json({ success: true, message: 'Invito eliminato con successo' });
  } catch (err: any) {
    console.error('Error deleting invitation:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Errore durante l\'eliminazione dell\'invito' },
      { status: 500 }
    );
  }
}
