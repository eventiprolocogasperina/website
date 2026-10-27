import { NextResponse } from 'next/server';
import { requirePermission } from '@/server/auth/context';

export async function GET() {
  const denied = await requirePermission('settings.manage');
  if (denied) return denied;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // Il bot è uno solo: si collega solo dal sito in produzione, mai da anteprime o da localhost.
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ error: 'Il webhook Telegram si imposta solo dal sito in produzione.' }, { status: 400 });
  }

  if (!botToken || !webhookSecret) {
    return NextResponse.json({ error: 'Errore: TELEGRAM_BOT_TOKEN o TELEGRAM_WEBHOOK_SECRET non sono impostati nelle Environment Variables di Vercel.' }, { status: 400 });
  }

  // L'indirizzo viene dalla configurazione, non dall'header Host della richiesta.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prolocogasperina.it';
  const webhookUrl = await finalUrl(`${baseUrl}/api/telegram/webhook`);
  // Telegram rimanderà secret_token nell'header X-Telegram-Bot-Api-Secret-Token di ogni chiamata.
  const apiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${encodeURIComponent(webhookSecret)}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.ok) {
      return NextResponse.json({ success: true, message: 'Webhook impostato correttamente', url: webhookUrl });
    } else {
      return NextResponse.json({ success: false, error: data.description }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Telegram non segue i reindirizzamenti: se il dominio configurato rimanda a un altro (es. senza www →
 * con www), si registra l'indirizzo finale. Si accetta solo un reindirizzamento verso lo stesso sito.
 */
async function finalUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store' });
    const from = new URL(url).hostname.replace(/^www\./, '');
    const to = new URL(res.url);
    return to.protocol === 'https:' && to.hostname.replace(/^www\./, '') === from ? to.toString() : url;
  } catch {
    return url;
  }
}
