import QRCode from 'qrcode';
import { renderToBuffer } from '@react-pdf/renderer';
import { Resend } from 'resend';
import type { OrderWithTickets } from '@/lib/data/tickets';
import { TicketPdfDocument, generateQrDataUri } from './TicketPdfDocument';
import { getPageContent, DEFAULT_ASSAGGIA_CONTENT, type AssaggiaEPasseggiaContent } from '@/lib/data/pages';
import fs from 'fs';
import path from 'path';
import { createElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);



export async function sendTicketsEmail(order: OrderWithTickets): Promise<void> {
  // 1. Generate QR code data URIs for each ticket
  const qrDataUris: Record<string, string> = {};
  for (const ticket of order.tickets) {
    qrDataUris[ticket.id] = await generateQrDataUri(ticket.qrCodeData);
  }

  const isZuccaland = order.tickets.some(t => t.eventId?.includes('zuccaland'));

  // Read logos
  const eventLogoPath = isZuccaland 
    ? path.join(process.cwd(), 'public/img/zuccaland/Logo.png')
    : path.join(process.cwd(), 'public/img/LOGO_ap_ga.png');
  const proLocoLogoPath = path.join(process.cwd(), 'public/img/logo_white_fg.png');
  const eventLogoBuffer = fs.existsSync(eventLogoPath) ? fs.readFileSync(eventLogoPath) : null;
  const proLocoLogoBuffer = fs.existsSync(proLocoLogoPath) ? fs.readFileSync(proLocoLogoPath) : null;
  const eventLogoBase64 = eventLogoBuffer ? `data:image/png;base64,${eventLogoBuffer.toString('base64')}` : undefined;
  const proLocoLogoBase64 = proLocoLogoBuffer ? `data:image/png;base64,${proLocoLogoBuffer.toString('base64')}` : undefined;

  // 2. Render PDF to buffer (server-side)
  const pdfBuffer = await renderToBuffer(
    createElement(TicketPdfDocument, { order, qrDataUris, eventLogoBase64, proLocoLogoBase64 }) as any
  );
  
  // Fetch Assaggia content for the menu
  const content = await getPageContent<AssaggiaEPasseggiaContent>('assaggia-e-passeggia', DEFAULT_ASSAGGIA_CONTENT);

  let menuPdfBuffer: Buffer | null = null;
  
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

  const primaryQrCode = order.tickets[0]?.qrCodeData || order.id;

  // Generate QR code PNG buffer for inline email embedding (CID)
  const qrPngBuffer = await QRCode.toBuffer(primaryQrCode, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 320,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });

  if (isZuccaland) {
    // ─── Zuccaland Email ───────────────────────────────────────────────────────
    const admissionTickets = order.tickets.filter(t => !t.type.toLowerCase().includes('you pick') && !t.type.toLowerCase().includes('laboratorio'));
    const extraTickets = order.tickets.filter(t => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio'));
    const admissionCount = admissionTickets.length;
    const youPickCount = extraTickets.length;

    const { error } = await resend.emails.send({
      from: 'Pro Loco Gasperina <biglietti@prolocogasperina.it>',
      to: order.buyerEmail,
      replyTo: 'info@prolocogasperina.it',
      subject: `🎃 I tuoi biglietti - Zuccaland 2026 · 10-11 Ottobre - Ord. #${orderRef}`,
      html: buildZuccalandEmailHtml(order, orderRef, admissionCount, youPickCount, ticketsListHtml, primaryQrCode),
      attachments: [
        {
          filename: `biglietti-zuccaland-${orderRef}.pdf`,
          content: pdfBuffer,
        },
        {
          filename: `qr-zuccaland-${orderRef}.png`,
          content: qrPngBuffer,
          contentType: 'image/png',
          contentId: 'order_qr_code',
        },
        ...(eventLogoBuffer ? [{
          filename: 'logo-zuccaland.png',
          content: eventLogoBuffer,
          contentType: 'image/png',
          contentId: 'event_header_logo',
        }] : []),
      ],
    });
    if (error) {
      console.error('Failed to send Zuccaland ticket email:', error);
    } else {
      console.log(`✅ Zuccaland ticket email sent to ${order.buyerEmail} for order ${orderRef}`);
    }
    return;
  }

  // ─── Assaggia & Passeggia Email ────────────────────────────────────────────
  const { error } = await resend.emails.send({
    from: 'Pro Loco Gasperina <biglietti@prolocogasperina.it>',
    to: order.buyerEmail,
    replyTo: 'info@prolocogasperina.it',
    subject: `🎟 Ricevuta di prenotazione - Assaggia & Passeggia - Ord. #${orderRef}`,
    html: buildEmailHtml(order, orderRef, ticketCount, ticketsListHtml, !!menuPdfBuffer, primaryQrCode),
    attachments: [
      {
        filename: `biglietti-assaggia-passeggia-${orderRef}.pdf`,
        content: pdfBuffer,
      },
      {
        filename: `qr-assaggia-passeggia-${orderRef}.png`,
        content: qrPngBuffer,
        contentType: 'image/png',
        contentId: 'order_qr_code',
      },
      ...(proLocoLogoBuffer ? [{
        filename: 'logo-proloco.png',
        content: proLocoLogoBuffer,
        contentType: 'image/png',
        contentId: 'event_header_logo',
      }] : []),
      ...(menuPdfBuffer ? [{
        filename: `menu-assaggia-passeggia.pdf`,
        content: menuPdfBuffer,
      }] : [])
    ],
  });

  if (error) {
    console.error('Failed to send ticket email:', error);
    // Non facciamo throw error, altrimenti la callback di Nexi fallisce e ritenta all'infinito
  }

  console.log(`✅ Ticket email sent to ${order.buyerEmail} for order ${orderRef}`);
}

