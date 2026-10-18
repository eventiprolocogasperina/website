import { NextResponse } from 'next/server';
import { createOrderWithTickets, markOrderPaid, getOrder, parseOrderNotes, getZuccalandDateCounts } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';
import { sendTelegramNotification } from '@/lib/telegram';
import { getPageContent, DEFAULT_ZUCCALAND_CONTENT, type ZuccalandContent } from '@/lib/data/pages';
import { priceCartForOrder } from '@/server/domain/pricing/priceCartForOrder';
import { PricingError, centsToEuro } from '@/server/domain/pricing/priceCart';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // totalAmount, cart[].price e lo sconto calcolato dal browser non vengono usati:
    // gli importi si ricalcolano qui dal listino ufficiale (priceCartForOrder).
    const { eventId, buyerName, buyerEmail, buyerPhone, totalAmount: clientTotal, discountId, discountCode, cart, notes } = data;

    if (!buyerName || !buyerEmail || !buyerPhone || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: 'Dati incompleti' }, { status: 400 });
    }

    let priced;
    try {
      priced = await priceCartForOrder({ eventId, lines: cart, discountCode, discountId });
    } catch (err) {
      if (err instanceof PricingError) {
        const message = err.code === 'INVALID_DISCOUNT'
          ? 'Il codice sconto non è più valido. Rimuovilo e riprova.'
          : 'Il carrello non è valido. Ricarica la pagina e riprova.';
        return NextResponse.json({ error: message, code: err.code }, { status: 400 });
      }
      throw err;
    }
    const totalAmount = centsToEuro(priced.totalCents);

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
      }
    }

    // Nexi's codTrans allows max 30 alphanumeric characters without hyphens.
    // We generate a UUID, remove hyphens, and truncate to 30 chars.
    const orderId = crypto.randomUUID().replace(/-/g, '').substring(0, 30);
    
    if (typeof clientTotal === 'number' && Math.round(clientTotal * 100) !== priced.totalCents) {
      console.warn(JSON.stringify({
        msg: 'orders: totale del client diverso da quello calcolato',
        orderId,
        clientTotalCents: Math.round(clientTotal * 100),
        serverTotalCents: priced.totalCents,
      }));
    }

    const ticketsToCreate = [];
    for (const line of priced.lines) {
      for (let i = 0; i < line.quantity; i++) {
        ticketsToCreate.push({
          eventId,
          type: line.type,
          price: centsToEuro(line.unitPriceCents)
        });
      }
    }

    // Gratuito solo se il totale calcolato è 0 (prodotti a prezzo 0 o sconto del 100% valido).
    const isFree = priced.totalCents === 0;

    // Si crea sempre PENDING: markOrderPaid (qui sotto per gli omaggi, nel callback Nexi per gli
    // altri) porta a PAID e conta l'utilizzo dello sconto una volta sola.
    await createOrderWithTickets({
      id: orderId,
      buyerName,
      buyerEmail,
      buyerPhone,
      totalAmount,
      discountId: priced.discountId,
      notes: notes || null,
      status: 'PENDING'
    }, ticketsToCreate);

    const ticketsSummary = priced.lines.map((line) => `${line.quantity}x ${line.type}`).join(', ');
    const notesSummary = notes ? `\n📝 <b>Note / Attività:</b> ${notes}` : '';

    // Telegram: solo codice ordine, biglietti e importi, nessun dato personale del cliente.
    if (isFree) {
      await sendTelegramNotification(
        `🎉 <b>Nuovo Ordine (OMAGGIO)</b>\n\n` +
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
