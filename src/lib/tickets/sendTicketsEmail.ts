import { renderToBuffer } from '@react-pdf/renderer';
import { Resend } from 'resend';
import type { OrderWithTickets } from '@/lib/data/tickets';
import { TicketPdfDocument, generateQrDataUri } from './TicketPdfDocument';
import { getPageContent, DEFAULT_ASSAGGIA_CONTENT, type AssaggiaEPasseggiaContent } from '@/lib/data/pages';
import fs from 'fs';
import path from 'path';
import { createElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

import { Document, Page, Text, View } from '@react-pdf/renderer';



export async function sendTicketsEmail(order: OrderWithTickets): Promise<void> {
  // 1. Generate QR code data URIs for each ticket
  const qrDataUris: Record<string, string> = {};
  for (const ticket of order.tickets) {
    qrDataUris[ticket.id] = await generateQrDataUri(ticket.qrCodeData);
  }

  // 2. Render PDF to buffer (server-side)
  const pdfBuffer = await renderToBuffer(
    createElement(TicketPdfDocument, { order, qrDataUris }) as any
  );
  
  // Fetch Assaggia content for the menu
  const content = await getPageContent<AssaggiaEPasseggiaContent>('assaggia-e-passeggia', DEFAULT_ASSAGGIA_CONTENT);

  let menuPdfBuffer: Buffer | null = null;
  
  if (content.menu?.pdfUrl) {
    try {
      // Fetch the PDF from the URL stored in the CMS
      const response = await fetch(content.menu.pdfUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        menuPdfBuffer = Buffer.from(arrayBuffer);
      } else {
        console.error('Failed to fetch menu PDF from CMS URL:', content.menu.pdfUrl, response.statusText);
      }
    } catch (err) {
      console.error('Error fetching menu PDF from CMS URL:', err);
    }
  }

  // Fallback to local file if fetch failed or url is empty
  if (!menuPdfBuffer) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'A_and_P_menu_mail.pdf');
      menuPdfBuffer = fs.readFileSync(filePath);
    } catch (err) {
      console.error('Failed to load local menu PDF:', err);
    }
  }

  const orderRef = order.id.replace(/-/g, '').substring(0, 8).toUpperCase();
  const ticketCount = order.tickets.length;
  
  // Raggruppa i biglietti per tipo
  const ticketTypesCount = order.tickets.reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const ticketsListHtml = Object.entries(ticketTypesCount)
    .map(([type, count]) => `<li><b>${count}x</b> ${type}</li>`)
    .join('');

  // 3. Send email via Resend
  const { error } = await resend.emails.send({
    from: 'Pro Loco Gasperina <biglietti@prolocogasperina.it>',
    to: order.buyerEmail,
    replyTo: 'info@prolocogasperina.it',
    subject: `🎟 Ricevuta di prenotazione - Assaggia & Passeggia - Ord. #${orderRef}`,
    html: buildEmailHtml(order, orderRef, ticketCount, ticketsListHtml, !!menuPdfBuffer),
    attachments: [
      {
        filename: `biglietti-assaggia-passeggia-${orderRef}.pdf`,
        content: pdfBuffer,
      },
      ...(menuPdfBuffer ? [{
        filename: `menu-assaggia-passeggia.pdf`,
        content: menuPdfBuffer,
      }] : [])
    ],
  });

  if (error) {
    console.error('Failed to send ticket email:', error);
    // Non facciamo throw error, altrimenti la callback di Nexi fallisce e ritenta all'infinito
    // throw new Error(`Email send failed: ${error.message}`);
  }

  console.log(`✅ Ticket email sent to ${order.buyerEmail} for order ${orderRef}`);
}

