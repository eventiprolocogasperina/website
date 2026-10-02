import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrder, createOrderWithTickets } from '@/lib/data/tickets';
import { sendTelegramNotification } from '@/lib/telegram';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
      parentOrderId, 
      items, 
      addedChildren = 0, 
      selectedActivities = [], 
      customNote = '' 
    } = data;

    if (!parentOrderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Dati incompleti: ordine principale o servizi mancanti' }, { status: 400 });
    }

    const parentOrder = await getOrder(parentOrderId);
    if (!parentOrder) {
      return NextResponse.json({ error: 'Ordine principale non trovato' }, { status: 404 });
    }

    // Calcolo importo totale per gli extra
    const validItems = items.filter(it => it.quantity > 0 && it.price >= 0);
    const totalAmount = validItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);

    if (totalAmount <= 0) {
      return NextResponse.json({ 
        error: 'L\'importo totale deve essere superiore a €0.00 per generare un link di pagamento Nexi.' 
      }, { status: 400 });
    }

    // Determina l'eventId di riferimento (da parentOrder)
    const eventId = parentOrder.tickets[0]?.eventId || 'zuccaland-2026';
    const isZuccaland = eventId.includes('zuccaland');

    // Genera un ID univoco compatibile Nexi (max 30 caratteri alfanumerici senza trattini)
    const subOrderId = crypto.randomUUID().replace(/-/g, '').substring(0, 30);

    // Dettaglio servizi formattato per note
    const itemsSummary = validItems.map(it => `${it.quantity}x ${it.type} (€${(it.price * it.quantity).toFixed(2)})`).join(', ');
    
    let subOrderNotes = `[INTEGRAZIONE_PARENT:${parentOrderId}] | Servizi: ${itemsSummary}`;
    if (isZuccaland) {
      if (addedChildren > 0) {
        subOrderNotes += ` | +${addedChildren} Bambin${addedChildren === 1 ? 'o' : 'i'}`;
      }
      if (selectedActivities.length > 0) {
        subOrderNotes += ` | Laboratori gratuiti bimbi: ${selectedActivities.join(', ')}`;
      }
    }
    if (customNote && customNote.trim()) {
      subOrderNotes += ` | Nota: ${customNote.trim()}`;
    }

    // Crea i ticket da associare provvisoriamente al subOrder
    const ticketsToCreate: Array<{ eventId: string; type: string; price: number }> = [];
    for (const it of validItems) {
      for (let i = 0; i < it.quantity; i++) {
        ticketsToCreate.push({
          eventId,
          type: it.type,
          price: it.price,
        });
      }
    }

    await createOrderWithTickets({
      id: subOrderId,
      buyerName: parentOrder.buyerName,
      buyerEmail: parentOrder.buyerEmail,
      buyerPhone: parentOrder.buyerPhone,
      totalAmount,
      status: 'PENDING',
      notes: subOrderNotes,
    }, ticketsToCreate);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
    const payUrl = `${baseUrl}/paga/${subOrderId}`;

    // Notifica Telegram creazione integrazione
    sendTelegramNotification(
      `🔗 <b>Nuova Integrazione Creata (Pay-by-Link)</b>\n\n` +
      `🎪 <b>Evento:</b> ${isZuccaland ? '🎃 Zuccaland' : '🍷 Assaggia & Passeggia'}\n` +
      `👤 <b>Cliente:</b> ${parentOrder.buyerName}\n` +
      `📧 <b>Email:</b> ${parentOrder.buyerEmail}\n` +
      `📞 <b>Tel:</b> ${parentOrder.buyerPhone || 'N/D'}\n` +
      `🎟 <b>Servizi Aggiunti:</b> ${itemsSummary}\n` +
      (isZuccaland && addedChildren > 0 ? `👶 <b>Bambini Aggiunti:</b> +${addedChildren}\n` : '') +
      (isZuccaland && selectedActivities.length > 0 ? `🎨 <b>Laboratori Gratuiti:</b> ${selectedActivities.join(', ')}\n` : '') +
      `💰 <b>Importo da saldare:</b> €${totalAmount.toFixed(2)}\n` +
      `🔗 <b>Rif. Ordine:</b> #${parentOrderId.substring(0, 8).toUpperCase()}`
    ).catch(err => console.error('Telegram pay-by-link notification error:', err));

    return NextResponse.json({
      success: true,
      subOrderId,
      payUrl,
      totalAmount,
      items: validItems,
      buyerName: parentOrder.buyerName,
      buyerEmail: parentOrder.buyerEmail
    });
  } catch (err: any) {
    console.error('Pay-by-link creation error:', err);
    return NextResponse.json({ error: err.message || 'Errore durante la creazione del Pay-by-Link' }, { status: 500 });
  }
}
