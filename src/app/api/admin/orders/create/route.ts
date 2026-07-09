import { NextResponse } from 'next/server';
import { createOrderWithTickets, markOrderPaid, getOrder } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';
import { crypto } from 'crypto';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { buyerName, buyerEmail, buyerPhone, totalAmount, cart, note } = data;

    if (!buyerName || !buyerEmail || !cart || cart.length === 0) {
      return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 });
    }

    const ticketsToCreate = [];
    for (const item of cart) {
      for (let i = 0; i < item.quantity; i++) {
        ticketsToCreate.push({
          eventId: 'assaggia-passeggia',
          type: item.type,
          price: item.price,
        });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const orderId = require('crypto').randomUUID();

    await createOrderWithTickets({
      id: orderId,
      buyerName,
      buyerEmail,
      buyerPhone,
      totalAmount,
      status: 'PENDING'
    }, ticketsToCreate);

    await markOrderPaid(orderId);
    
    const order = await getOrder(orderId);
    if (order) {
      await sendTicketsEmail(order);
    }

    return NextResponse.json({ success: true, orderId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
