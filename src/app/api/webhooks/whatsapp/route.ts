import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { applyWhatsappStatuses } from '@/modules/broadcast/whatsapp';
import { verifyMetaSignature } from '@/server/integrations/whatsapp';
import { log } from '@/server/log';

function getDb() {
  if (!process.env.POSTGRES_URL) throw new Error('Missing POSTGRES_URL');
  return neon(process.env.POSTGRES_URL);
}

/**
 * GET /api/webhooks/whatsapp
 * Meta Cloud API Webhook Verification Challenge
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    let storedToken = process.env.WHATSAPP_VERIFY_TOKEN || '';

    try {
      const sql = getDb();
      const rows = await sql`SELECT value FROM site_settings WHERE key = 'wa_webhook_verify_token'`;
      if (rows.length > 0 && rows[0].value) {
        storedToken = rows[0].value;
      }
    } catch (dbErr) {
      console.warn('Unable to fetch verify token from DB, using WHATSAPP_VERIFY_TOKEN:', dbErr);
    }

    if (mode === 'subscribe' && storedToken && token === storedToken) {
      console.log('✅ [WhatsApp Webhook Verified Successfully]');
      return new Response(challenge || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.warn('❌ [WhatsApp Webhook Verification Failed]: Token mismatch or invalid mode');
    return new Response('Verification failed. Invalid token.', { status: 403 });
  } catch (err: any) {
    console.error('Error in WhatsApp webhook GET verification:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * POST /api/webhooks/whatsapp
 * Meta Cloud API Notifications (Statuses & Incoming Messages)
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'), process.env.WHATSAPP_APP_SECRET)) {
      return NextResponse.json({ success: false, error: 'Firma non valida' }, { status: 401 });
    }
    // Solo gli stati dei messaggi inviati dal modulo broadcast; il corpo non va nei log (contiene i numeri).
    const updated = await applyWhatsappStatuses(JSON.parse(rawBody));
    log.info('Webhook WhatsApp ricevuto', { updated });
    return NextResponse.json({ success: true, status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (err: any) {
    console.error('Error handling WhatsApp webhook POST event:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
