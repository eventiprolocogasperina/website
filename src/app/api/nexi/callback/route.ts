import { NextResponse } from 'next/server';
import { getOrder } from '@/lib/data/tickets';
import { confirmLegacyPayment } from '@/lib/tickets/legacyPayment';
import { sendTelegramNotification } from '@/lib/telegram';
import { verifyResultMac } from '@/server/integrations/nexi/mac';
import { log } from '@/server/log';

// Ritorno del browser dopo il pagamento (`url`). Nexi conferma anche con /api/nexi/notifica (`urlpost`).
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

  // Nessuna chiave di ripiego: senza NEXI_MAC_KEY nessun pagamento può essere confermato.
  const NEXI_MAC_KEY = process.env.NEXI_MAC_KEY;
  if (!NEXI_MAC_KEY) {
    console.error('nexi/callback: NEXI_MAC_KEY non impostata');
    return NextResponse.json({ error: 'Pagamenti non configurati' }, { status: 500 });
  }

  if (!codTrans) {
    return NextResponse.json({ error: 'Missing codTrans' }, { status: 400 });
  }

  // Same Nexi XPay formula and timing-safe check as the new flow. Never log the expected MAC:
  // anyone reading the logs could use it to forge a paid result.
  const fields = { codTrans, esito, importo, divisa, data, orario, codAut, mac };
  const params = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v ?? undefined]));
  if (!verifyResultMac(params, NEXI_MAC_KEY)) {
    console.error(`nexi/callback: MAC non valido per codTrans ${codTrans}`);
    // A customer may have paid and still be rejected here: alert on Telegram (order code only, no personal data).
    log.error('Nexi: firma non valida, pagamento non confermato', { source: 'browser', codTrans });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  if (esito === 'OK') {
    try {
      return NextResponse.redirect(await confirmLegacyPayment(codTrans, importo));
    } catch (error) {
      console.error('Failed to process successful payment:', error);
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
    }
  } else {
    // Payment failed or cancelled
    try {
      const order = await getOrder(codTrans);
      if (order) {
        const isZuccaland = order.tickets.some(t => t.eventId?.includes('zuccaland'));
        const eventLabel = isZuccaland ? '🎃 Zuccaland' : '🍷 Assaggia & Passeggia';
        await sendTelegramNotification(
          `❌ <b>Pagamento FALLITO o ANNULLATO</b>\n\n` +
          `🎪 <b>Evento:</b> ${eventLabel}\n` +
          `💰 <b>Totale:</b> €${order.totalAmount.toFixed(2)}\n` +
          `💳 <b>Transazione:</b> ${codTrans}`
        );
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
        const failPath = isZuccaland
          ? `/zuccaland?error=payment_failed`
          : `/assaggia-e-passeggia/edizione-2026/ticket?error=payment_failed`;
        return NextResponse.redirect(`${baseUrl}${failPath}`);
      }
    } catch (e) {
      console.error(e);
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
    return NextResponse.redirect(`${baseUrl}/assaggia-e-passeggia/edizione-2026/ticket?error=payment_failed`);
  }
}
