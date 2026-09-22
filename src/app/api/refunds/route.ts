import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { sendTelegramNotification } from '@/lib/telegram';
import { validateIban } from '@/lib/validation/iban';

function getDb() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('Missing POSTGRES_URL');
  }
  return neon(process.env.POSTGRES_URL);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      fullName, 
      email, 
      phone, 
      bookingNumbers, 
      accountHolder,
      iban, 
      reason, 
      eventSlug = 'zuccaland' 
    } = body;

    // Validazione campi obbligatori
    if (!fullName?.trim() || !email?.trim() || !bookingNumbers?.trim()) {
      return NextResponse.json(
        { error: 'Nome e Cognome, Email e Numero/i di prenotazione sono obbligatori.' },
        { status: 400 }
      );
    }

    if (!accountHolder?.trim()) {
      return NextResponse.json(
        { error: 'L\'intestatario del conto corrente è obbligatorio per l\'emissione del bonifico.' },
        { status: 400 }
      );
    }

    // Validazione IBAN completa (struttura lettere/cifre, CIN e checksum MOD-97)
    const ibanResult = validateIban(iban);
    if (!ibanResult.valid) {
      return NextResponse.json(
        { error: ibanResult.error || 'Codice IBAN non valido.' },
        { status: 400 }
      );
    }
    const cleanIban = ibanResult.cleanIban;

    const sql = getDb();
    const id = `rf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Verifica automatica opzionale se il codice ordine esiste
    let matchedOrderSummary = '';
    try {
      const cleanBooking = bookingNumbers.trim();
      const existingOrders = await sql`
        SELECT id, "buyerName", "buyerEmail", "totalAmount", status 
        FROM orders 
        WHERE id = ${cleanBooking} OR id ILIKE ${'%' + cleanBooking + '%'} 
        LIMIT 1
      `;
      if (existingOrders.length > 0) {
        const ord = existingOrders[0];
        matchedOrderSummary = ` (Ordine collegato: ${ord.id} - €${ord.totalAmount} - ${ord.status})`;
      }
    } catch {
      // Ignora l'errore se la ricerca fallisce
    }

    await sql`
      INSERT INTO refund_requests (
        id, 
        event_slug, 
        full_name, 
        email, 
        phone, 
        booking_numbers, 
        account_holder,
        iban, 
        reason, 
        status, 
        created_at, 
        updated_at
      ) VALUES (
        ${id}, 
        ${eventSlug}, 
        ${fullName.trim()}, 
        ${email.trim().toLowerCase()}, 
        ${phone ? phone.trim() : null}, 
        ${bookingNumbers.trim()}, 
        ${accountHolder.trim()},
        ${cleanIban}, 
        ${reason ? reason.trim() : null}, 
        'pending', 
        CURRENT_TIMESTAMP, 
        CURRENT_TIMESTAMP
      )
    `;

    // Notifica Telegram in tempo reale all'amministrazione
    const telegramMsg = `⚠️ <b>NUOVA RICHIESTA DI RIMBORSO ZUCCALAND</b>\n\n` +
      `🆔 <b>ID Pratica:</b> <code>${id}</code>\n` +
      `👤 <b>Intestatario Prenotazione:</b> ${fullName.trim()}\n` +
      `📧 <b>Email:</b> ${email.trim()}\n` +
      `📞 <b>Telefono:</b> ${phone ? phone.trim() : 'Non indicato'}\n` +
      `🎫 <b>Numero/i Prenotazione:</b> <code>${bookingNumbers.trim()}</code>${matchedOrderSummary}\n` +
      `👤 <b>Intestatario Conto:</b> <b>${accountHolder.trim()}</b>\n` +
      `🏦 <b>IBAN (Bonifico):</b> <code>${cleanIban}</code>\n` +
      (reason ? `📝 <b>Note richiedente:</b> ${reason.trim()}\n` : '') +
      `\n🔗 Gestisci la richiesta nel pannello: https://prolocogasperina.it/admin/rimborsi`;

    sendTelegramNotification(telegramMsg).catch(err => console.error('Telegram notification error:', err));

    return NextResponse.json({
      success: true,
      id,
      message: 'Richiesta di rimborso registrata con successo.'
    });

  } catch (error: any) {
    console.error('Errore creazione richiesta rimborso:', error);
    return NextResponse.json(
      { error: 'Si è verificato un errore interno durante la registrazione della richiesta.' },
      { status: 500 }
    );
  }
}
