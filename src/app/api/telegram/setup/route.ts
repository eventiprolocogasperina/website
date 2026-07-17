import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  // Use the actual host the user used to access this setup route to avoid 307 redirects
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'prolocogasperina.it';
  const baseUrl = `${protocol}://${host}`;

  if (!botToken) {
    return NextResponse.json({ error: 'Errore: TELEGRAM_BOT_TOKEN non è stato inserito nelle Environment Variables di Vercel.' }, { status: 400 });
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  const apiUrl = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

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
