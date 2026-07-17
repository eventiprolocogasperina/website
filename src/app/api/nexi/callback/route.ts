import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { markOrderPaidByCodTrans, getOrder } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';
import { sendTelegramNotification } from '@/lib/telegram';

const NEXI_MAC_KEY = process.env.NEXI_MAC_KEY || 'YOUR_SECRET_MAC_KEY';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const esito = searchParams.get('esito');
  const codTrans = searchParams.get('codTrans');
  const mac = searchParams.get('mac');
  const importo = searchParams.get('importo');
  const divisa = searchParams.get('divisa');
  const data = searchParams.get('data');
  const orario = searchParams.get('orario');
  const codAut = searchParams.get('codAut');

  if (!codTrans) {
    return NextResponse.json({ error: 'Missing codTrans' }, { status: 400 });
  }

  // Verify MAC signature per official Nexi XPAY formula:
  // SHA1(codTrans=<val>esito=<val>importo=<val>divisa=<val>data=<val>orario=<val>codAut=<val><SecretKey>)
  const macString = `codTrans=${codTrans}esito=${esito}importo=${importo}divisa=${divisa}data=${data}orario=${orario}codAut=${codAut}${NEXI_MAC_KEY}`;
  const calculatedMac = crypto.createHash('sha1').update(macString).digest('hex');

  if (mac !== calculatedMac) {
    console.error(`Invalid MAC signature. Expected ${calculatedMac}, got ${mac}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  if (esito === 'OK') {
    try {
      // The codTrans IS the orderId (we generate it as 30-chars max in /api/orders)
      const orderId = codTrans;

      await markOrderPaidByCodTrans(codTrans);

      // Fetch full order with tickets and send PDF email (non-blocking on failure)
      try {
        const order = await getOrder(orderId);
        if (order) {
          await sendTicketsEmail(order);
          
          const ticketsSummary = order.tickets.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const ticketsList = Object.entries(ticketsSummary).map(([type, count]) => `${count}x ${type}`).join(', ');

          await sendTelegramNotification(
            `✅ <b>Ordine PAGATO (Nexi)</b>\n\n` +
            `👤 <b>Nome:</b> ${order.buyerName}\n` +
            `📧 <b>Email:</b> ${order.buyerEmail}\n` +
            `📞 <b>Tel:</b> ${order.buyerPhone || 'N/D'}\n` +
            `🎟 <b>Biglietti:</b> ${ticketsList}\n` +
            `💰 <b>Totale:</b> €${order.totalAmount.toFixed(2)}\n` +
            `💳 <b>Transazione:</b> ${codTrans}`
          );
        }
      } catch (emailErr) {
        console.error('Email or Telegram notification failed (non-fatal):', emailErr);
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
      return NextResponse.redirect(`${baseUrl}/assaggia-e-passeggia/success?order=${orderId}`);
    } catch (error) {
      console.error('Failed to process successful payment:', error);
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
    }
  } else {
    // Payment failed or cancelled
    try {
      const order = await getOrder(codTrans);
      if (order) {
        await sendTelegramNotification(
          `❌ <b>Pagamento FALLITO o ANNULLATO</b>\n\n` +
          `👤 <b>Nome:</b> ${order.buyerName}\n` +
          `💰 <b>Totale:</b> €${order.totalAmount.toFixed(2)}\n` +
          `💳 <b>Transazione:</b> ${codTrans}`
        );
      }
    } catch (e) {
      console.error(e);
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
    return NextResponse.redirect(`${baseUrl}/assaggia-e-passeggia/ticket?error=payment_failed`);
  }
}
