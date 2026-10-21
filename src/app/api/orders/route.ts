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
      if (['17', '18', '24', '25', '10', '11'].includes(parsed.dayKey)) {
        const pageContent = await getPageContent<ZuccalandContent>('zuccaland', DEFAULT_ZUCCALAND_CONTENT);
        const dayLimit = pageContent.dateLimits?.[parsed.dayKey as keyof typeof pageContent.dateLimits];
        const dayNames: Record<string, string> = {
          '17': 'Sabato 17 Ottobre',
          '18': 'Domenica 18 Ottobre',
          '24': 'Sabato 24 Ottobre',
          '25': 'Domenica 25 Ottobre',
          '10': 'Sabato 10 Ottobre',
          '11': 'Domenica 11 Ottobre'
        };
        const dayName = dayNames[parsed.dayKey] || parsed.dayKey;

        if (parsed.dayKey === '17' || parsed.dayKey === '18') {
          return NextResponse.json({
            error: `I biglietti per la data di ${dayName} non sono acquistabili sul sito in quanto riservati al recupero delle date del 10 e 11 Ottobre. Le nuove prenotazioni sono aperte per Domenica 25 Ottobre.`
          }, { status: 400 });
        }

        if (dayLimit && dayLimit.active === false) {
          return NextResponse.json({
            error: `Le prenotazioni per la data di ${dayName} non sono al momento aperte.`
          }, { status: 400 });
        }

        if (dayLimit?.manualSoldOut) {
          return NextResponse.json({
            error: `I biglietti per la data di ${dayName} sono esauriti (Sold Out).`
          }, { status: 400 });
        }

        if (dayLimit?.enabled) {
          const counts = await getZuccalandDateCounts();
          const currentSold = counts[parsed.dayKey as keyof typeof counts]?.admissionTickets || 0;
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

        // Check You-Pick tickets limit (50 tickets for Saturday 24)
        const requestedYouPick = cart.reduce((sum: number, item: any) => {
          const isExtra = item.type.toLowerCase().includes('you pick') || item.type.toLowerCase().includes('laboratorio');
          return sum + (isExtra ? (item.quantity || 0) : 0);
        }, 0);

        if (requestedYouPick > 0) {
          const maxYouPick = dayLimit?.maxYouPickTickets ?? (parsed.dayKey === '24' ? 50 : null);
          const isManualYouPickSoldOut = Boolean(dayLimit?.manualYouPickSoldOut);

          if (isManualYouPickSoldOut) {
            return NextResponse.json({
              error: `I biglietti You-Pick per la data di ${dayName} sono terminati.`
            }, { status: 400 });
          }

          if (maxYouPick !== null) {
            const counts = await getZuccalandDateCounts();
            const currentYouPickSold = counts[parsed.dayKey as keyof typeof counts]?.youPickTickets || 0;
            if (currentYouPickSold + requestedYouPick > maxYouPick) {
              const left = Math.max(0, maxYouPick - currentYouPickSold);
              return NextResponse.json({
                error: left > 0
                  ? `Disponibilità You-Pick insufficiente per ${dayName}. Rimangono solo ${left} bigliett${left === 1 ? 'o' : 'i'} You-Pick.`
                  : `I biglietti You-Pick per la data di ${dayName} sono terminati.`
              }, { status: 400 });
            }
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
