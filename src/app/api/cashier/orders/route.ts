import { NextResponse } from 'next/server';
import { createCashierOrder, getCashierOrders, voidCashierOrder } from '@/lib/data/cashier';
import { broadcastCashierEvent } from '../realtime/route';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      eventId,
      eventName,
      cassaName,
      operatorName,
      totalAmount,
      paymentMethod,
      cashReceived,
      cashChange,
      omaggioNote,
      orderNote,
      items,
      isMasterCassa  // true = cassa principale (biglietti progressivi), false = ricevuta semplice
    } = data;

    const finalEventId = eventId || data.id;
    const finalEventName = eventName || data.name;

    if (!finalEventId || !finalEventName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Dati ordine incompleti' },
        { status: 400 }
      );
    }

    if (!['CONTANTI', 'POS', 'OMAGGIO'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Metodo di versamento non valido' },
        { status: 400 }
      );
    }

    const order = await createCashierOrder({
      eventId: finalEventId,
      eventName: finalEventName,
      cassaName: cassaName || 'Cassa 1',
      operatorName,
      totalAmount: paymentMethod === 'OMAGGIO' ? 0 : Number(totalAmount || 0),
      paymentMethod,
      cashReceived: paymentMethod === 'CONTANTI' ? Number(cashReceived || 0) : undefined,
      cashChange: paymentMethod === 'CONTANTI' ? Number(cashChange || 0) : undefined,
      omaggioNote: paymentMethod === 'OMAGGIO' ? (omaggioNote || orderNote) : (orderNote || undefined),
      items,
      isMasterCassa: isMasterCassa !== false  // undefined/true → master, false → ricevuta semplice
    });

    const host = request.headers.get('host') || 'www.prolocogasperina.it';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const receiptUrl = `${protocol}://${host}/ricevuta/${order.id}`;

    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(receiptUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
    } catch (err) {
      console.error('Failed to generate QR code data URL:', err);
    }

    try {
      broadcastCashierEvent('order_created', { order });
    } catch { /* ignore */ }

    return NextResponse.json({ success: true, order, receiptUrl, qrCodeDataUrl });
  } catch (error: any) {
    console.error('Failed to create cashier order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const cassaName = searchParams.get('cassaName') || undefined;

    if (!eventId) {
      return NextResponse.json({ success: false, error: 'eventId richiesto' }, { status: 400 });
    }

    const orders = await getCashierOrders(eventId, { cassaName, limit: 50 });
    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Failed to get cashier orders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId richiesto' }, { status: 400 });
    }
    await voidCashierOrder(orderId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to void cashier order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
