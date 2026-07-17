import { NextResponse } from 'next/server';
import { getAdvancedTicketingStats, getLatestOrdersTelegram } from '@/lib/data/tickets';
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

      // Comando /stats
      if (text.startsWith('/stats')) {
        const stats = await getAdvancedTicketingStats('assaggia-passeggia');
        
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
      
      // Comando /ordini
      if (text.startsWith('/ordini')) {
        const orders = await getLatestOrdersTelegram('assaggia-passeggia', 15);
        
        if (orders.length === 0) {
          await sendTelegramNotification(`ℹ️ Nessun ordine pagato trovato.`);
        } else {
          let reply = `📦 <b>ULTIMI 15 ORDINI PAGATI</b> 📦\n\n`;
          
          orders.forEach((o, i) => {
            const ticketSummary = o.tickets.reduce((acc: Record<string, number>, t: any) => {
              acc[t.type] = (acc[t.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            const ticketStr = Object.entries(ticketSummary).map(([type, count]) => `${count}x ${type}`).join(', ');
            
            const date = new Date(o.createdAt).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            
            reply += `<b>${i+1}. ${o.buyerName}</b>\n`;
            reply += `📅 ${date} - €${o.totalAmount.toFixed(2)}\n`;
            reply += `🎟 ${ticketStr}\n\n`;
          });

          await sendTelegramNotification(reply);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Errore nel webhook Telegram:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
