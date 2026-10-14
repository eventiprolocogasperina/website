import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrder, markOrderPaid, toggleOrderBlacklist } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';
import { sendTelegramNotification } from '@/lib/telegram';

function getDb() {
  return neon(process.env.POSTGRES_URL!);
}

export async function GET() {
  try {
    const sql = getDb();
    // Ensure blacklist columns exist
    await sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS "isBlacklisted" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "blacklistReason" TEXT,
      ADD COLUMN IF NOT EXISTS "blacklistedAt" TIMESTAMP;
    `;
    const orders = await sql`SELECT * FROM orders WHERE "deletedAt" IS NULL ORDER BY "createdAt" DESC`;
    const tickets = await sql`SELECT * FROM tickets`;

    const ordersWithTickets = orders.map(order => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      isBlacklisted: !!order.isBlacklisted,
      blacklistReason: order.blacklistReason || undefined,
      blacklistedAt: order.blacklistedAt || undefined,
      tickets: tickets.filter(t => t.orderId === order.id).map(t => ({
        ...t,
        price: Number(t.price)
      }))
    }));

    return NextResponse.json(ordersWithTickets);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { orderId, action } = body;
    
    if (action === 'TOGGLE_BLACKLIST') {
      const { isBlacklisted, reason } = body;
      await toggleOrderBlacklist(orderId, !!isBlacklisted, reason);
      return NextResponse.json({ success: true, isBlacklisted: !!isBlacklisted });
    }

    if (action === 'UPDATE_DETAILS') {
      const sql = getDb();
      const { buyerName, buyerEmail, buyerPhone, notes } = body;
      await sql`
        UPDATE orders 
        SET "buyerName" = ${buyerName}, 
            "buyerEmail" = ${buyerEmail}, 
            "buyerPhone" = ${buyerPhone || null}, 
            notes = ${notes || null}
        WHERE id = ${orderId}
      `;
      return NextResponse.json({ success: true });
    }
    
    if (action === 'MARK_PAID') {
      await markOrderPaid(orderId);
      const order = await getOrder(orderId);
      if (order) {
        await sendTicketsEmail(order);
      }
      return NextResponse.json({ success: true });
    }
    
    if (action === 'RESEND_EMAIL') {
      const order = await getOrder(orderId);
      if (order && order.status === 'PAID') {
        await sendTicketsEmail(order);
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Order not found or not paid' }, { status: 400 });
    }

    if (action === 'CHANGE_EVENT_DATE') {
      const { newDate, resendTickets } = body;
      if (!newDate) {
        return NextResponse.json({ error: 'Nuova data mancante' }, { status: 400 });
      }

      const sql = getDb();
      const order = await getOrder(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
      }

      let currentNotes = order.notes || '';
      let updatedNotes = currentNotes;

      // Sostituisci o anteponi il campo Data:
      if (/Data:\s*[^|]+/i.test(updatedNotes)) {
        updatedNotes = updatedNotes.replace(/Data:\s*[^|]+/i, `Data: ${newDate} `);
      } else if (/Giorno:\s*[^|]+/i.test(updatedNotes)) {
        updatedNotes = updatedNotes.replace(/Giorno:\s*[^|]+/i, `Data: ${newDate} `);
      } else {
        updatedNotes = `Data: ${newDate} | ${updatedNotes}`;
      }

      const auditEntry = `\n| [SPOSTAMENTO DATA: ${newDate} - Modificato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}]`;
      updatedNotes = `${updatedNotes.trim()}${auditEntry}`;

      await sql`
        UPDATE orders
        SET notes = ${updatedNotes}
        WHERE id = ${orderId}
      `;

      let emailSent = false;
      if (resendTickets && order.status === 'PAID') {
        const updatedOrder = await getOrder(orderId);
        if (updatedOrder) {
          await sendTicketsEmail(updatedOrder);
          emailSent = true;
        }
      }

      sendTelegramNotification(
        `📅 <b>Data Ordine Modificata</b>\n\n` +
        `👤 <b>Cliente:</b> ${order.buyerName}\n` +
        `📧 <b>Email:</b> ${order.buyerEmail}\n` +
        `🗓 <b>Nuova Data:</b> ${newDate}\n` +
        `🎟 <b>Biglietti:</b> ${order.tickets.length}\n` +
        `✉️ <b>Email reinviata:</b> ${emailSent ? 'Sì (Nuovi Biglietti Emessi)' : 'No'}\n` +
        `🆔 <b>Ordine:</b> #${orderId.substring(0, 8).toUpperCase()}`
      ).catch(err => console.error('Telegram notification error:', err));

      return NextResponse.json({ 
        success: true, 
        newDate, 
        emailSent, 
        message: `Data ordine modificata in "${newDate}"${emailSent ? ' e biglietti aggiornati inviati via email' : ''}.` 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('id');
    
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const sql = getDb();
    
    // Check if order exists
    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Soft delete order
    await sql`UPDATE orders SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = ${orderId}`;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
