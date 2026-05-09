import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    // Instantiate Resend here so it doesn't fail at build time if the ENV var is missing locally
    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
    
    const body = await request.json();
    const { nome, cognome, email, tipoSocio, gdpr, statuto } = body;

    // Semplice validazione server-side
    if (!nome || !cognome || !email || !gdpr || !statuto) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 });
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1510;">
        <h2 style="color: #1B4BAA; border-bottom: 2px solid #E8A91A; padding-bottom: 10px;">Nuova richiesta di Iscrizione</h2>
        <p>È stata ricevuta una nuova richiesta di iscrizione dal sito web:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="background: #f7f4ee;">
            <td style="padding: 10px; border: 1px solid #ddd8ce;"><strong>Nome e Cognome:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd8ce;">${nome} ${cognome}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd8ce;"><strong>Email Contatto:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd8ce;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr style="background: #f7f4ee;">
            <td style="padding: 10px; border: 1px solid #ddd8ce;"><strong>Tipo Socio richiesto:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd8ce; text-transform: capitalize;">Socio ${tipoSocio}</td>
          </tr>
        </table>

        <div style="margin-top: 20px; font-size: 13px; color: #7a7268;">
          <p><strong>Consensi verificati:</strong></p>
          <ul>
            <li>✅ Accettazione Statuto confermata</li>
            <li>✅ Consenso GDPR (Trattamento Dati) confermato</li>
          </ul>
        </div>
        
        <p style="margin-top: 30px; font-size: 12px; color: #b8b3a8;">
          Questa email è stata generata automaticamente dal modulo iscrizioni su prolocogasperina.it
        </p>
      </div>
    `;

    const data = await resend.emails.send({
      from: 'Pro Loco Gasperina <noreply@prolocogasperina.it>',
      to: 'iscrizioni@prolocogasperina.it',
      subject: `Nuova Iscrizione: ${nome} ${cognome}`,
      replyTo: email,
      html: htmlContent,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Errore durante l\'invio' }, { status: 500 });
  }
}
