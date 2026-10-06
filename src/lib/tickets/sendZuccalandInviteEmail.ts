import QRCode from 'qrcode';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ZuccalandInviteParams {
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;
  eventDateLabel: string;
  inviteCount: number;
  customNotes?: string;
  orderRef: string;
  primaryQrCode: string;
}

export async function sendZuccalandInviteEmail(params: ZuccalandInviteParams): Promise<{ success: boolean; error?: any }> {
  try {
    const {
      recipientName,
      recipientEmail,
      eventDateLabel,
      inviteCount,
      customNotes,
      orderRef,
      primaryQrCode
    } = params;

    // Load Zuccaland logo for header if exists
    const eventLogoPath = path.join(process.cwd(), 'public/img/zuccaland/Logo.png');
    const proLocoLogoPath = path.join(process.cwd(), 'public/img/logo_white_fg.png');
    const eventLogoBuffer = fs.existsSync(eventLogoPath) ? fs.readFileSync(eventLogoPath) : null;
    const proLocoLogoBuffer = fs.existsSync(proLocoLogoPath) ? fs.readFileSync(proLocoLogoPath) : null;

    // Generate high resolution QR code PNG buffer for body embedding (CID)
    const qrPngBuffer = await QRCode.toBuffer(primaryQrCode, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 400,
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    const clausesHtml = customNotes
      ? `<div style="margin-top: 24px; padding: 18px; background-color: #fffbeeb3; border: 1px solid #f59e0b; border-radius: 14px; text-align: left; box-shadow: 0 4px 12px rgba(245,158,11,0.08);">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <span style="font-size: 16px;">ℹ️</span>
            <h4 style="margin: 0; color: #92400e; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Info & Condizioni dell'Invito</h4>
          </div>
          <p style="margin: 0; color: #78350f; font-size: 13.5px; line-height: 1.6;">${customNotes.replace(/\n/g, '<br/>')}</p>
         </div>`
      : '';

    const htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Il tuo Invito Ufficiale per Zuccaland 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #090d16; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0f172a; border-radius: 24px; overflow: hidden; border: 1px solid #1e293b; box-shadow: 0 25px 50px rgba(0,0,0,0.6);">
          
          <!-- Sleek Dark Header Banner with Orange Accents -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%); padding: 36px 24px 28px; border-bottom: 2px solid #ea580c; position: relative;">
              ${eventLogoBuffer ? `<img src="cid:event_header_logo" alt="Zuccaland" width="170" style="max-width: 170px; height: auto; margin-bottom: 16px; display: block; filter: drop-shadow(0 6px 12px rgba(234,88,12,0.3));" />` : ''}
              <div style="display: inline-block; padding: 4px 14px; background-color: rgba(234,88,12,0.15); border: 1px solid rgba(234,88,12,0.4); border-radius: 999px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.18em; color: #fb923c; font-weight: 800; margin-bottom: 10px;">
                PASS INGRESSO UFFICIALE 🎃
              </div>
              <h1 style="margin: 0; font-size: 25px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">
                Ti Aspettiamo a Zuccaland! ✨
              </h1>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px; text-align: center;">
              
              <!-- Catchy & Cordial Greeting -->
              <h2 style="margin: 0 0 14px 0; font-size: 21px; font-weight: 800; color: #f8fafc; letter-spacing: -0.01em;">
                Gentile <span style="color: #fb923c;">${recipientName}</span>,
              </h2>
              <p style="margin: 0 0 26px 0; font-size: 15px; color: #cbd5e1; line-height: 1.65;">
                Abbiamo il grande piacere di riservarti questo pass d'ingresso per far parte della magia di <b>Zuccaland 2026</b>! Prepara il tuo entusiasmo e unisciti a noi per una giornata indimenticabile di festa, tradizione e sorrisi targata <b>Pro Loco Gasperina</b>.
              </p>

              <!-- Event Details Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border: 1px solid #334155; border-radius: 18px; margin-bottom: 28px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);">
                <tr>
                  <td style="padding: 22px; text-align: left;">
                    <div style="font-size: 11px; color: #fb923c; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 800; margin-bottom: 10px;">Riepilogo del tuo Pass</div>
                    <div style="font-size: 15.5px; color: #f8fafc; margin-bottom: 8px; display: flex; align-items: center;">
                      <span style="color: #94a3b8; width: 120px; display: inline-block;">📅 <b>Data Evento:</b></span> 
                      <strong style="color: #fb923c; font-size: 16px;">${eventDateLabel}</strong>
                    </div>
                    <div style="font-size: 15.5px; color: #f8fafc; margin-bottom: 8px;">
                      <span style="color: #94a3b8; width: 120px; display: inline-block;">🎟️ <b>Ingressi Inclusi:</b></span> 
                      <strong style="color: #4ade80; font-size: 16px;">${inviteCount} ${inviteCount === 1 ? 'Persona' : 'Persone'}</strong>
                    </div>
                    <div style="font-size: 14px; color: #94a3b8;">
                      <span style="color: #94a3b8; width: 120px; display: inline-block;">🔑 <b>Codice Invito:</b></span> 
                      <span style="font-family: monospace; color: #38bdf8; font-weight: 700; font-size: 15px;">#${orderRef}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Embedded QR Code Section -->
              <div style="background-color: #ffffff; padding: 24px; border-radius: 20px; display: inline-block; margin-bottom: 16px; box-shadow: 0 12px 30px rgba(0,0,0,0.4), 0 0 0 4px rgba(251,146,60,0.2);">
                <img src="cid:invite_qr_code" width="220" height="220" alt="QR Code Invito Zuccaland" style="display: block; margin: 0 auto; width: 220px; height: 220px;" />
              </div>
              
              <div style="font-size: 13.5px; color: #38bdf8; font-weight: 700; margin-bottom: 24px; line-height: 1.5; background-color: rgba(56,189,248,0.1); padding: 10px 16px; border-radius: 12px; display: inline-block;">
                📱 <b>Salva questa e-mail!</b> Mostra questo QR Code dallo smartphone ai varchi d'accesso.
              </div>

              <!-- Custom Notes / Clauses -->
              ${clausesHtml}

              <!-- Location & Time note -->
              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: center; font-size: 13px; color: #94a3b8; line-height: 1.6;">
                📍 <b>Location:</b> Gasperina (CZ) · Apertura varchi ore 10:30<br/>
                Non vediamo l'ora di accoglierti!
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #090d16; padding: 22px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b;">
              <p style="margin: 0 0 6px 0; font-weight: 600;">Associazione Pro Loco Gasperina APS · C.F. 99330790793</p>
              <p style="margin: 0; color: #475569;">Email generata dal sistema di accreditamento Ufficiale Zuccaland 2026.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const attachments: any[] = [
      {
        filename: `qr-invito-${orderRef}.png`,
        content: qrPngBuffer,
        contentType: 'image/png',
        contentId: 'invite_qr_code',
      },
    ];

    if (eventLogoBuffer) {
      attachments.push({
        filename: 'logo-zuccaland.png',
        content: eventLogoBuffer,
        contentType: 'image/png',
        contentId: 'event_header_logo',
      });
    }

    const { error } = await resend.emails.send({
      from: 'Pro Loco Gasperina <biglietti@prolocogasperina.it>',
      to: recipientEmail,
      replyTo: 'info@prolocogasperina.it',
      subject: `✨ Il tuo Pass d'Ingresso Ufficiale per Zuccaland 2026! 🎃`,
      html: htmlContent,
      attachments,
    });

    if (error) {
      console.error('Resend error for Zuccaland invite email:', error);
      return { success: false, error };
    }

    console.log(`✅ Zuccaland invite email successfully sent to ${recipientEmail} for order #${orderRef}`);
    return { success: true };
  } catch (err: any) {
    console.error('Exception sending Zuccaland invite email:', err);
    return { success: false, error: err.message || err };
  }
}
