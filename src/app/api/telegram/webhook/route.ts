import { NextResponse } from 'next/server';
import { getAdvancedTicketingStats } from '@/lib/data/tickets';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Gestione messaggi standard
    if (data.message && data.message.text) {
      const chatId = data.message.chat.id.toString();
      const text = data.message.text.toLowerCase().trim();

      // Verifica sicurezza: accetta solo comandi dalla chat autorizzata
      const allowedChatId = process.env.TELEGRAM_CHAT_ID;
      
      if (chatId !== allowedChatId) {
        console.warn(`Tentativo di accesso al bot non autorizzato dalla chat: ${chatId}`);
        return NextResponse.json({ ok: true }); // Restituisce OK a Telegram per evitare retry
      }

      // Comandi consentiti
      if (text === '/stats' || text === '/ordini') {
        const stats = await getAdvancedTicketingStats('assaggia-e-passeggia');
        
        const typeBreakdown = stats.ticketTypes
          .map(t => `▪️ <b>${t.type}:</b> ${t.count}`)
          .join('\n');

        const reply = `📊 <b>STATISTICHE ASSAGGIA & PASSEGGIA</b> 📊\n\n` +
                      `🎟 <b>Biglietti Totali:</b> ${stats.totalTickets}\n` +
                      `💰 <b>Incasso Totale:</b> €${stats.totalRevenue.toFixed(2)}\n` +
                      `🎁 <b>Ordini Omaggio:</b> ${stats.freeOrders}\n\n` +
                      `<b>Dettaglio Tipologie:</b>\n${typeBreakdown}\n\n` +
                      `<i>Aggiornato in tempo reale.</i>`;

        await sendTelegramNotification(reply);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Errore nel webhook Telegram:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
