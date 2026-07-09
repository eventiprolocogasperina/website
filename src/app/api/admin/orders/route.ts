import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrder, markOrderPaid } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';

function getDb() {
  return neon(process.env.POSTGRES_URL!);
}

export async function GET() {
  try {
    const sql = getDb();
    const orders = await sql`SELECT * FROM orders ORDER BY "createdAt" DESC`;
    const tickets = await sql`SELECT * FROM tickets`;

    const ordersWithTickets = orders.map(order => ({
      ...order,
      totalAmount: Number(order.totalAmount),
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
    const { orderId, action } = await req.json();
    
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
    
    // Delete tickets first due to foreign key constraints (if any)
    await sql`DELETE FROM tickets WHERE "orderId" = ${orderId}`;
    
    // Delete order
    await sql`DELETE FROM orders WHERE id = ${orderId}`;

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