function buildEmailHtml(order: OrderWithTickets, orderRef: string, ticketCount: number, ticketsListHtml: string, hasMenu: boolean): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>I tuoi biglietti - Assaggia & Passeggia</title>
</head>
<body style="margin:0;padding:0;background:#f0ece6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ece6;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);">

        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);border:1px solid #e8d9b8;">

          <!-- Header -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px;text-align:center;border-bottom:3px solid #E8C042;">
              <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it'}/img/LogoAP_GA_nero.png" width="220" alt="Assaggia & Passeggia" style="display:block;margin:0 auto 10px auto;" />
              <div style="color:#283983;font-size:16px;margin-top:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Gasperina, Calabria</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Ciao ${order.buyerName}!</p>
              <div style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                La tua prenotazione è confermata! ${hasMenu ? 'Trovi in allegato <strong>due documenti in PDF</strong>:<br/><br/>🍷 <strong>Il Menù della serata</strong> con tutte le tappe del percorso.<br/>🎟 <strong>La tua ricevuta di prenotazione</strong>, valida per ritirare i biglietti fisici.' : 'Trovi in allegato il PDF della tua <strong>ricevuta di prenotazione</strong>, valido per ritirare i tuoi biglietti fisici.'}
              </div>

              <!-- Order Summary -->
              <div style="background:#F9F3E4;border-radius:12px;padding:24px;margin-bottom:28px;border:1px solid #e8d9b8;">
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;font-weight:600;">Riepilogo Ordine</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#555;padding-bottom:8px;">N° Ordine</td>
                    <td style="text-align:right;font-size:13px;color:#1a1a1a;font-weight:600;padding-bottom:8px;">#${orderRef}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#555;padding-bottom:12px;vertical-align:top;">Dettaglio</td>
                    <td style="text-align:right;font-size:13px;color:#1a1a1a;font-weight:500;padding-bottom:12px;">
                      <ul style="margin:0;padding:0;list-style:none;">
                        ${ticketsListHtml}
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px dashed #ccc;padding-top:12px;font-size:14px;color:#1a1a1a;font-weight:700;">Totale pagato</td>
                    <td style="border-top:1px dashed #ccc;padding-top:12px;text-align:right;font-size:18px;color:#283983;font-weight:700;">€${order.totalAmount.toFixed(2)}</td>
                  </tr>
                </table>
              </div>

              <!-- Instructions -->
              <div style="background:#fff4e5;border-radius:12px;padding:20px 24px;border:1px solid #ffd8a8;margin-bottom:28px;">
                <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#d97706;">⚠️ Informazione Importante</p>
                <p style="margin:0 0 12px;font-size:14px;color:#92400e;line-height:1.5;">
                  Il documento in allegato <strong>vale come ricevuta di prenotazione</strong>. 
                  Dovrai obbligatoriamente presentarlo al botteghino il giorno dell'evento per <strong>ritirare i tuoi biglietti fisici</strong>.
                </p>
                <ul style="margin:0;padding-left:20px;font-size:13px;color:#92400e;line-height:1.8;">
                  <li>Apri il PDF allegato a questa email e tienilo a portata di mano</li>
                  <li>Presenta il <strong>QR code</strong> alla cassa dedicata alle prenotazioni online</li>
                  <li>Puoi mostrarlo comodamente dal telefono senza stamparlo</li>
                  <li>La ricevuta è personale e non cedibile</li>
                </ul>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it'}/assaggia-e-passeggia/success?order=${order.id}" style="display:inline-block;background:#283983;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:999px;">
                  Visualizza Ordine Online
                </a>
              </div>

              <p style="margin:0;font-size:14px;color:#888;line-height:1.6;">
                Per qualsiasi domanda, rispondi a questa email o contattaci su 
                <a href="mailto:info@prolocogasperina.it" style="color:#283983;">info@prolocogasperina.it</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1a1a1a;padding:24px 40px;text-align:center;">
              <div style="color:#E8C042;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Pro Loco Gasperina</div>
              <div style="color:rgba(255,255,255,0.4);font-size:11px;">Gasperina (CZ) · prolocogasperina.it</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
