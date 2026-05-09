import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateSubscriptionPDF } from '@/lib/generatePDF';

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

    const body = await request.json();
    const {
      nome, cognome, luogoNascita, provNascita, dataNascita,
      residenza, provResidenza, cap, indirizzo, civico,
      codiceFiscale, cellulare, email,
      tipoSocio, quotaSostenitore,
      statuto, privacy,
    } = body;

    // Server-side validation
    if (!nome || !cognome || !luogoNascita || !dataNascita || !residenza || !indirizzo || !codiceFiscale || !cellulare || !email || !statuto || !privacy) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 });
    }

    const anno = new Date().getFullYear();
    const quotaBase = 20;
    const quotaExtra = tipoSocio === 'sostenitore' && quotaSostenitore ? parseInt(quotaSostenitore) : 0;
    const quotaTotale = quotaBase + quotaExtra;
    const dataNascitaFormatted = new Date(dataNascita + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // ── Email 1: Notifica all'associazione ──
    const adminHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1510;">
        <div style="background: #1B4BAA; padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <h2 style="margin: 0; color: #ffffff; font-size: 18px;">Nuova Richiesta di Iscrizione</h2>
          <p style="margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">Pro Loco di Gasperina APS — Anno ${anno}</p>
        </div>
        
        <div style="background: #ffffff; border: 1px solid #e5e2dc; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
          <h3 style="color: #1B4BAA; font-size: 14px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">Dati Anagrafici</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #f7f4ee;">
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-weight: 600; width: 40%; font-size: 13px;">Nome e Cognome</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-size: 13px;">${nome} ${cognome}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-weight: 600; font-size: 13px;">Nato/a a</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-size: 13px;">${luogoNascita}${provNascita ? ` (${provNascita})` : ''} il ${dataNascitaFormatted}</td>
            </tr>
            <tr style="background: #f7f4ee;">
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-weight: 600; font-size: 13px;">Residente a</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-size: 13px;">${residenza}${provResidenza ? ` (${provResidenza})` : ''}${cap ? ` — ${cap}` : ''}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-weight: 600; font-size: 13px;">Indirizzo</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-size: 13px;">${indirizzo}${civico ? `, ${civico}` : ''}</td>
            </tr>
            <tr style="background: #f7f4ee;">
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-weight: 600; font-size: 13px;">Codice Fiscale</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-size: 13px; text-transform: uppercase;">${codiceFiscale}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-weight: 600; font-size: 13px;">Cellulare</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-size: 13px;">${cellulare}</td>
            </tr>
            <tr style="background: #f7f4ee;">
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-weight: 600; font-size: 13px;">Email</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-size: 13px;"><a href="mailto:${email}">${email}</a></td>
            </tr>
          </table>

          <h3 style="color: #1B4BAA; font-size: 14px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em;">Adesione</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="background: #fef6dc;">
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-weight: 600; font-size: 13px;">Tipo Socio</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-size: 13px; text-transform: capitalize; font-weight: 600;">Socio ${tipoSocio}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-weight: 600; font-size: 13px;">Quota Totale</td>
              <td style="padding: 8px 12px; border: 1px solid #e5e2dc; font-size: 13px; font-weight: 700; color: #1B4BAA;">€ ${quotaTotale}</td>
            </tr>
          </table>

          <div style="font-size: 12px; color: #7a7268; padding-top: 12px; border-top: 1px solid #e5e2dc;">
            <p>✅ Accettazione Statuto confermata</p>
            <p>✅ Consenso Trattamento Dati confermato</p>
          </div>
        </div>
        
        <p style="margin-top: 16px; font-size: 11px; color: #b8b3a8; text-align: center;">
          Generata automaticamente dal modulo iscrizioni — prolocogasperina.it
        </p>
      </div>
    `;

    // ── Email 2: Conferma al richiedente ──
    const userHtml = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1510;">
        <div style="background: #1B4BAA; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h2 style="margin: 0; color: #ffffff; font-size: 20px;">Pro Loco di Gasperina APS</h2>
          <p style="margin: 6px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">Conferma ricezione richiesta di iscrizione</p>
        </div>
        
        <div style="background: #ffffff; border: 1px solid #e5e2dc; border-top: none; border-radius: 0 0 12px 12px; padding: 28px 24px;">
          <p style="font-size: 15px; line-height: 1.7; color: #2a2520;">
            Gentile <strong>${nome} ${cognome}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.7; color: #2a2520;">
            La informiamo che la Sua richiesta di iscrizione all'Associazione Pro Loco di Gasperina APS in qualità di <strong style="color: #1B4BAA;">Socio ${tipoSocio}</strong> è stata ricevuta correttamente.
          </p>
          
          <div style="background: #f7f4ee; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #E8A91A;">
            <p style="margin: 0; font-size: 14px; color: #2a2520; line-height: 1.7;">
              <strong>Cosa succede ora?</strong><br>
              Il Consiglio Direttivo prenderà in carico la Sua richiesta e La contatterà quanto prima per comunicarLe:
            </p>
            <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: #2a2520; line-height: 1.8;">
              <li>L'esito dell'approvazione</li>
              <li>Il numero di tessera socio</li>
              <li>Le modalità e il link per il pagamento della quota associativa (€ ${quotaTotale})</li>
            </ul>
          </div>

          <p style="font-size: 13px; color: #7a7268; line-height: 1.7;">
            L'iscrizione si intende effettiva al momento della comunicazione dell'accettazione da parte del Consiglio Direttivo. La tessera UNPLI è valida fino al 31 dicembre ${anno}.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e2dc; margin: 20px 0;" />
          
          <p style="font-size: 13px; color: #2a2520; line-height: 1.7;">
            Cordiali saluti,<br>
            <strong>Pro Loco di Gasperina APS</strong><br>
            <span style="font-size: 12px; color: #7a7268;">
              Via Raffaele Milano, SNC — 88060 Gasperina (CZ)<br>
              Tel. 327 978 3232 · prolocogasperina@gmail.com
            </span>
          </p>
        </div>
        
        <p style="margin-top: 12px; font-size: 11px; color: #b8b3a8; text-align: center;">
          Questa email è stata generata automaticamente. Non rispondere a questo indirizzo.
        </p>
      </div>
    `;

    // Generate PDF
    const pdfBuffer = generateSubscriptionPDF({
      nome, cognome, luogoNascita, provNascita, dataNascita,
      residenza, provResidenza, cap, indirizzo, civico,
      codiceFiscale, cellulare, email, tipoSocio, quotaSostenitore,
    });

    const pdfFilename = `Iscrizione_${cognome}_${nome}_${anno}.pdf`;
    const attachment = { filename: pdfFilename, content: pdfBuffer };

    // Send both emails concurrently
    const [adminResult, userResult] = await Promise.all([
      resend.emails.send({
        from: 'Pro Loco Gasperina <noreply@prolocogasperina.it>',
        to: 'iscrizioni@prolocogasperina.it',
        subject: `Nuova Iscrizione: ${nome} ${cognome} — Socio ${tipoSocio}`,
        replyTo: email,
        html: adminHtml,
        attachments: [attachment],
      }),
      resend.emails.send({
        from: 'Pro Loco Gasperina <noreply@prolocogasperina.it>',
        to: email,
        subject: `Conferma richiesta di iscrizione — Pro Loco di Gasperina APS`,
        html: userHtml,
        attachments: [attachment],
      }),
    ]);

    return NextResponse.json({ admin: adminResult, user: userResult });
  } catch (error) {
    console.error('Subscription email error:', error);
    return NextResponse.json({ error: "Errore durante l'invio" }, { status: 500 });
  }
}