interface ParsedNotes {
  activities: string[];
  numChildren: number;
  target: string;
  rawNotes: string;
}

function parseOrderNotes(notes?: string | null): ParsedNotes {
  if (!notes) return { activities: [], numChildren: 0, target: '', rawNotes: '' };
  
  let numChildren = 0;
  let target = '';
  let activities: string[] = [];

  const kidsMatch = notes.match(/Bambini:\s*(\d+)\/(\d+)/i);
  if (kidsMatch) {
    numChildren = parseInt(kidsMatch[1], 10);
  }

  const actMatch = notes.match(/Attività\s*(?:\[(.*?)\])?:\s*(.*)/i);
  if (actMatch) {
    target = actMatch[1]?.trim() || '';
    const actsStr = actMatch[2]?.trim() || '';
    activities = actsStr.split(',').map(s => s.trim()).filter(Boolean);
  }

  return { activities, numChildren, target, rawNotes: notes };
}

function buildEmailHtml(order: OrderWithTickets, orderRef: string, ticketCount: number, ticketsListHtml: string, hasMenu: boolean, qrCodeData: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
  const parsedNotes = parseOrderNotes(order.notes);

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>I tuoi biglietti - Assaggia & Passeggia</title>
</head>
<body style="margin:0;padding:0;background:#f0ece6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ece6;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 8px 30px rgba(0,0,0,0.08);border:1px solid #e8d9b8;">

          <!-- Header -->
          <tr>
            <td style="background:#1B4BAA;padding:36px 30px;text-align:center;border-bottom:4px solid #E8C042;">
              <img src="cid:event_header_logo" alt="Pro Loco Gasperina" style="height:60px;margin-bottom:12px;object-fit:contain;" />
              <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.5px;">Assaggia & Passeggia</div>
              <div style="color:#E8C042;font-size:12px;margin-top:6px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Gasperina (CZ) · Calabria</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 30px;">
              <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;">
                <span style="font-size:20px;margin-right:10px;">✅</span>
                <div>
                  <div style="color:#065f46;font-size:15px;font-weight:700;">Prenotazione Confermata!</div>
                  <div style="color:#047857;font-size:13px;">Ricevuta pronta per il ritiro dei biglietti.</div>
                </div>
              </div>

              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1a1a1a;">Ciao ${order.buyerName}!</p>
              <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;">
                Grazie per aver acquistato i tuoi biglietti per <strong>Assaggia & Passeggia</strong>! 
                ${hasMenu ? 'Trovi in allegato <strong>due documenti in PDF</strong>:<br/>• 🍷 <strong>Il Menù della serata</strong> con tutte le tappe enogastronomiche.<br/>• 🎟 <strong>La ricevuta con QR Code</strong> da esibire all\'ingresso.' : 'Trovi in allegato il PDF della tua <strong>ricevuta di prenotazione</strong> con codice QR.'}
              </p>

              <!-- Order Summary Card -->
              <div style="background:#F9F3E4;border-radius:14px;padding:22px;margin-bottom:24px;border:1px solid #e8d9b8;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #e5d5be;padding-bottom:10px;">
                  <span style="font-size:11px;color:#78350f;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">Riepilogo Ordine</span>
                  <span style="background:#1B4BAA;color:#ffffff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">#${orderRef}</span>
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#78350f;padding-bottom:10px;vertical-align:top;font-weight:600;">Biglietti:</td>
                    <td style="text-align:right;font-size:13px;color:#1a1a1a;font-weight:600;padding-bottom:10px;">
                      <ul style="margin:0;padding:0;list-style:none;line-height:1.6;">
                        ${ticketsListHtml}
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px dashed #d1c0a5;padding-top:12px;font-size:14px;color:#1a1a1a;font-weight:700;">Totale pagato:</td>
                    <td style="border-top:1px dashed #d1c0a5;padding-top:12px;text-align:right;font-size:19px;color:#1B4BAA;font-weight:800;">€${order.totalAmount.toFixed(2)}</td>
                  </tr>
                </table>
              </div>

              <!-- QR Code Check-in Card -->
              <div style="background:#f8fafc;border:2px solid #cbd5e1;border-radius:16px;padding:24px 20px;margin-bottom:24px;text-align:center;">
                <div style="display:inline-block;background:#e2e8f0;color:#334155;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:999px;margin-bottom:10px;">
                  🎟️ Check-in Rapido all'Ingresso
                </div>
                <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px;">
                  Il tuo QR Code di Prenotazione
                </div>
                <p style="margin:0 0 16px;font-size:13px;color:#475569;line-height:1.4;">
                  Mostra questo codice allo staff all'ingresso per convalidare i tuoi biglietti.
                </p>

                <div style="background:#ffffff;padding:14px;border-radius:16px;display:inline-block;border:1.5px solid #cbd5e1;box-shadow:0 4px 12px rgba(0,0,0,0.05);margin-bottom:12px;">
                  <img 
                    src="cid:order_qr_code" 
                    alt="QR Code Prenotazione #${orderRef}" 
                    width="170" 
                    height="170" 
                    style="display:block;width:170px;height:170px;border-radius:8px;margin:0 auto;" 
                  />
                </div>

                <div style="font-size:12px;color:#64748b;font-weight:700;">
                  ID Ricevuta: <code style="background:#e2e8f0;color:#1e293b;padding:2px 8px;border-radius:6px;font-family:monospace;font-size:13px;">#${orderRef}</code>
                </div>
              </div>

              <!-- Location & Google Maps -->
              <div style="background:#f4f6fa;border-radius:14px;padding:20px;border:1px solid #dbe2ef;margin-bottom:24px;text-align:center;">
                <div style="font-size:15px;font-weight:700;color:#1B4BAA;margin-bottom:6px;">📍 Come Raggiungere l'Evento</div>
                <div style="font-size:13px;color:#4b5563;line-height:1.5;margin-bottom:14px;">
                  L'evento si svolge nel centro storico di <strong>Gasperina (CZ)</strong>. Clicca per aprire subito il navigatore:
                </div>
                <a href="https://maps.google.com/?q=38.743791,16.481122" target="_blank" style="display:inline-block;background:#1B4BAA;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:11px 22px;border-radius:999px;box-shadow:0 3px 10px rgba(27,75,170,0.25);">
                  🗺️ Apri su Google Maps
                </a>
                <div style="margin-top:10px;font-size:11px;color:#6b7280;">
                  Coordinate GPS: <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;color:#1f2937;">38.743791, 16.481122</code>
                </div>
              </div>

              <!-- Instructions -->
              <div style="background:#fffbeb;border-radius:14px;padding:18px 20px;border:1px solid #fde68a;margin-bottom:24px;">
                <div style="font-size:14px;font-weight:700;color:#b45309;margin-bottom:8px;">📋 Informazioni per il Ritiro</div>
                <ul style="margin:0;padding-left:18px;font-size:12.5px;color:#92400e;line-height:1.7;">
                  <li>Mostra il <strong>QR Code</strong> presente in questa email o nel PDF allegato</li>
                  <li>Ritira i tuoi calici e ticket fisici alla cassa dedicata alle prenotazioni online</li>
                  <li>La ricevuta è personale e valida per tutti i partecipanti registrati</li>
                </ul>
              </div>

              <!-- Quick Action & Support Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <a href="${baseUrl}/assaggia-e-passeggia/success?order=${order.id}" style="display:inline-block;background:#1B4BAA;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:999px;">
                      Visualizza Ricevuta Online
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="https://wa.me/393505757501?text=${encodeURIComponent(`Ciao, ho bisogno di assistenza per l'ordine #${orderRef}`)}" target="_blank" style="display:inline-block;color:#059669;text-decoration:none;font-weight:700;font-size:13px;">
                      💬 Serve aiuto? Scrivici su WhatsApp (+39 350 575 7501)
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.5;">
                Per informazioni rispondi a questa email o scrivi a <a href="mailto:info@prolocogasperina.it" style="color:#1B4BAA;">info@prolocogasperina.it</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111827;padding:20px 30px;text-align:center;">
              <div style="color:#E8C042;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:800;margin-bottom:4px;">Pro Loco Gasperina APS</div>
              <div style="color:rgba(255,255,255,0.45);font-size:11px;">Gasperina (CZ) · prolocogasperina.it</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildZuccalandEmailHtml(
  order: OrderWithTickets,
  orderRef: string,
  admissionCount: number,
  youPickCount: number,
  ticketsListHtml: string,
  qrCodeData: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
  const parsedNotes = parseOrderNotes(order.notes);

  const activitiesHtml = parsedNotes.activities.length > 0 ? `
    <!-- Selected Activities Card -->
    <div style="background:#fff7ed;border-radius:14px;padding:20px;margin-bottom:24px;border:1.5px solid #fed7aa;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:14px;font-weight:800;color:#ea580c;display:flex;align-items:center;gap:6px;">
          🎨 Laboratori & Attività Riservate
        </span>
        <span style="background:#ea580c;color:#ffffff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;text-transform:uppercase;">
          Gratuiti
        </span>
      </div>
      <p style="margin:0 0 12px;font-size:12.5px;color:#9a3412;line-height:1.4;">
        ${parsedNotes.target ? `Destinatari: <strong>${parsedNotes.target}</strong>` : 'Attività incluse nella tua prenotazione:'}
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${parsedNotes.activities.map(act => `
          <div style="background:#ffffff;border:1px solid #fdba74;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">✨</span>
            <span style="color:#431407;font-size:13px;font-weight:700;">${act}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const youPickNoticeHtml = youPickCount > 0 ? `
    <!-- You Pick Lab Highlight Card -->
    <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:14px;padding:18px 20px;margin-bottom:24px;text-align:left;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:20px;">🎃</span>
        <span style="font-size:14px;font-weight:800;color:#c2410c;">
          You Pick Lab: ${youPickCount} ${youPickCount === 1 ? 'zucca inclusa' : 'zucche incluse'}
        </span>
      </div>
      <p style="margin:0;font-size:12.5px;color:#7c2d12;line-height:1.5;">
        <strong>Nota importante:</strong> Ogni acquisto di You Pick Lab dà diritto ad <strong>una sola zucca</strong> da scegliere, intagliare o dipingere nell'area laboratorio del villaggio (da portare a casa!).
      </p>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>I tuoi biglietti - Zuccaland 2026</title>
</head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 8px 30px rgba(234,88,12,0.12);border:1.5px solid rgba(234,88,12,0.2);">

          <!-- Header -->
          <tr>
            <td style="background:#ffffff;padding:36px 30px;text-align:center;border-bottom:4px solid #ea580c;">
              <img src="cid:event_header_logo" alt="Zuccaland 2026" style="height:85px;margin-bottom:12px;object-fit:contain;" />
              <div style="color:#7c2d12;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Il villaggio delle zucche di Gasperina</div>
              <div style="display:inline-block;background:#fff7ed;border:1px solid #fdba74;color:#ea580c;font-size:12px;margin-top:10px;font-weight:800;padding:4px 14px;border-radius:999px;">
                🎃 10 e 11 Ottobre 2026 · Gasperina (CZ)
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 30px;">
              <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;">
                <span style="font-size:20px;margin-right:10px;">✅</span>
                <div>
                  <div style="color:#065f46;font-size:15px;font-weight:700;">Prenotazione Confermata!</div>
                  <div style="color:#047857;font-size:13px;">Il tuo QR Code e i biglietti sono pronti.</div>
                </div>
              </div>

              <p style="margin:0 0 8px;font-size:20px;font-weight:800;color:#431407;">Ciao ${order.buyerName}!</p>
              <p style="margin:0 0 24px;font-size:14px;color:#7c2d12;line-height:1.6;">
                La tua prenotazione per <strong>Zuccaland 2026</strong> è confermata! Puoi mostrare direttamente il <strong>QR Code qui sotto</strong> oppure aprire il PDF allegato per accedere e ritirare i biglietti fisici all'ingresso.
              </p>

              <!-- Order Summary Card -->
              <div style="background:#fffaf5;border-radius:14px;padding:22px;margin-bottom:24px;border:1px solid #ffedd5;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #fed7aa;padding-bottom:10px;">
                  <span style="font-size:11px;color:#ea580c;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">Riepilogo Ordine</span>
                  <span style="background:#ea580c;color:#ffffff;font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px;">#${orderRef}</span>
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#9a3412;padding-bottom:10px;vertical-align:top;font-weight:600;">Dettaglio Selezioni:</td>
                    <td style="text-align:right;font-size:13px;color:#431407;font-weight:700;padding-bottom:10px;">
                      <ul style="margin:0;padding:0;list-style:none;line-height:1.6;">
                        ${ticketsListHtml}
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:12.5px;color:#9a3412;padding-bottom:10px;">🎟 Ingressi al Villaggio:</td>
                    <td style="text-align:right;font-size:12.5px;color:#ea580c;font-weight:700;padding-bottom:10px;">
                      ${admissionCount} ${admissionCount === 1 ? 'ingresso' : 'ingressi'}
                    </td>
                  </tr>
                  ${parsedNotes.numChildren > 0 ? `
                  <tr>
                    <td style="font-size:12.5px;color:#9a3412;padding-bottom:10px;">👶 Di cui bambini:</td>
                    <td style="text-align:right;font-size:12.5px;color:#ea580c;font-weight:700;padding-bottom:10px;">
                      ${parsedNotes.numChildren} di ${admissionCount}
                    </td>
                  </tr>
                  ` : ''}
                  ${youPickCount > 0 ? `
                  <tr>
                    <td style="font-size:12.5px;color:#9a3412;padding-bottom:10px;">🎨 You Pick Lab:</td>
                    <td style="text-align:right;font-size:12.5px;color:#c2410c;font-weight:700;padding-bottom:10px;">
                      ${youPickCount} ${youPickCount === 1 ? 'zucca inclusa' : 'zucche incluse'}
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="border-top:1px dashed #fdba74;padding-top:12px;font-size:14px;color:#7c2d12;font-weight:800;">Totale pagato:</td>
                    <td style="border-top:1px dashed #fdba74;padding-top:12px;text-align:right;font-size:20px;color:#ea580c;font-weight:900;">€${order.totalAmount.toFixed(2)}</td>
                  </tr>
                </table>
              </div>

              ${activitiesHtml}
              ${youPickNoticeHtml}

              <!-- QR Code Check-in Card (Directly in Email Body) -->
              <div style="background:#fffaf5;border:2px solid #fed7aa;border-radius:18px;padding:26px 20px;margin-bottom:24px;text-align:center;box-shadow:0 6px 20px rgba(234,88,12,0.06);">
                <div style="display:inline-block;background:#ffedd5;color:#c2410c;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:4px 12px;border-radius:999px;margin-bottom:10px;">
                  🎟️ Check-in Rapido all'Ingresso
                </div>
                <div style="font-size:17px;font-weight:900;color:#431407;margin-bottom:4px;">
                  Il tuo QR Code di Prenotazione
                </div>
                <p style="margin:0 0 16px;font-size:13px;color:#7c2d12;line-height:1.4;">
                  Mostra questo codice allo staff all'ingresso del villaggio per convalidare i tuoi biglietti e ritirare i braccialetti.
                </p>

                <!-- QR Code Container -->
                <div style="background:#ffffff;padding:14px;border-radius:16px;display:inline-block;border:1.5px solid #fdba74;box-shadow:0 4px 14px rgba(0,0,0,0.06);margin-bottom:14px;">
                  <img 
                    src="cid:order_qr_code" 
                    alt="QR Code Prenotazione Zuccaland #${orderRef}" 
                    width="180" 
                    height="180" 
                    style="display:block;width:180px;height:180px;border-radius:8px;margin:0 auto;" 
                  />
                </div>

                <div style="font-size:12px;color:#9a3412;font-weight:700;">
                  ID Ricevuta: <code style="background:#ffedd5;color:#7c2d12;padding:2px 8px;border-radius:6px;font-family:monospace;font-size:13px;letter-spacing:0.5px;">#${orderRef}</code>
                </div>
                <p style="margin:8px 0 0;font-size:11.5px;color:#9a3412;opacity:0.85;">
                  Valido per <strong>${admissionCount} ${admissionCount === 1 ? 'ingresso' : 'ingressi'}</strong>${youPickCount > 0 ? ` + <strong>${youPickCount} You Pick Lab</strong>` : ''} · Scannerizzabile direttamente dallo schermo
                </p>
              </div>

              <!-- Location & Navigation Card -->
              <div style="background:#fef3c7;border-radius:14px;padding:20px;border:1.5px solid #fcd34d;margin-bottom:24px;text-align:center;">
                <div style="font-size:15px;font-weight:800;color:#92400e;margin-bottom:6px;">📍 Come Raggiungere Zuccaland</div>
                <div style="font-size:13px;color:#78350f;line-height:1.5;margin-bottom:14px;">
                  Il villaggio delle zucche si trova a <strong>Gasperina (CZ)</strong>. Clicca sul pulsante qui sotto per avviare il navigatore verso il punto esatto:
                </div>
                <a href="https://maps.google.com/?q=38.743791,16.481122" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;text-decoration:none;font-weight:800;font-size:13.5px;padding:12px 24px;border-radius:999px;box-shadow:0 4px 12px rgba(234,88,12,0.3);">
                  🗺️ Apri Posizione su Google Maps
                </a>
                <div style="margin-top:10px;font-size:11px;color:#92400e;">
                  Coordinate GPS: <code style="background:#fde68a;padding:2px 6px;border-radius:4px;color:#78350f;font-weight:700;">38.743791, 16.481122</code>
                </div>
              </div>

              <!-- Entry Instructions -->
              <div style="background:#ffedd5;border-radius:14px;padding:18px 20px;border:1px solid #fdba74;margin-bottom:24px;">
                <div style="font-size:14px;font-weight:800;color:#c2410c;margin-bottom:8px;">📋 Come ritirare i biglietti all'ingresso</div>
                <ul style="margin:0;padding-left:18px;font-size:12.5px;color:#9a3412;line-height:1.7;font-weight:500;">
                  <li>Mostra il <strong>QR Code</strong> presente in questa email o nel PDF allegato direttamente dallo smartphone</li>
                  <li>Presentalo all'ingresso dedicato alle prenotazioni online per ritirare i braccialetti/biglietti</li>
                  <li>La ricevuta è personale e valida per tutto il tuo gruppo</li>
                </ul>
              </div>

              <!-- Quick Action & Support Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <a href="${baseUrl}/zuccaland/success?order=${order.id}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 28px;border-radius:999px;box-shadow:0 4px 14px rgba(234,88,12,0.35);">
                      Visualizza Ordine Online
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="https://wa.me/393505757501?text=${encodeURIComponent(`Ciao, vorrei informazioni per la prenotazione Zuccaland #${orderRef}`)}" target="_blank" style="display:inline-block;color:#059669;text-decoration:none;font-weight:700;font-size:13px;">
                      💬 Serve aiuto? Scrivici su WhatsApp (+39 350 575 7501)
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#9a3412;text-align:center;line-height:1.5;">
                Per qualsiasi domanda rispondi a questa email o scrivi a <a href="mailto:info@prolocogasperina.it" style="color:#ea580c;font-weight:700;">info@prolocogasperina.it</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#431407;padding:22px 30px;text-align:center;">
              <div style="color:#fdba74;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:800;margin-bottom:4px;">Pro Loco Gasperina APS</div>
              <div style="color:rgba(255,255,255,0.6);font-size:11px;">Gasperina (CZ) · prolocogasperina.it</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}


