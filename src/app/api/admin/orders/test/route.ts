import { NextResponse } from 'next/server';
import { createOrderWithTickets, markOrderPaid } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';
import { sendTelegramNotification } from '@/lib/telegram';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const orderId = crypto.randomBytes(15).toString('hex');
    const email = 'vono.niccolo@gmail.com';
    
    // Create tickets
    const tickets = [
      { eventId: 'assaggia-e-passeggia-2024', type: 'Ticket Intero', price: 25 },
      { eventId: 'assaggia-e-passeggia-2024', type: 'Extra wine', price: 5 }
    ];

    // Total amount is 0 as per user request to not generate revenue, but we show prices in the UI/email
    // Actually, if we set totalAmount to 0, it will not generate revenue in stats.
    const order = {
      id: orderId,
      buyerName: 'TEST Buyer',
      buyerEmail: email,
      buyerPhone: '+390000000000',
      totalAmount: 0,
      status: 'PENDING' as const,
      notes: 'TEST ORDER'
    };

    await createOrderWithTickets(order, tickets);
    await markOrderPaid(orderId);

    // Fetch the paid order to send email correctly
    // Re-importing getOrder locally to avoid circular dependencies if any
    const { getOrder } = await import('@/lib/data/tickets');
    const paidOrder = await getOrder(orderId);
    
    if (paidOrder) {
      await sendTicketsEmail(paidOrder);
      
      const ticketsSummary = paidOrder.tickets.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const ticketsList = Object.entries(ticketsSummary).map(([type, count]) => `${count}x ${type}`).join(', ');

      await sendTelegramNotification(
        `✅ <b>[TEST] Ordine PAGATO</b>\n\n` +
        `👤 <b>Nome:</b> ${paidOrder.buyerName}\n` +
        `📧 <b>Email:</b> ${paidOrder.buyerEmail}\n` +
        `📞 <b>Tel:</b> ${paidOrder.buyerPhone || 'N/D'}\n` +
        `🎟 <b>Biglietti:</b> ${ticketsList}\n` +
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
