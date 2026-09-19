import { NextResponse } from 'next/server';
import { 
  getAdvancedTicketingStats, 
  getLatestOrdersTelegram,
  getZuccalandStats,
  ZuccalandStatsResult,
  ZuccalandDayStats
} from '@/lib/data/tickets';
import { sendTelegramNotification } from '@/lib/telegram';

function formatZuccalandStats(stats: ZuccalandStatsResult): string {
  const typeBreakdown = Object.entries(stats.ticketTypes)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `▪️ <b>${type}:</b> ${count}`)
    .join('\n') || '<i>Nessun biglietto emesso</i>';

  const activityBreakdown = Object.entries(stats.activityStats)
    .sort((a, b) => b[1] - a[1])
    .map(([act, count]) => `🎃 <b>${act}:</b> ${count} adesioni`)
    .join('\n') || '<i>Nessuna prenotazione attività registrata</i>';

  return `🎃 <b>STATISTICHE ZUCCALAND 2026</b> 🎃\n\n` +
    `🎟 <b>Biglietti Totali:</b> ${stats.totalTickets}\n` +
    `💰 <b>Incasso Totale:</b> €${stats.totalRevenue.toFixed(2)}\n` +
    `📦 <b>Ordini Pagati:</b> ${stats.paidOrdersCount} (di cui ${stats.freeOrders} omaggio)\n\n` +
    `👥 <b>PARTECIPANTI (Stima):</b>\n` +
    `👨‍🦰 <b>Adulti:</b> ${stats.adultsCount}\n` +
    `🧒 <b>Bambini:</b> ${stats.kidsCount}\n` +
    `<i>Presenze totali stimate: ${stats.totalAttendees}</i>\n\n` +
    `🎫 <b>DETTAGLIO BIGLIETTI:</b>\n${typeBreakdown}\n\n` +
    `🎨 <b>PRENOTAZIONI ATTIVITÀ:</b>\n${activityBreakdown}\n\n` +
    `💡 <i>Invia /zuccalandperdata per visualizzare la suddivisione per data (10 o 11 Ottobre).</i>`;
}

