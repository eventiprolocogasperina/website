import { NextResponse } from 'next/server';
import { createOrderWithTickets, markOrderPaid, getOrder } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';
import { sendPayLinkEmail } from '@/lib/tickets/sendPayLinkEmail';
import { sendTelegramNotification } from '@/lib/telegram';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { 
      eventId = 'zuccaland-2026',
      eventDate,
      buyerName, 
      buyerEmail, 
      buyerPhone, 
      cart, 
      numChildren = 0,
      activities = [],
      notes = '',
      paymentMode = 'PAY_BY_LINK' // 'PAY_BY_LINK' | 'MARK_PAID'
    } = data;

    if (!buyerName || !buyerEmail || !cart || cart.length === 0) {
      return NextResponse.json({ error: 'Dati incompleti (nome, email e biglietti/servizi sono obbligatori)' }, { status: 400 });
    }

    const totalAmount = cart.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);

    const isZuccaland = eventId.includes('zuccaland');
    const defaultDate = isZuccaland ? 'Sabato 17 Ottobre 2026' : '10 Agosto 2026';
    const chosenDate = eventDate || defaultDate;

    // Formattazione note strutturate
    const noteParts: string[] = [];
    if (chosenDate) noteParts.push(`Data: ${chosenDate}`);
    const totalTicketsCount = cart.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);
    if (numChildren > 0) noteParts.push(`Bambini: ${numChildren}/${totalTicketsCount}`);
    if (activities && activities.length > 0) noteParts.push(`Attività [Bambini]: ${activities.join(', ')}`);
    if (notes?.trim()) noteParts.push(`Note: ${notes.trim()}`);
    noteParts.push(paymentMode === 'PAY_BY_LINK' ? '[CREATO MANUALMENTE DA CMS - PAY-BY-LINK]' : '[CREATO MANUALMENTE DA CMS - SALDATO]');
    const formattedNotes = noteParts.join(' | ');

    // Generazione ID ordine compatibile con Nexi (max 30 caratteri alfanumerici senza trattini)
    const orderId = crypto.randomUUID().replace(/-/g, '').substring(0, 30);

    const ticketsToCreate = [];
    for (const item of cart) {
      for (let i = 0; i < (item.quantity || 0); i++) {
        ticketsToCreate.push({
          eventId,
          type: item.type,
          price: Number(item.price),
        });
      }
    }

    const shouldMarkPaid = paymentMode === 'MARK_PAID' || totalAmount === 0;

    await createOrderWithTickets({
      id: orderId,
      buyerName,
      buyerEmail,
      buyerPhone: buyerPhone || '',
      totalAmount,
      notes: formattedNotes,
      status: shouldMarkPaid ? 'PAID' : 'PENDING'
    }, ticketsToCreate);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
    const payUrl = `${baseUrl}/paga/${orderId}`;

    if (shouldMarkPaid) {
      await markOrderPaid(orderId);
      const order = await getOrder(orderId);
      if (order) {
        await sendTicketsEmail(order);
      }
      sendTelegramNotification(
        `✅ <b>Nuovo Ordine Manuale EMESSO & PAGATO</b>\n\n` +
        `🎪 <b>Evento:</b> ${isZuccaland ? '🎃 Zuccaland 2026' : '🍷 Assaggia & Passeggia'}\n` +
        `👤 <b>Cliente:</b> ${buyerName}\n` +
        `📧 <b>Email:</b> ${buyerEmail}\n` +
        `📞 <b>Tel:</b> ${buyerPhone || 'N/D'}\n` +
        `🗓 <b>Data:</b> ${chosenDate}\n` +
        `🎟 <b>Biglietti:</b> ${ticketsToCreate.length}\n` +
        `💰 <b>Totale:</b> €${totalAmount.toFixed(2)}\n` +
        `🆔 <b>Ordine:</b> #${orderId.substring(0, 8).toUpperCase()}`
      ).catch(err => console.error('Telegram notification error:', err));

      return NextResponse.json({ 
        success: true, 
        orderId, 
        paymentMode: 'MARK_PAID',
        message: 'Ordine creato e biglietti inviati con successo via email!' 
      });
    } else {
      // paymentMode === 'PAY_BY_LINK'
      const order = await getOrder(orderId);
      if (order) {
        await sendPayLinkEmail(order);
      }
      return NextResponse.json({ 
        success: true, 
        orderId, 
        payUrl,
        paymentMode: 'PAY_BY_LINK',
        message: `Ordine creato e link di pagamento inviato con successo a ${buyerEmail}!` 
      });
    }
  } catch (e: any) {
    console.error('Error creating manual order:', e);
    return NextResponse.json({ error: e.message || 'Errore durante la creazione dell\'ordine' }, { status: 500 });
  }
}
