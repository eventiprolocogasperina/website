import { renderToBuffer } from '@react-pdf/renderer';
import { Resend } from 'resend';
import type { OrderWithTickets } from '@/lib/data/tickets';
import { TicketPdfDocument, generateQrDataUri } from './TicketPdfDocument';
import { createElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

import { Document, Page, Text, View } from '@react-pdf/renderer';

const BlankMenuDocument = () => {
  return createElement(Document, null,
    createElement(Page, { size: "A4" },
      createElement(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
        createElement(Text, null, "Menu in arrivo...")
      )
    )
  );
};

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
  
  // Render blank menu PDF
  const menuPdfBuffer = await renderToBuffer(
    createElement(BlankMenuDocument) as any
  );

  const orderRef = order.id.replace(/-/g, '').substring(0, 8).toUpperCase();
  const ticketCount = order.tickets.length;

  // 3. Send email via Resend
  const { error } = await resend.emails.send({
    from: 'Pro Loco Gasperina <biglietti@prolocogasperina.it>',
    to: order.buyerEmail,
    replyTo: 'info@prolocogasperina.it',
    subject: `🎟 I tuoi biglietti per Assaggia & Passeggia - Ord. #${orderRef}`,
    html: buildEmailHtml(order, orderRef, ticketCount),
    attachments: [
      {
        filename: `biglietti-assaggia-passeggia-${orderRef}.pdf`,
        content: pdfBuffer,
      },
      {
        filename: `menu-assaggia-passeggia.pdf`,
        content: menuPdfBuffer,
      }
    ],
  });

  if (error) {
    console.error('Failed to send ticket email:', error);
    // Non facciamo throw error, altrimenti la callback di Nexi fallisce e ritenta all'infinito
    // throw new Error(`Email send failed: ${error.message}`);
  }

  console.log(`✅ Ticket email sent to ${order.buyerEmail} for order ${orderRef}`);
}

function buildEmailHtml(order: OrderWithTickets, orderRef: string, ticketCount: number): string {
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

          <!-- Hero Image Placeholder -->
          <tr>
            <td style="background:#f2e2bf;text-align:center;vertical-align:middle;position:relative;">
              <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it'}/img/LOGO_ap_ga.png" width="600" alt="Assaggia e Passeggia" style="display:block;width:100%;max-width:600px;height:auto;object-fit:cover;" />
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background:#283983;padding:30px 40px;text-align:center;">
              <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it'}/img/logo_white_fg.png" width="100" alt="Pro Loco Gasperina" style="display:block;margin:0 auto 15px auto;" />
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Assaggia &amp; Passeggia</h1>
              <div style="color:#E8C042;font-size:14px;margin-top:8px;font-weight:600;">Gasperina, Calabria</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Ciao ${order.buyerName}! 🎉</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;">
                Il tuo pagamento è andato a buon fine. Trovi in allegato il PDF con 
                <strong>${ticketCount} ${ticketCount === 1 ? 'biglietto' : 'biglietti'}</strong> per Assaggia &amp; Passeggia, e un PDF aggiuntivo con il <strong>Menù della serata</strong>.
              </p>

              <!-- Order Summary -->
              <div style="background:#F9F3E4;border-radius:12px;padding:24px;margin-bottom:28px;border:1px solid #e8d9b8;">
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;font-weight:600;">Riepilogo Ordine</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#555;padding-bottom:8px;">N° Ordine</td>
                    <td style="text-align:right;font-size:13px;color:#1a1a1a;font-weight:600;padding-bottom:8px;">#${orderRef}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#555;padding-bottom:8px;">Biglietti</td>
                    <td style="text-align:right;font-size:13px;color:#1a1a1a;font-weight:600;padding-bottom:8px;">${ticketCount}</td>
                  </tr>
                  <tr>
                    <td style="border-top:1px dashed #ccc;padding-top:12px;font-size:14px;color:#1a1a1a;font-weight:700;">Totale pagato</td>
                    <td style="border-top:1px dashed #ccc;padding-top:12px;text-align:right;font-size:18px;color:#283983;font-weight:700;">€${order.totalAmount.toFixed(2)}</td>
                  </tr>
                </table>
              </div>

              <!-- Instructions -->
              <div style="background:#fef9f0;border-radius:12px;padding:20px 24px;border:1px solid #e8d9b8;margin-bottom:28px;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#7a6040;">📋 Come usare il tuo biglietto</p>
                <ul style="margin:0;padding-left:20px;font-size:13px;color:#7a6040;line-height:2;">
                  <li>Apri il PDF allegato a questa email</li>
                  <li>Presenta il <strong>QR code</strong> all'ingresso per la verifica</li>
                  <li>Puoi mostrarlo dal telefono o stamparlo</li>
                  <li>Il biglietto è personale e non cedibile</li>
                </ul>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/assaggia-e-passeggia/success?order=${order.id}" style="display:inline-block;background:#283983;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:999px;">
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
