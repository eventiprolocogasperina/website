import { SafeResend as Resend } from '@/server/email/resend';
import { type OrderWithTickets, parseOrderNotes } from '@/lib/data/tickets';
import { sendTelegramNotification } from '@/lib/telegram';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPayLinkEmail(
  order: OrderWithTickets,
  options?: { parentOrder?: OrderWithTickets | null; customMessage?: string }
): Promise<void> {
  const isZuccaland =
    order.tickets.some((t) => t.eventId?.includes('zuccaland')) ||
    options?.parentOrder?.tickets.some((t) => t.eventId?.includes('zuccaland')) ||
    false;

  const eventTitle = isZuccaland ? 'Zuccaland 2026' : 'Assaggia & Passeggia';
  const eventEmoji = isZuccaland ? '🎃' : '🍷';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
  const payUrl = `${baseUrl}/paga/${order.id}`;
  const orderRef = order.id.replace(/-/g, '').substring(0, 8).toUpperCase();

  // Read event logo for CID inline email embedding
  const eventLogoPath = isZuccaland
    ? path.join(process.cwd(), 'public/img/zuccaland/Logo.png')
    : path.join(process.cwd(), 'public/img/logo_white_fg.png');
  const eventLogoBuffer = fs.existsSync(eventLogoPath) ? fs.readFileSync(eventLogoPath) : null;

  const parsedNotes = parseOrderNotes(order.notes);
  const parentParsed = options?.parentOrder ? parseOrderNotes(options.parentOrder.notes) : null;
  const targetDayKey = parentParsed?.dayKey !== 'unspecified' && parentParsed?.dayKey ? parentParsed.dayKey : parsedNotes.dayKey;
  const timeText = targetDayKey === '24' ? 'Orario di ingresso 11:00 - 17:00' : 'Ingresso dalle ore 10:30';
  const eventDate =
    parentParsed?.eventDate ||
    parsedNotes.eventDate ||
    (isZuccaland ? 'Sabato 17, Domenica 18 o Domenica 25 Ottobre 2026' : 'Gasperina (CZ)');

  // Raggruppa i biglietti/servizi per tipo
  const ticketTypesCount = order.tickets.reduce((acc, t) => {
    acc[t.type] = {
      count: (acc[t.type]?.count || 0) + 1,
      price: t.price,
    };
    return acc;
  }, {} as Record<string, { count: number; price: number }>);

  // Attività e laboratori inclusi
  const allActivities = [...(parentParsed?.activities || []), ...(parsedNotes.activities || [])];
  const uniqueActivities = Array.from(new Set(allActivities));

  const greetingMsg = options?.parentOrder
    ? `Come concordato con il nostro staff, abbiamo predisposto l'integrazione per la tua prenotazione a <strong>${eventTitle}</strong> (Rif. #${options.parentOrder.id
        .replace(/-/g, '')
        .substring(0, 8)
        .toUpperCase()}). Clicca sul pulsante sottostante per completare il pagamento.`
    : (options?.customMessage ||
      `Abbiamo preparato la tua prenotazione per <strong>${eventTitle}</strong>! Per confermare definitivamente i posti e ricevere la ricevuta ufficiale con i biglietti e i QR code, completa il pagamento online sicuro cliccando sul pulsante qui sotto.`);

  let emailHtml = '';

  if (isZuccaland) {
    // ─── ZUCCALAND PAY-BY-LINK TEMPLATE (Matches Confirmation Email) ──────────
    const itemsRowsHtml = Object.entries(ticketTypesCount)
      .map(
        ([type, info]) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #fed7aa; color: #431407; font-size: 13.5px;">
            <b>${info.count}x</b> ${type}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #fed7aa; color: #ea580c; font-size: 13.5px; text-align: right; font-weight: 800;">
            €${(info.price * info.count).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join('');

    const activitiesHtml =
      uniqueActivities.length > 0
        ? `
      <!-- Selected Activities Card -->
      <div style="background:#fff7ed;border-radius:14px;padding:20px;margin-bottom:24px;border:1.5px solid #fed7aa;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span style="font-size:14px;font-weight:800;color:#ea580c;display:flex;align-items:center;gap:6px;">
            🎨 Laboratori & Attività Riservate
          </span>
          <span style="background:#ea580c;color:#ffffff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:999px;text-transform:uppercase;">
            Inclusi
          </span>
        </div>
        <p style="margin:0 0 12px;font-size:12.5px;color:#9a3412;line-height:1.4;">
          Attività incluse nella tua prenotazione:
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${uniqueActivities
            .map(
              (act) => `
            <div style="background:#ffffff;border:1px solid #fdba74;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:8px;">
              <span style="font-size:16px;">✨</span>
              <span style="color:#431407;font-size:13px;font-weight:700;">${act}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
        : '';

    emailHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link di Pagamento - Zuccaland 2026</title>
</head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 8px 30px rgba(234,88,12,0.12);border:1.5px solid rgba(234,88,12,0.2);">

          <!-- Header with Logo -->
          <tr>
            <td style="background:#ffffff;padding:36px 30px;text-align:center;border-bottom:4px solid #ea580c;">
              ${
                eventLogoBuffer
                  ? `<img src="cid:event_header_logo" alt="Zuccaland 2026" style="height:85px;margin-bottom:12px;object-fit:contain;" />`
                  : `<h1 style="color:#ea580c;margin:0 0 6px;font-size:26px;font-weight:900;">🎃 Zuccaland 2026</h1>`
              }
              <div style="color:#7c2d12;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Il villaggio delle zucche di Gasperina</div>
              <div style="display:inline-block;background:#fff7ed;border:1px solid #fdba74;color:#ea580c;font-size:12px;margin-top:10px;font-weight:800;padding:4px 14px;border-radius:999px;">
                🎃 ${eventDate} · ${timeText} · Gasperina (CZ)
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 30px;">
              <!-- Status Alert Box -->
              <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;">
                <span style="font-size:22px;margin-right:12px;">💳</span>
                <div>
                  <div style="color:#9a3412;font-size:15px;font-weight:800;">Link di Pagamento Predisposto</div>
                  <div style="color:#c2410c;font-size:13px;">${
                    options?.parentOrder ? 'Integrazione servizi per la tua prenotazione' : 'Completa il saldo per confermare i tuoi biglietti'
                  }</div>
                </div>
              </div>

              <p style="margin:0 0 8px;font-size:20px;font-weight:800;color:#431407;">Ciao ${order.buyerName}!</p>
              <p style="margin:0 0 24px;font-size:14px;color:#7c2d12;line-height:1.6;">
                ${greetingMsg}
              </p>

              <!-- Order Summary Card -->
              <div style="background:#fffaf5;border-radius:14px;padding:22px;margin-bottom:24px;border:1px solid #ffedd5;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #fed7aa;padding-bottom:10px;">
                  <span style="font-size:11px;color:#ea580c;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">Riepilogo Importo</span>
                  <span style="background:#ea580c;color:#ffffff;font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px;">#${orderRef}</span>
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:12.5px;color:#9a3412;padding-bottom:10px;font-weight:700;">📅 Data Prenotata:</td>
                    <td style="text-align:right;font-size:12.5px;color:#ea580c;font-weight:800;padding-bottom:10px;">
                      ${eventDate}<br/>
                      <span style="font-size:11.5px;color:#c2410c;font-weight:600;">${timeText}</span>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:6px;padding-bottom:10px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        ${itemsRowsHtml}
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px dashed #fdba74;padding-top:12px;font-size:14px;color:#7c2d12;font-weight:800;">Totale da Saldare:</td>
                    <td style="border-top:1px dashed #fdba74;padding-top:12px;text-align:right;font-size:22px;color:#ea580c;font-weight:900;">€${order.totalAmount.toFixed(
                      2
                    )}</td>
                  </tr>
                </table>
              </div>

              ${activitiesHtml}

              <!-- Big Primary CTA Button -->
              <div style="text-align:center;margin:32px 0 24px;">
                <a href="${payUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;text-decoration:none;font-weight:800;font-size:16px;padding:15px 36px;border-radius:999px;box-shadow:0 4px 16px rgba(234,88,12,0.35);letter-spacing:0.3px;">
                  💳 Procedi al Pagamento Sicuro (€${order.totalAmount.toFixed(2)})
                </a>
              </div>

              <!-- Nexi Gateway Security Note -->
              <div style="background:#fffaf5;border:1px solid #fed7aa;border-radius:12px;padding:14px 18px;margin-bottom:20px;text-align:center;">
                <p style="margin:0;font-size:12.5px;color:#9a3412;line-height:1.5;">
                  🔒 <strong>Transazione protetta con Nexi XPay:</strong><br/>
                  Puoi pagare comodamente con Carta di Credito/Debito, Apple Pay o Google Pay.
                </p>
              </div>

              <!-- Post-payment confirmation guarantee -->
              <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 18px;margin-bottom:24px;text-align:center;">
                <p style="margin:0;font-size:12.5px;color:#065f46;line-height:1.5;">
                  🎟️ <strong>Emissione Immediata Biglietti:</strong><br/>
                  Subito dopo aver completato la transazione, riceverai una nuova email con il PDF contenente tutti i tuoi <strong>biglietti ufficiali e i QR code</strong> per l'accesso rapido.
                </p>
              </div>

              <!-- Location & Navigation Card -->
              <div style="background:#fef3c7;border-radius:14px;padding:20px;border:1.5px solid #fcd34d;margin-bottom:24px;text-align:center;">
                <div style="font-size:15px;font-weight:800;color:#92400e;margin-bottom:6px;">📍 Come Raggiungere Zuccaland</div>
                <div style="font-size:13px;color:#78350f;line-height:1.5;margin-bottom:14px;">
                  Il villaggio delle zucche si trova a <strong>Gasperina (CZ)</strong>. Clicca per aprire la posizione sul navigatore:
                </div>
                <a href="https://maps.google.com/?q=38.743791,16.481122" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;padding:11px 22px;border-radius:999px;box-shadow:0 3px 10px rgba(234,88,12,0.25);">
                  🗺️ Apri su Google Maps
                </a>
              </div>

              <!-- WhatsApp Support -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="https://wa.me/393505757501?text=${encodeURIComponent(
                      `Ciao, vorrei informazioni sul link di pagamento per Zuccaland #${orderRef}`
                    )}" target="_blank" style="display:inline-block;color:#059669;text-decoration:none;font-weight:700;font-size:13px;">
                      💬 Serve aiuto con il pagamento? Scrivici su WhatsApp (+39 350 575 7501)
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
  } else {
    // ─── ASSAGGIA & PASSEGGIA PAY-BY-LINK TEMPLATE ───────────────────────────
    const itemsRowsHtml = Object.entries(ticketTypesCount)
      .map(
        ([type, info]) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5d5be; color: #1a1a1a; font-size: 13.5px;">
            <b>${info.count}x</b> ${type}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5d5be; color: #1B4BAA; font-size: 13.5px; text-align: right; font-weight: 800;">
            €${(info.price * info.count).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join('');

    emailHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link di Pagamento - Assaggia & Passeggia</title>
</head>
<body style="margin:0;padding:0;background:#f0ece6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ece6;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 8px 30px rgba(0,0,0,0.08);border:1px solid #e8d9b8;">

          <!-- Header -->
          <tr>
            <td style="background:#1B4BAA;padding:36px 30px;text-align:center;border-bottom:4px solid #E8C042;">
              ${
                eventLogoBuffer
                  ? `<img src="cid:event_header_logo" alt="Pro Loco Gasperina" style="height:60px;margin-bottom:12px;object-fit:contain;" />`
                  : `<h1 style="color:#ffffff;margin:0 0 6px;font-size:24px;font-weight:800;">🍷 Assaggia & Passeggia</h1>`
              }
              <div style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.5px;">Assaggia & Passeggia</div>
              <div style="color:#E8C042;font-size:12px;margin-top:6px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Gasperina (CZ) · Calabria</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 30px;">
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;">
                <span style="font-size:22px;margin-right:12px;">💳</span>
                <div>
                  <div style="color:#1e40af;font-size:15px;font-weight:800;">Link di Pagamento Predisposto</div>
                  <div style="color:#1d4ed8;font-size:13px;">${
                    options?.parentOrder ? 'Integrazione servizi per la tua prenotazione' : 'Completa il saldo per confermare i tuoi biglietti'
                  }</div>
                </div>
              </div>

              <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1a1a1a;">Ciao ${order.buyerName}!</p>
              <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;">
                ${greetingMsg}
              </p>

              <!-- Order Summary Card -->
              <div style="background:#F9F3E4;border-radius:14px;padding:22px;margin-bottom:24px;border:1px solid #e8d9b8;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #e5d5be;padding-bottom:10px;">
                  <span style="font-size:11px;color:#78350f;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">Riepilogo Ordine</span>
                  <span style="background:#1B4BAA;color:#ffffff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">#${orderRef}</span>
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td colspan="2" style="padding-bottom:10px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        ${itemsRowsHtml}
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px dashed #d1c0a5;padding-top:12px;font-size:14px;color:#1a1a1a;font-weight:700;">Totale da Saldare:</td>
                    <td style="border-top:1px dashed #d1c0a5;padding-top:12px;text-align:right;font-size:20px;color:#1B4BAA;font-weight:800;">€${order.totalAmount.toFixed(
                      2
                    )}</td>
                  </tr>
                </table>
              </div>

              <!-- Button CTA -->
              <div style="text-align:center;margin:32px 0 24px;">
                <a href="${payUrl}" target="_blank" style="display:inline-block;background:#1B4BAA;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 34px;border-radius:999px;box-shadow:0 4px 14px rgba(27,75,170,0.3);">
                  💳 Procedi al Pagamento Sicuro (€${order.totalAmount.toFixed(2)})
                </a>
              </div>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin-bottom:24px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
                  🔒 <strong>Pagamento Protetto tramite gateway Nexi XPay.</strong><br/>
                  Puoi pagare comodamente con Carte di Credito/Debito, Apple Pay e Google Pay.
                </p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="https://wa.me/393505757501?text=${encodeURIComponent(
                      `Ciao, ho bisogno di assistenza per il link di pagamento #${orderRef}`
                    )}" target="_blank" style="display:inline-block;color:#059669;text-decoration:none;font-weight:700;font-size:13px;">
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

  const { error } = await resend.emails.send({
    from: 'Pro Loco Gasperina <biglietti@prolocogasperina.it>',
    to: order.buyerEmail,
    replyTo: 'info@prolocogasperina.it',
    subject: `${eventEmoji} Link di Pagamento per ${eventTitle} (Ord. #${orderRef})`,
    html: emailHtml,
    attachments: [
      ...(eventLogoBuffer
        ? [
            {
              filename: isZuccaland ? 'logo-zuccaland.png' : 'logo-proloco.png',
              content: eventLogoBuffer,
              contentType: 'image/png',
              contentId: 'event_header_logo',
            },
          ]
        : []),
    ],
  });

  if (error) {
    console.error('Error sending pay-by-link email:', error);
    throw new Error(error.message);
  }

  sendTelegramNotification(
    `📤 <b>Pay-by-Link INVIATO via Email</b>\n\n` +
      `🎪 <b>Evento:</b> ${eventEmoji} ${eventTitle}\n` +
      `💰 <b>Importo da saldare:</b> €${order.totalAmount.toFixed(2)}\n` +
      `🔗 <b>Rif. Ordine:</b> #${orderRef}`
  ).catch((err) => console.error('Telegram send-email notification error:', err));
}
