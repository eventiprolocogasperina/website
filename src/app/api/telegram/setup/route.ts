import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!botToken || !baseUrl) {
    return NextResponse.json({ error: 'Configurazione mancante (TELEGRAM_BOT_TOKEN o NEXT_PUBLIC_BASE_URL)' }, { status: 400 });
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
