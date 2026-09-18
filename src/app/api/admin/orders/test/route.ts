import { NextResponse } from 'next/server';
import { createOrderWithTickets, markOrderPaid, getOrder } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';
import { sendTelegramNotification } from '@/lib/telegram';
import crypto from 'crypto';

export async function GET() {
  return NextResponse.json({ ok: true, timestamp: Date.now() });
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is okay
    }

    const eventId = body.eventId || 'zuccaland-2026';
    const email = body.email || 'vono.niccolo@gmail.com';
    const orderId = crypto.randomBytes(15).toString('hex');
    
    const isZuccaland = eventId.includes('zuccaland');

    // Create tickets based on event
    const tickets = isZuccaland ? [
      { eventId: 'zuccaland-2026', type: 'Ingresso Ordinario', price: 5 },
      { eventId: 'zuccaland-2026', type: 'Ingresso Ordinario', price: 5 },
      { eventId: 'zuccaland-2026', type: 'You Pick Lab', price: 3 },
    ] : [
      { eventId: 'assaggia-e-passeggia-2024', type: 'Ticket Intero', price: 25 },
      { eventId: 'assaggia-e-passeggia-2024', type: 'Extra wine', price: 5 }
    ];

    const notes = isZuccaland 
      ? 'Data: Sabato 10 Ottobre 2026 | Bambini: 1/2 | Attività [Solo bambini (1)]: Zucca in Vaso (3-7 anni), Zuccart (3-7 anni)'
      : 'TEST ORDER';

    // Total amount is 0 as per test requirement to avoid skewing real revenue stats
    const order = {
      id: orderId,
      buyerName: isZuccaland ? 'Niccolò Vono (TEST Zuccaland)' : 'TEST Buyer',
      buyerEmail: email,
      buyerPhone: '+393505757501',
      totalAmount: 0,
      status: 'PENDING' as const,
      notes: notes
    };

    await createOrderWithTickets(order, tickets);
    await markOrderPaid(orderId);

    // Fetch the paid order to send email correctly
    const paidOrder = await getOrder(orderId);
    
    if (paidOrder) {
      await sendTicketsEmail(paidOrder);
      
      const ticketsSummary = paidOrder.tickets.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const ticketsList = Object.entries(ticketsSummary).map(([type, count]) => `${count}x ${type}`).join(', ');

      await sendTelegramNotification(
        `🎃 <b>[TEST] Ordine Zuccaland CREATO & INVIATO</b>\n\n` +
        `👤 <b>Nome:</b> ${paidOrder.buyerName}\n` +
        `📧 <b>Email:</b> ${paidOrder.buyerEmail}\n` +
        `📞 <b>Tel:</b> ${paidOrder.buyerPhone || 'N/D'}\n` +
        `🎟 <b>Biglietti:</b> ${ticketsList}\n` +
        `🎨 <b>Note & Attività:</b> ${paidOrder.notes || 'N/D'}\n` +
        `💰 <b>Totale:</b> €${paidOrder.totalAmount.toFixed(2)}\n` +
        `💳 <b>Transazione:</b> TEST`
      );
    }

    return NextResponse.json({ success: true, orderId });
  } catch (err: any) {
    console.error('Test order creation failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
