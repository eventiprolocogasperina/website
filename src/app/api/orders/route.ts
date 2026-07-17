import { NextResponse } from 'next/server';
import { createOrderWithTickets, markOrderPaid, getOrder } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { eventId, buyerName, buyerEmail, buyerPhone, totalAmount, discountId, cart } = data;

    if (!buyerName || !buyerEmail || !buyerPhone || totalAmount === undefined || !cart || cart.length === 0) {
      return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 });
    }

    // Nexi's codTrans allows max 30 alphanumeric characters without hyphens.
    // We generate a UUID, remove hyphens, and truncate to 30 chars.
    const orderId = crypto.randomUUID().replace(/-/g, '').substring(0, 30);
    
    const ticketsToCreate = [];
    for (const item of cart) {
      for (let i = 0; i < item.quantity; i++) {
        ticketsToCreate.push({
          eventId,
          type: item.type,
          price: item.price
        });
      }
    }

    const isFree = totalAmount === 0;

    await createOrderWithTickets({
      id: orderId,
      buyerName,
      buyerEmail,
      buyerPhone,
      totalAmount,
      discountId,
      status: isFree ? 'PAID' : 'PENDING'
    }, ticketsToCreate);

    const ticketsSummary = cart.map((item: any) => `${item.quantity}x ${item.type}`).join(', ');

    if (isFree) {
      await sendTelegramNotification(
        `🎉 <b>Nuovo Ordine (OMAGGIO)</b>\n\n` +
        `👤 <b>Nome:</b> ${buyerName}\n` +
        `📧 <b>Email:</b> ${buyerEmail}\n` +
        `📞 <b>Tel:</b> ${buyerPhone}\n` +
        `🎟 <b>Biglietti:</b> ${ticketsSummary}\n` +
        `💰 <b>Totale:</b> €0.00\n` +
        `✅ <b>Stato:</b> PAGATO (Omaggio)\n` +
        `🆔 <b>Ordine:</b> #${orderId.substring(0, 8).toUpperCase()}`
      );
      
      await markOrderPaid(orderId);
      const order = await getOrder(orderId);
      if (order) {
        await sendTicketsEmail(order);
      }
    } else {
      await sendTelegramNotification(
        `⏳ <b>Ordine Creato (In attesa di pagamento)</b>\n\n` +
        `👤 <b>Nome:</b> ${buyerName}\n` +
        `📧 <b>Email:</b> ${buyerEmail}\n` +
        `📞 <b>Tel:</b> ${buyerPhone}\n` +
        `🎟 <b>Biglietti:</b> ${ticketsSummary}\n` +
        `💰 <b>Totale:</b> €${totalAmount.toFixed(2)}\n` +
        `🔄 <b>Stato:</b> PENDING\n` +
        `🆔 <b>Ordine:</b> #${orderId.substring(0, 8).toUpperCase()}`
      );
    }

    return NextResponse.json({ success: true, orderId, status: isFree ? 'PAID' : 'PENDING' });
  } catch (error: any) {
    console.error('Failed to create order:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