function formatZuccalandPerData(stats: ZuccalandStatsResult): string {
  const renderDaySection = (day: ZuccalandDayStats, header: string, emoji: string) => {
    const types = Object.entries(day.ticketTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `  ▪️ ${type}: <b>${count}</b>`)
      .join('\n') || '  <i>Nessun biglietto</i>';

    const acts = Object.entries(day.activityStats)
      .sort((a, b) => b[1] - a[1])
      .map(([act, count]) => `  🎃 ${act}: <b>${count}</b> adesioni`)
      .join('\n') || '  <i>Nessuna attività prenotata</i>';

    return `${emoji} <b>${header}</b>\n` +
      `🎟 Biglietti: <b>${day.tickets}</b> | 💰 Incasso: <b>€${day.revenue.toFixed(2)}</b>\n` +
      `📦 Ordini: <b>${day.orders}</b>\n` +
      `👥 Presenze: 👨‍🦰 <b>${day.adults}</b> Adulti | 🧒 <b>${day.kids}</b> Bambini (Tot: ${day.adults + day.kids})\n\n` +
      `<b>Tipologie Biglietti:</b>\n${types}\n\n` +
      `<b>Attività Prenotate:</b>\n${acts}`;
  };

  let reply = `📅 <b>STATISTICHE ZUCCALAND PER DATA</b> 📅\n\n` +
    renderDaySection(stats.perDay['10'], 'SABATO 10 OTTOBRE 2026', '🟧') +
    `\n\n━━━━━━━━━━━━━━━━━━━━\n\n` +
    renderDaySection(stats.perDay['11'], 'DOMENICA 11 OTTOBRE 2026', '🟨');

  if (stats.perDay['unspecified'].tickets > 0 || stats.perDay['unspecified'].orders > 0) {
    reply += `\n\n━━━━━━━━━━━━━━━━━━━━\n\n` +
      renderDaySection(stats.perDay['unspecified'], 'DATA NON SPECIFICATA / ALTRE', '⚪');
  }

  reply += `\n\n<i>Aggiornato in tempo reale.</i>`;
  return reply;
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Gestione messaggi standard
    if (data.message && data.message.text) {
      const chatId = data.message.chat.id.toString();
      const text = data.message.text.trim();

      // Verifica sicurezza: accetta solo comandi dalla chat autorizzata
      const allowedChatId = process.env.TELEGRAM_CHAT_ID;
      
      if (chatId !== allowedChatId) {
        console.warn(`Tentativo di accesso al bot non autorizzato dalla chat: ${chatId}`);
        return NextResponse.json({ ok: true }); // Restituisce OK a Telegram per evitare retry
      }

      const parts = text.split(/\s+/);
      const rawCmd = parts[0] || '';
      const cmd = rawCmd.split('@')[0].toLowerCase();
      const arg = (parts[1] || '').toLowerCase();

      // 1. Comando /statszuccaland
      if (cmd === '/statszuccaland' || cmd === '/zuccaland' || (cmd === '/stats' && arg.includes('zucca'))) {
        const stats = await getZuccalandStats();
        const reply = formatZuccalandStats(stats);
        await sendTelegramNotification(reply, chatId);
        return NextResponse.json({ ok: true });
      }

      // 2. Comando /zuccalandperdata
      if (
        cmd === '/zuccalandperdata' || 
        cmd === '/statszuccalandperdata' || 
        cmd === '/zuccalanddata' ||
        (cmd === '/zuccaland' && (arg.includes('data') || arg.includes('date')))
      ) {
        const stats = await getZuccalandStats();
        const reply = formatZuccalandPerData(stats);
        await sendTelegramNotification(reply, chatId);
        return NextResponse.json({ ok: true });
      }

      // 3. Comando /stats (Assaggia & Passeggia)
      if (cmd === '/stats' || cmd === '/statsassaggia' || cmd === '/assaggia') {
        const stats = await getAdvancedTicketingStats('assaggia-passeggia');
        
        const typeBreakdown = stats.ticketTypes
          .map(t => `▪️ <b>${t.type}:</b> ${t.count}`)
          .join('\n') || '<i>Nessun biglietto emesso</i>';

        const reply = `🍷 <b>STATISTICHE ASSAGGIA & PASSEGGIA</b> 🍷\n\n` +
                      `🎟 <b>Biglietti Totali:</b> ${stats.totalTickets}\n` +
                      `💰 <b>Incasso Totale:</b> €${stats.totalRevenue.toFixed(2)}\n` +
                      `🎁 <b>Ordini Omaggio:</b> ${stats.freeOrders}\n\n` +
                      `<b>Dettaglio Tipologie:</b>\n${typeBreakdown}\n\n` +
                      `💡 <i>Per le statistiche di Zuccaland usa:\n` +
                      `• /statszuccaland\n` +
                      `• /zuccalandperdata</i>\n\n` +
                      `<i>Aggiornato in tempo reale.</i>`;

        await sendTelegramNotification(reply, chatId);
        return NextResponse.json({ ok: true });
      }
      
      // 4. Comando /ordini
      if (cmd === '/ordini' || cmd === '/ordinizuccaland' || cmd === '/ordiniassaggia') {
        const filterEvent = cmd === '/ordinizuccaland' ? 'zuccaland-2026' : (cmd === '/ordiniassaggia' ? 'assaggia-passeggia' : undefined);
        const orders = await getLatestOrdersTelegram(filterEvent, 15);
        
        if (orders.length === 0) {
          await sendTelegramNotification(`ℹ️ Nessun ordine pagato trovato.`, chatId);
        } else {
          let reply = `📦 <b>ULTIMI ${orders.length} ORDINI PAGATI</b> 📦\n\n`;
          
          orders.forEach((o, i) => {
            const isZuccaland = o.tickets.some((t: any) => t.eventId?.includes('zuccaland'));
            const eventEmoji = isZuccaland ? '🎃' : '🍷';

            const ticketSummary = o.tickets.reduce((acc: Record<string, number>, t: any) => {
              acc[t.type] = (acc[t.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            const ticketStr = Object.entries(ticketSummary).map(([type, count]) => `${count}x ${type}`).join(', ');
            
            const date = new Date(o.createdAt).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            
            reply += `<b>${i+1}. ${eventEmoji} ${o.buyerName}</b>\n`;
            reply += `📅 ${date} - €${o.totalAmount.toFixed(2)}\n`;
            reply += `🎟 ${ticketStr}\n\n`;
          });

          await sendTelegramNotification(reply, chatId);
        }
        return NextResponse.json({ ok: true });
      }

      // 5. Comando /start o /help
      if (cmd === '/start' || cmd === '/help') {
        const helpReply = `🤖 <b>BOT PRO LOCO GASPERINA</b> 🤖\n\n` +
          `Ecco i comandi disponibili per consultare dati e statistiche:\n\n` +
          `🎃 <b>ZUCCALAND</b>\n` +
          `▪️ /statszuccaland - Totali biglietti, tipologie, adesioni attività e presenze (bambini / adulti)\n` +
          `▪️ /zuccalandperdata - Statistiche divise per data (10 e 11 Ottobre)\n\n` +
          `🍷 <b>ASSAGGIA & PASSEGGIA</b>\n` +
          `▪️ /stats - Statistiche biglietti, incasso e tipologie\n\n` +
          `📦 <b>GESTIONE ORDINI</b>\n` +
          `▪️ /ordini - Elenco degli ultimi 15 ordini pagati\n\n` +
          `<i>Tutti i dati sono sincronizzati in tempo reale con il database.</i>`;

        await sendTelegramNotification(helpReply, chatId);
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Errore nel webhook Telegram:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
