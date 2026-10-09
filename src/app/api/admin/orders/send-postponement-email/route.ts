import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { createElement } from 'react';
import { PostponementEmailDocument } from '@/lib/tickets/PostponementEmailDocument';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      eventId = 'zuccaland-2026',
      targetDay = 'all', // '10', '11', '25', or 'all'
      newDate = 'Domenica 25 Ottobre 2026',
      subject = '📢 Comunicazione Ufficiale Meteo: Rinvio Zuccaland 2026',
      customMessage = '',
      sendMode = 'test', // 'test' or 'broadcast'
      testEmail = '',
    } = body;

    const sql = getDb();

    // 1. Fetch site settings for defaults if customMessage is empty
    const rows = await sql`SELECT key, value FROM site_settings WHERE key LIKE 'email_postponement_%' OR key = 'whatsapp_topics'`;
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key as string] = r.value as string;
    }

    const defaultMessage = settings.email_postponement_body ||
      `Causa avverse condizioni meteorologiche accertate, l'evento Zuccaland è rinviato alla nuova data di {{nuova_data}}.\n\nTi rassicuriamo che tutti i biglietti e le attività già prenotati per il tuo ordine {{ordine_id}} rimangono 100% validi per la nuova data di recupero.\n\nPer qualsiasi necessità o chiarimento, il nostro team è a tua completa disposizione via WhatsApp.`;

    const finalMessageBody = customMessage?.trim() || defaultMessage;
    const finalSubject = subject?.trim() || '📢 Comunicazione Ufficiale Meteo: Rinvio Zuccaland 2026';

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY non configurata nelle variabili d\'ambiente.',
      }, { status: 400 });
    }

    const resend = new Resend(resendApiKey);

    // 2. Determine recipients list
    let recipients: Array<{ name: string; email: string; orderId: string }> = [];

    if (sendMode === 'test') {
      if (!testEmail || !testEmail.includes('@')) {
        return NextResponse.json({
          success: false,
          error: 'Inserisci un indirizzo email valido per effettuare il test.',
        }, { status: 400 });
      }
      recipients = [{ name: 'Test Acquirente', email: testEmail.trim(), orderId: 'ORD-TEST-2026' }];
    } else {
      // Fetch PAID orders for the event (by ticket eventId or order notes)
      const orders = await sql`
        SELECT o.id, o."buyerName", o."buyerEmail", o.notes
        FROM orders o
        WHERE (o.status = 'PAID' OR o.status = 'paid')
          AND o."deletedAt" IS NULL
          AND o."buyerEmail" IS NOT NULL
          AND o."buyerEmail" != ''
          AND (
            o.id IN (SELECT DISTINCT "orderId" FROM tickets WHERE "eventId" ILIKE '%zuccaland%')
            OR o.notes ILIKE '%zuccaland%'
          )
      `;

      function parseDayKey(notes?: string | null): string {
        if (!notes) return 'unspecified';
        const notesLower = notes.toLowerCase();
        const dateMatch = notes.match(/Data:\s*([^|]+)/i) || notes.match(/Giorno:\s*([^|]+)/i);
        const eventDate = dateMatch ? dateMatch[1].trim() : '';

        if (eventDate.includes('25') || notes.includes('25 Ottobre') || notes.includes('25/10')) {
          return '25';
        }
        if (eventDate.includes('10') || notes.includes('10 Ottobre') || notes.includes('10/10') || notesLower.includes('sabato 10') || notesLower.includes('sabato')) {
          return '10';
        }
        if (eventDate.includes('11') || notes.includes('11 Ottobre') || notes.includes('11/10') || notesLower.includes('domenica 11') || notesLower.includes('domenica')) {
          return '11';
        }
        return 'unspecified';
      }

      // Filter by target day if requested
      const filteredOrders = orders.filter((o: any) => {
        if (targetDay === 'all') return true;
        return parseDayKey(o.notes) === String(targetDay);
      });

      // Filter unique emails
      const emailSet = new Set<string>();
      for (const o of filteredOrders) {
        const em = (o.buyerEmail || '').trim().toLowerCase();
        if (em && !emailSet.has(em)) {
          emailSet.add(em);
          const orderRef = o.id.replace(/-/g, '').substring(0, 8).toUpperCase();
          recipients.push({
            name: o.buyerName || 'Acquirente',
            email: o.buyerEmail,
            orderId: `ORD-${orderRef}`,
          });
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nessun acquirente trovato per la data/evento selezionata.',
      }, { status: 400 });
    }

    // 3. Batch email sending
    const logs: Array<{ email: string; name: string; status: 'SENT' | 'FAILED'; error?: string; resendId?: string }> = [];
    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        const html = await render(
          createElement(PostponementEmailDocument, {
            buyerName: recipient.name,
            orderId: recipient.orderId,
            newDate,
            eventName: 'Zuccaland 2026',
            messageBody: finalMessageBody,
            regulationUrl: 'https://drive.google.com/file/d/1jaJ8vUe_ePAJubcM-dwLufVJ9Z8GgujK/view?usp=share_link',
            whatsappPhone: '393505757501'
          })
        );

        const { data, error } = await resend.emails.send({
          from: 'Pro Loco Gasperina <biglietti@prolocogasperina.it>',
          to: recipient.email,
          replyTo: 'info@prolocogasperina.it',
          subject: finalSubject,
          html,
        });

        if (error) {
          failCount++;
          logs.push({ email: recipient.email, name: recipient.name, status: 'FAILED', error: error.message });
        } else {
          successCount++;
          logs.push({ email: recipient.email, name: recipient.name, status: 'SENT', resendId: data?.id });
        }
      } catch (err: any) {
        failCount++;
        logs.push({ email: recipient.email, name: recipient.name, status: 'FAILED', error: err.message || 'Error rendering email' });
      }
    }

    return NextResponse.json({
      success: true,
      sendMode,
      totalRecipients: recipients.length,
      successCount,
      failCount,
      logs,
    });
  } catch (err: any) {
    console.error('Error in send-postponement-email route:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
