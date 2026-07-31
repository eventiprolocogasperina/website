import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  return neon(process.env.POSTGRES_URL!);
}

export async function GET() {
  try {
    const sql = getDb();
    const orders = await sql`SELECT * FROM orders WHERE "deletedAt" IS NOT NULL ORDER BY "deletedAt" DESC`;
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
    const body = await req.json();
    const { orderId, action } = body;
    
    if (action === 'RESTORE') {
      const sql = getDb();
      await sql`
        UPDATE orders 
        SET "deletedAt" = NULL
        WHERE id = ${orderId}
      `;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
