import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
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
          // ─── GESTIONE INTEGRAZIONE ORDINE ESISTENTE (Pay-by-Link) ─────────
          const integrationMatch = order.notes?.match(/\[INTEGRAZIONE_PARENT:([^\]]+)\]/);
          if (integrationMatch) {
            const parentOrderId = integrationMatch[1];
            const parentOrder = await getOrder(parentOrderId);

            if (parentOrder && process.env.POSTGRES_URL) {
              const sql = neon(process.env.POSTGRES_URL);

              // 1. Trasferisci i ticket generati al parentOrder
              await sql`
                UPDATE tickets 
                SET "orderId" = ${parentOrderId} 
                WHERE "orderId" = ${orderId}
              `;

              // 2. Calcola nuovo importo totale
              const newTotal = Number(parentOrder.totalAmount) + Number(order.totalAmount);

              // 3. Raggruppa i nuovi biglietti per il riepilogo
              const newTicketsSummary = order.tickets.reduce((acc, t) => {
                acc[t.type] = (acc[t.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const newTicketsList = Object.entries(newTicketsSummary).map(([type, count]) => `${count}x ${type}`).join(', ');

              // 4. Aggiorna le note dell'ordine genitore con eventuali nuovi bambini e laboratori gratuiti
              let updatedNotes = parentOrder.notes || '';
              
              const addedKidsMatch = order.notes?.match(/\+(\d+)\s*Bambin/i);
              const addedKids = addedKidsMatch ? parseInt(addedKidsMatch[1], 10) : 0;
              if (addedKids > 0) {
                const childMatch = updatedNotes.match(/Bambini:\s*(\d+)(?:\/(\d+))?/i);
                if (childMatch) {
                  const currentKids = parseInt(childMatch[1], 10);
                  const currentTotal = childMatch[2] ? parseInt(childMatch[2], 10) : currentKids;
                  const updatedKids = currentKids + addedKids;
                  const updatedTotal = currentTotal + addedKids;
                  updatedNotes = updatedNotes.replace(/Bambini:\s*(\d+)(?:\/(\d+))?/i, `Bambini: ${updatedKids}/${updatedTotal}`);
                } else {
                  updatedNotes += ` | Bambini: ${addedKids}`;
                }
              }

              const freeLabsMatch = order.notes?.match(/Laboratori gratuiti bimbi:\s*([^|]+)/i);
              if (freeLabsMatch) {
                const newFreeLabs = freeLabsMatch[1].trim();
                const actMatch = updatedNotes.match(/Attività([^:]*):\s*([^|]+)/i);
                if (actMatch) {
                  const existingActs = actMatch[2].split(',').map(s => s.trim());
                  const incomingActs = newFreeLabs.split(',').map(s => s.trim());
                  const mergedActs = Array.from(new Set([...existingActs, ...incomingActs])).join(', ');
                  updatedNotes = updatedNotes.replace(/Attività([^:]*):\s*([^|]+)/i, `Attività$1: ${mergedActs}`);
                } else {
                  updatedNotes += ` | Attività: ${newFreeLabs}`;
                }
              }

              const integrationRecord = `\n[INTEGRAZIONE NEXI PAGATA]: +€${Number(order.totalAmount).toFixed(2)} (${newTicketsList}) - Transazione: ${codTrans}`;
              updatedNotes += integrationRecord;

              // Aggiorna l'ordine principale
              await sql`
                UPDATE orders 
                SET "totalAmount" = ${newTotal}, notes = ${updatedNotes}
                WHERE id = ${parentOrderId}
              `;

              // Archivia il sub-ordine per non duplicarlo nella lista ordini attivi
              await sql`
                UPDATE orders 
                SET status = 'PAID', "paidAt" = CURRENT_TIMESTAMP, "deletedAt" = CURRENT_TIMESTAMP,
                    notes = notes || ${'\nIntegrato con successo in #' + parentOrderId}
                WHERE id = ${orderId}
              `;

              // Ricarica l'ordine genitore con TUTTI i biglietti (vecchi + nuovi uniti)
              const updatedParentOrder = await getOrder(parentOrderId);
              if (updatedParentOrder) {
                // Invia al cliente il PDF unificato con tutti i biglietti
                await sendTicketsEmail(updatedParentOrder);

                const isZuccaland = updatedParentOrder.tickets.some(t => t.eventId?.includes('zuccaland'));
                const eventLabel = isZuccaland ? '🎃 Zuccaland' : '🍷 Assaggia & Passeggia';

                await sendTelegramNotification(
                  `✅ <b>Integrazione PAGATA (Nexi)</b>\n\n` +
                  `🎪 <b>Evento:</b> ${eventLabel}\n` +
                  `👤 <b>Nome:</b> ${updatedParentOrder.buyerName}\n` +
                  `📧 <b>Email:</b> ${updatedParentOrder.buyerEmail}\n` +
                  `📞 <b>Tel:</b> ${updatedParentOrder.buyerPhone || 'N/D'}\n` +
                  `🎟 <b>Nuovi Biglietti Aggiunti:</b> ${newTicketsList}\n` +
                  `💰 <b>Importo Integrazione:</b> €${Number(order.totalAmount).toFixed(2)}\n` +
                  `💰 <b>Nuovo Totale Ordine:</b> €${newTotal.toFixed(2)}\n` +
                  `💳 <b>Transazione Nexi:</b> ${codTrans}\n` +
                  `🔗 <b>Rif. Ordine Principale:</b> #${parentOrderId.substring(0, 8).toUpperCase()}`
                );

                const successPath = isZuccaland
                  ? `/zuccaland/success?order=${parentOrderId}&integration=true`
                  : `/assaggia-e-passeggia/success?order=${parentOrderId}&integration=true`;
                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
                return NextResponse.redirect(`${baseUrl}${successPath}`);
              }
            }
          }

          // ─── FLUSSO STANDARD ORDINE DIRETTO ────────────────────────────────
          await sendTicketsEmail(order);
          
          const ticketsSummary = order.tickets.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const ticketsList = Object.entries(ticketsSummary).map(([type, count]) => `${count}x ${type}`).join(', ');

          const isZuccaland = order.tickets.some(t => t.eventId?.includes('zuccaland'));
          const eventLabel = isZuccaland ? '🎃 Zuccaland' : '🍷 Assaggia & Passeggia';

          await sendTelegramNotification(
            `✅ <b>Ordine PAGATO (Nexi)</b>\n\n` +
            `🎪 <b>Evento:</b> ${eventLabel}\n` +
            `👤 <b>Nome:</b> ${order.buyerName}\n` +
            `📧 <b>Email:</b> ${order.buyerEmail}\n` +
            `📞 <b>Tel:</b> ${order.buyerPhone || 'N/D'}\n` +
            `🎟 <b>Biglietti:</b> ${ticketsList}\n` +
            `💰 <b>Totale:</b> €${order.totalAmount.toFixed(2)}\n` +
            `💳 <b>Transazione:</b> ${codTrans}`
          );

          const successPath = isZuccaland
            ? `/zuccaland/success?order=${orderId}`
            : `/assaggia-e-passeggia/success?order=${orderId}`;
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
          return NextResponse.redirect(`${baseUrl}${successPath}`);
        }
      } catch (emailErr) {
        console.error('Email or Telegram notification failed (non-fatal):', emailErr);
      }

      const fallbackBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
      return NextResponse.redirect(`${fallbackBaseUrl}/assaggia-e-passeggia/success?order=${orderId}`);
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
          `👤 <b>Nome:</b> ${order.buyerName}\n` +
          `💰 <b>Totale:</b> €${order.totalAmount.toFixed(2)}\n` +
          `💳 <b>Transazione:</b> ${codTrans}`
        );
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
        const failPath = isZuccaland
          ? `/zuccaland?error=payment_failed`
          : `/assaggia-e-passeggia/ticket?error=payment_failed`;
        return NextResponse.redirect(`${baseUrl}${failPath}`);
      }
    } catch (e) {
      console.error(e);
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
    return NextResponse.redirect(`${baseUrl}/assaggia-e-passeggia/ticket?error=payment_failed`);
  }
}
