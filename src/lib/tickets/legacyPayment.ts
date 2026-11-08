import { neon } from '@neondatabase/serverless';
import { markOrderPaidByCodTrans, getOrder } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';
import { sendTelegramNotification } from '@/lib/telegram';

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';

/**
 * Pagamento Nexi riuscito di un ordine del checkout classico (tabella `orders`). Lo chiamano il ritorno
 * del browser (/api/nexi/callback) e la notifica server-to-server di Nexi (/api/nexi/notifica, `urlpost`):
 * arrivano tutti e due, in qualsiasi ordine, e il secondo non deve rifare nulla (né email, né Telegram,
 * né sommare due volte un'integrazione). Ritorna l'indirizzo a cui mandare il cliente.
 */
export async function confirmLegacyPayment(codTrans: string): Promise<string> {
  // The codTrans IS the orderId (we generate it as 30-chars max in /api/orders)
  const orderId = codTrans;
  const changed = await markOrderPaidByCodTrans(codTrans);
  const fallback = `${baseUrl()}/assaggia-e-passeggia/edizione-2026/success?order=${orderId}`;

  // Fetch full order with tickets and send PDF email (non-blocking on failure)
  try {
    const order = await getOrder(orderId);
    if (!order) return fallback;

    // ─── GESTIONE INTEGRAZIONE ORDINE ESISTENTE (Pay-by-Link) ─────────
    const integrationMatch = order.notes?.match(/\[INTEGRAZIONE_PARENT:([^\]]+)\]/);
    if (integrationMatch) {
      const parentOrderId = integrationMatch[1];
      const parentOrder = await getOrder(parentOrderId);

      if (parentOrder && process.env.POSTGRES_URL) {
        const parentIsZuccaland = parentOrder.tickets.some(t => t.eventId?.includes('zuccaland'));
        const parentSuccess = `${baseUrl()}${parentIsZuccaland ? '/zuccaland/success' : '/assaggia-e-passeggia/edizione-2026/success'}?order=${parentOrderId}&integration=true`;
        // Already applied: the note written below carries the transaction, so a repeat changes nothing.
        if (parentOrder.notes?.includes(`Transazione: ${codTrans}`)) return parentSuccess;

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

        const integrationRecord = `\n| [INTEGRAZIONE NEXI PAGATA]: +€${Number(order.totalAmount).toFixed(2)} (${newTicketsList}) - Transazione: ${codTrans}`;
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
            `🎟 <b>Nuovi Biglietti Aggiunti:</b> ${newTicketsList}\n` +
            `💰 <b>Importo Integrazione:</b> €${Number(order.totalAmount).toFixed(2)}\n` +
            `💰 <b>Nuovo Totale Ordine:</b> €${newTotal.toFixed(2)}\n` +
            `💳 <b>Transazione Nexi:</b> ${codTrans}\n` +
            `🔗 <b>Rif. Ordine Principale:</b> #${parentOrderId.substring(0, 8).toUpperCase()}`
          );

          return `${baseUrl()}${isZuccaland ? '/zuccaland/success' : '/assaggia-e-passeggia/edizione-2026/success'}?order=${parentOrderId}&integration=true`;
        }
      }
    }

    // ─── FLUSSO STANDARD ORDINE DIRETTO ────────────────────────────────
    const isZuccaland = order.tickets.some(t => t.eventId?.includes('zuccaland'));
    // Only the call that actually moved the order to PAID sends the email and the message.
    if (changed) {
      await sendTicketsEmail(order);

      const ticketsSummary = order.tickets.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const ticketsList = Object.entries(ticketsSummary).map(([type, count]) => `${count}x ${type}`).join(', ');
      const eventLabel = isZuccaland ? '🎃 Zuccaland' : '🍷 Assaggia & Passeggia';

      await sendTelegramNotification(
        `✅ <b>Ordine PAGATO (Nexi)</b>\n\n` +
        `🎪 <b>Evento:</b> ${eventLabel}\n` +
        `🎟 <b>Biglietti:</b> ${ticketsList}\n` +
        `💰 <b>Totale:</b> €${order.totalAmount.toFixed(2)}\n` +
        `💳 <b>Transazione:</b> ${codTrans}`
      );
    }
    return `${baseUrl()}${isZuccaland ? '/zuccaland/success' : '/assaggia-e-passeggia/edizione-2026/success'}?order=${orderId}`;
  } catch (emailErr) {
    console.error('Email or Telegram notification failed (non-fatal):', emailErr);
  }

  return fallback;
}
