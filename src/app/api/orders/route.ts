import { NextResponse } from 'next/server';
import { createOrderWithTickets, markOrderPaid, getOrder, parseOrderNotes, getZuccalandDateCounts } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';
import { sendTelegramNotification } from '@/lib/telegram';
import { getPageContent, DEFAULT_ZUCCALAND_CONTENT, type ZuccalandContent } from '@/lib/data/pages';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { eventId, buyerName, buyerEmail, buyerPhone, totalAmount, discountId, cart, notes } = data;

    if (!buyerName || !buyerEmail || !buyerPhone || totalAmount === undefined || !cart || cart.length === 0) {
      return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 });
    }

    // Check Zuccaland date capacity and Sold Out status
    if (eventId === 'zuccaland-2026') {
      const parsed = parseOrderNotes(notes || '');
      if (parsed.dayKey === '10' || parsed.dayKey === '11') {
        const pageContent = await getPageContent<ZuccalandContent>('zuccaland', DEFAULT_ZUCCALAND_CONTENT);
        const dayLimit = pageContent.dateLimits?.[parsed.dayKey];
        const dayName = parsed.dayKey === '10' ? 'Sabato 10 Ottobre' : 'Domenica 11 Ottobre';

        if (dayLimit?.manualSoldOut) {
          return NextResponse.json({
            error: `I biglietti per la data di ${dayName} sono esauriti (Sold Out).`
          }, { status: 400 });
        }

        if (dayLimit?.enabled) {
          const counts = await getZuccalandDateCounts();
          const currentSold = counts[parsed.dayKey].admissionTickets;
          const requestedAdmission = cart.reduce((sum: number, item: any) => {
            const isExtra = item.type.toLowerCase().includes('you pick') || item.type.toLowerCase().includes('laboratorio');
            return sum + (isExtra ? 0 : (item.quantity || 0));
          }, 0);

          if (currentSold + requestedAdmission > dayLimit.maxTickets) {
            const left = Math.max(0, dayLimit.maxTickets - currentSold);
            return NextResponse.json({
              error: left > 0
                ? `Posti insufficienti per la data selezionata (${dayName}). Rimangono solo ${left} bigliett${left === 1 ? 'o' : 'i'}.`
                : `I biglietti per la data di ${dayName} sono esauriti (Sold Out).`
            }, { status: 400 });
          }
        }
      }
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
      notes: notes || null,
      status: isFree ? 'PAID' : 'PENDING'
    }, ticketsToCreate);

    const ticketsSummary = cart.map((item: any) => `${item.quantity}x ${item.type}`).join(', ');
    const notesSummary = notes ? `\n📝 <b>Note / Attività:</b> ${notes}` : '';

    if (isFree) {
      await sendTelegramNotification(
        `🎉 <b>Nuovo Ordine (OMAGGIO)</b>\n\n` +
        `👤 <b>Nome:</b> ${buyerName}\n` +
        `📧 <b>Email:</b> ${buyerEmail}\n` +
        `📞 <b>Tel:</b> ${buyerPhone}\n` +
        `🎟 <b>Biglietti:</b> ${ticketsSummary}\n` +
        notesSummary + '\n' +
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
        notesSummary + '\n' +
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
