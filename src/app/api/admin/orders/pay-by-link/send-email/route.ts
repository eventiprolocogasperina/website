import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getOrder } from '@/lib/data/tickets';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { subOrderId } = await req.json();

    if (!subOrderId) {
      return NextResponse.json({ error: 'subOrderId mancante' }, { status: 400 });
    }

    const subOrder = await getOrder(subOrderId);
    if (!subOrder) {
      return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
    }

    // Estrai info ordine genitore
    const match = subOrder.notes?.match(/\[INTEGRAZIONE_PARENT:([^\]]+)\]/);
    const parentOrderId = match ? match[1] : '';
    const parentOrder = parentOrderId ? await getOrder(parentOrderId) : null;

    const isZuccaland = subOrder.tickets.some(t => t.eventId?.includes('zuccaland')) || 
                        parentOrder?.tickets.some(t => t.eventId?.includes('zuccaland'));
    const eventTitle = isZuccaland ? 'Zuccaland 2026' : 'Assaggia & Passeggia';
    const eventEmoji = isZuccaland ? '🎃' : '🍷';
    const primaryColor = isZuccaland ? '#ea580c' : '#1e3a8a';

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
    const payUrl = `${baseUrl}/paga/${subOrderId}`;

    // Raggruppa biglietti per tipo
    const ticketTypesCount = subOrder.tickets.reduce((acc, t) => {
      acc[t.type] = {
        count: (acc[t.type]?.count || 0) + 1,
        price: t.price
      };
      return acc;
    }, {} as Record<string, { count: number; price: number }>);

    const itemsRowsHtml = Object.entries(ticketTypesCount).map(([type, info]) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px;">
          <b>${info.count}x</b> ${type}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937; font-size: 14px; text-align: right; font-weight: 600;">
          €${(info.price * info.count).toFixed(2)}
        </td>
      </tr>
    `).join('');

    // Dettaglio note (es. laboratori gratuiti bimbi se presenti)
    const freeLabsMatch = subOrder.notes?.match(/Laboratori gratuiti bimbi:\s*([^|]+)/i);
    const freeLabsHtml = freeLabsMatch ? `
      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0; color: #92400e; font-size: 13px;">
        🎨 <b>Laboratori gratuiti bimbi inclusi:</b> ${freeLabsMatch[1].trim()}
      </div>
    ` : '';

    const emailHtml = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Link di pagamento per ${eventTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px 12px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
    
    <!-- Header -->
    <div style="background: ${primaryColor}; padding: 28px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">
        ${eventEmoji} ${eventTitle}
      </h1>
      <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">
        Pro Loco Gasperina APS
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 24px;">
      <p style="font-size: 16px; color: #111827; margin: 0 0 16px; font-weight: 600;">
        Gentile ${subOrder.buyerName},
      </p>
      <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 20px;">
        Come concordato, abbiamo aggiornato la tua prenotazione per <b>${eventTitle}</b>${parentOrder ? ` (Rif. #${parentOrder.id.substring(0, 8).toUpperCase()})` : ''} aggiungendo i nuovi servizi richiesti.
      </p>

      <!-- Tabella servizi -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; background: #f9fafb; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Servizio / Biglietto</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">Importo</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
        <tfoot>
          <tr style="background: #ffffff;">
            <td style="padding: 12px; font-size: 15px; font-weight: 800; color: #111827;">Totale da Saldare:</td>
            <td style="padding: 12px; font-size: 18px; font-weight: 800; color: ${primaryColor}; text-align: right;">€${subOrder.totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      ${freeLabsHtml}

      <!-- Pulsante CTA -->
      <div style="text-align: center; margin: 28px 0 24px;">
        <a href="${payUrl}" target="_blank" style="display: inline-block; background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 15px 32px; font-size: 16px; font-weight: 700; border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
          💳 Procedi al Pagamento Sicuro (€${subOrder.totalAmount.toFixed(2)})
        </a>
      </div>

      <p style="font-size: 12px; color: #6b7280; text-align: center; margin: 0 0 16px; line-height: 1.5;">
        🔒 Transazione protetta tramite il gateway certificato Nexi XPay.<br/>
        Puoi pagare comodamente con Carta di Credito/Debito, Apple Pay o Google Pay.
      </p>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
        Appena completato il pagamento, riceverai una nuova email con il PDF aggiornato contenente tutti i tuoi biglietti e QR code.
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const { error } = await resend.emails.send({
      from: 'Pro Loco Gasperina <biglietti@prolocogasperina.it>',
      to: subOrder.buyerEmail,
      replyTo: 'info@prolocogasperina.it',
      subject: `${eventEmoji} Link di Pagamento - Integrazione prenotazione ${eventTitle} (Ord. #${subOrderId.substring(0, 8).toUpperCase()})`,
      html: emailHtml,
    });

    if (error) {
      console.error('Error sending pay-by-link email:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Email inviata con successo a ${subOrder.buyerEmail}` });
  } catch (err: any) {
    console.error('Send pay-by-link email error:', err);
    return NextResponse.json({ error: err.message || 'Errore durante l\'invio dell\'email' }, { status: 500 });
  }
}
