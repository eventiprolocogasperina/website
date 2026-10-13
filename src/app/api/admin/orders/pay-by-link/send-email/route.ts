import { NextResponse } from 'next/server';
import { getOrder } from '@/lib/data/tickets';
import { sendPayLinkEmail } from '@/lib/tickets/sendPayLinkEmail';

export async function POST(req: Request) {
  try {
    const { subOrderId, orderId: rawOrderId } = await req.json();
    const targetId = subOrderId || rawOrderId;

    if (!targetId) {
      return NextResponse.json({ error: 'ID ordine mancante' }, { status: 400 });
    }

    const order = await getOrder(targetId);
    if (!order) {
      return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
    }

    // Estrai info eventuale ordine genitore
    const match = order.notes?.match(/\[INTEGRAZIONE_PARENT:([^\]]+)\]/);
    const parentOrderId = match ? match[1] : '';
    const parentOrder = parentOrderId ? await getOrder(parentOrderId) : null;

    await sendPayLinkEmail(order, { parentOrder });

    return NextResponse.json({ success: true, message: `Email inviata con successo a ${order.buyerEmail}` });
  } catch (err: any) {
    console.error('Send pay-by-link email error:', err);
    return NextResponse.json({ error: err.message || 'Errore durante l\'invio dell\'email' }, { status: 500 });
  }
}
