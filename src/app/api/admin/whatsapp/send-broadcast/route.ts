import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

/**
 * Format Italian phone numbers to standard WhatsApp format (e.g. 393471234567)
 */
function formatWhatsAppPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return '';
  // If it starts with 0039, remove 00
  if (cleaned.startsWith('0039')) {
    cleaned = cleaned.substring(2);
  }
  // If 10 digits starting with 3 (standard Italian mobile), prepend 39
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    cleaned = '39' + cleaned;
  }
  // If 9 digits starting with 3, prepend 39
  if (cleaned.length === 9 && cleaned.startsWith('3')) {
    cleaned = '39' + cleaned;
  }
  return cleaned;
}

/**
 * Replace placeholders in message text
 */
function interpolateMessage(
  templateText: string,
  vars: { nome: string; nuova_data: string; evento: string; regolamento: string }
): string {
  return templateText
    .replace(/\{\{nome\}\}/gi, vars.nome || 'Gentile Cliente')
    .replace(/\{\{nuova_data\}\}/gi, vars.nuova_data || 'nuova data')
    .replace(/\{\{evento\}\}/gi, vars.evento || 'Zuccaland 2026')
    .replace(/\{\{regolamento\}\}/gi, vars.regolamento || 'https://drive.google.com/file/d/1jaJ8vUe_ePAJubcM-dwLufVJ9Z8GgujK/view?usp=share_link');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      eventId = 'zuccaland-2026',
      targetDay = 'all', // '10', '11', '25', or 'all'
      newDate = 'Domenica 25 Ottobre 2026',
      customMessage,
      sendMode = 'test', // 'test' or 'broadcast'
      testPhoneNumber = '',
    } = body;

    const sql = getDb();

    // 1. Fetch site settings for Meta WhatsApp credentials
    const rows = await sql`SELECT key, value FROM site_settings WHERE key LIKE 'wa_%'`;
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key as string] = r.value as string;
    }

    const phoneNumberId = settings.wa_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const accessToken = settings.wa_access_token || process.env.WHATSAPP_ACCESS_TOKEN || '';
    const templateName = settings.wa_template_name || process.env.WHATSAPP_TEMPLATE_NAME || '';
    const languageCode = settings.wa_language_code || 'it';
    const defaultTemplateText = settings.wa_postponement_message ||
      `Ciao {{nome}}, ti informiamo che l'evento {{evento}} è stato rinviato alla nuova data di {{nuova_data}}. I tuoi biglietti rimangono validi. Consulta il regolamento completo: {{regolamento}}`;

    const messageTemplate = customMessage?.trim() || defaultTemplateText;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Credenziali Meta WhatsApp API non configurate. Compila Phone Number ID e Access Token nelle Impostazioni Sito.',
      }, { status: 400 });
    }

    // 2. Determine target audience
    let recipients: Array<{ name: string; phone: string; orderId: string }> = [];

    if (sendMode === 'test') {
      const formattedTestPhone = formatWhatsAppPhone(testPhoneNumber);
      if (!formattedTestPhone) {
        return NextResponse.json({
          success: false,
          error: 'Inserisci un numero di cellulare valido per il test (es: 3471234567 o +393471234567).',
        }, { status: 400 });
      }
      recipients = [{ name: 'Test User', phone: formattedTestPhone, orderId: 'TEST-001' }];
    } else {
      // Fetch PAID orders for the event
      const orders = await sql`
        SELECT o.id, o."buyerName", o."buyerPhone", o.notes, t."eventId", t.type
        FROM orders o
        JOIN tickets t ON t."orderId" = o.id
        WHERE o.status = 'PAID'
        AND o."buyerPhone" IS NOT NULL
        AND o."buyerPhone" != ''
        AND t."eventId" LIKE ${'%' + eventId + '%'}
        GROUP BY o.id, o."buyerName", o."buyerPhone", o.notes, t."eventId", t.type
      `;

      // Filter by target day if requested
      const filteredOrders = orders.filter((o: any) => {
        if (targetDay === 'all') return true;
        const notesStr = (o.notes || '').toLowerCase();
        const typeStr = (o.type || '').toLowerCase();
        return notesStr.includes(`giorno ${targetDay}`) || notesStr.includes(`ottobre ${targetDay}`) || typeStr.includes(`giorno ${targetDay}`);
      });

      // Map & unique phones
      const phoneSet = new Set<string>();
      for (const o of filteredOrders) {
        const phone = formatWhatsAppPhone(o.buyerPhone || '');
        if (phone && !phoneSet.has(phone)) {
          phoneSet.add(phone);
          recipients.push({
            name: o.buyerName || 'Acquirente',
            phone,
            orderId: o.id,
          });
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nessun acquirente trovato con numero di telefono per la data/evento selezionata.',
      }, { status: 400 });
    }

    // 3. Send WhatsApp messages via Meta Graph API
    const metaUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const logs: Array<{ phone: string; name: string; status: 'SENT' | 'FAILED'; error?: string; messageId?: string }> = [];

    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      const finalMessageBody = interpolateMessage(messageTemplate, {
        nome: recipient.name,
        nuova_data: newDate,
        evento: 'Zuccaland 2026',
        regolamento: 'https://drive.google.com/file/d/1jaJ8vUe_ePAJubcM-dwLufVJ9Z8GgujK/view?usp=share_link',
      });

      // Prepare Meta payload
      let payload: any;

      if (templateName && sendMode !== 'test') {
        // WhatsApp Official Template Payload
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient.phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: recipient.name },
                  { type: 'text', text: newDate },
                ],
              },
            ],
          },
        };
      } else {
        // Direct Text Message Payload (Session / Test / Free-form API)
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipient.phone,
          type: 'text',
          text: {
            preview_url: true,
            body: finalMessageBody,
          },
        };
      }

      try {
        const response = await fetch(metaUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const resData = await response.json();

        if (response.ok && resData.messages?.[0]?.id) {
          successCount++;
          logs.push({
            phone: recipient.phone,
            name: recipient.name,
            status: 'SENT',
            messageId: resData.messages[0].id,
          });
        } else {
          failCount++;
          const errMsg = resData.error?.message || JSON.stringify(resData);
          logs.push({
            phone: recipient.phone,
            name: recipient.name,
            status: 'FAILED',
            error: errMsg,
          });
        }
      } catch (err: any) {
        failCount++;
        logs.push({
          phone: recipient.phone,
          name: recipient.name,
          status: 'FAILED',
          error: err.message || 'Network error',
        });
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
    console.error('Error in whatsapp broadcast API:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
