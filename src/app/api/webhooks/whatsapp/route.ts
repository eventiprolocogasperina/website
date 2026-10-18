import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Meta firma ogni notifica con HMAC-SHA256 del corpo grezzo, usando l'App Secret. */
function hasValidMetaSignature(rawBody: string, header: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !header?.startsWith('sha256=')) return false;
  const expected = Buffer.from(createHmac('sha256', appSecret).update(rawBody).digest('hex'));
  const given = Buffer.from(header.slice('sha256='.length));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

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
    if (!hasValidMetaSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
      return NextResponse.json({ success: false, error: 'Firma non valida' }, { status: 401 });
    }
    const body = JSON.parse(rawBody);
    console.log('📩 [WhatsApp Webhook Event Received]:', JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true, status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (err: any) {
    console.error('Error handling WhatsApp webhook POST event:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
