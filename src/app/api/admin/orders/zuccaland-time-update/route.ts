import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getOrder, type OrderWithTickets } from '@/lib/data/tickets';
import { sendTicketsEmail } from '@/lib/tickets/sendTicketsEmail';

function getDb() {
  return neon(process.env.POSTGRES_URL!);
}

/**
 * GET: Ritorna il riepilogo dei 40 ordini pagati di Zuccaland per la rettifica orari.
 */
export async function GET() {
  try {
    const sql = getDb();
    const orders = await sql`
      SELECT id, "buyerName", "buyerEmail", "buyerPhone", "totalAmount", status, "createdAt", notes
      FROM orders
      WHERE status = 'PAID' AND "deletedAt" IS NULL
      ORDER BY "createdAt" ASC
    `;

    const zuccalandOrders = orders.filter(o => 
      o.notes?.toLowerCase().includes('zuccaland') || 
      o.notes?.includes('10 Ottobre') || 
      o.notes?.includes('11 Ottobre')
    );

    const breakdown = {
      total: zuccalandOrders.length,
      sabato10: zuccalandOrders.filter(o => o.notes?.includes('10 Ottobre') || o.notes?.toLowerCase().includes('sabato')).length,
      domenica11: zuccalandOrders.filter(o => o.notes?.includes('11 Ottobre') || o.notes?.toLowerCase().includes('domenica')).length,
      orders: zuccalandOrders.map(o => ({
        id: o.id,
        orderRef: o.id.replace(/-/g, '').substring(0, 8).toUpperCase(),
        buyerName: o.buyerName,
        buyerEmail: o.buyerEmail,
        buyerPhone: o.buyerPhone,
        bookedDay: (o.notes?.includes('10 Ottobre') || o.notes?.toLowerCase().includes('sabato')) ? 'Sabato 10 Ottobre' : 'Domenica 11 Ottobre',
        createdAt: o.createdAt
      }))
    };

    return NextResponse.json(breakdown);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST: Invia email di test a un indirizzo oppure invia a tutti i 40 clienti.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { testEmail, confirmBroadcast } = body;

    const sql = getDb();
    const rawOrders = await sql`
      SELECT id, "buyerName", "buyerEmail", notes, status
      FROM orders
      WHERE status = 'PAID' AND "deletedAt" IS NULL
      ORDER BY "createdAt" ASC
    `;

    const zuccalandOrders = rawOrders.filter(o => 
      o.notes?.toLowerCase().includes('zuccaland') || 
      o.notes?.includes('10 Ottobre') || 
      o.notes?.includes('11 Ottobre')
    );

    if (testEmail) {
      // Prendi il primo ordine disponibile per fare un test inviandolo all'email dell'admin
      const sampleOrderSummary = zuccalandOrders[0];
      if (!sampleOrderSummary) {
        return NextResponse.json({ error: 'Nessun ordine Zuccaland trovato' }, { status: 404 });
      }

      const fullOrder = await getOrder(sampleOrderSummary.id);
      if (!fullOrder) {
        return NextResponse.json({ error: 'Ordine completo non trovato' }, { status: 404 });
      }

      // Clona l'ordine sovrascrivendo l'email con quella di test
      const testOrder: OrderWithTickets = {
        ...fullOrder,
        buyerEmail: testEmail.trim()
      };

      await sendTicketsEmail(testOrder);

      return NextResponse.json({ 
        success: true, 
        message: `Email di test con PDF e orario 10:30 inviata con successo a ${testEmail} per l'ordine #${testOrder.id.replace(/-/g, '').substring(0, 8).toUpperCase()}` 
      });
    }

    if (confirmBroadcast) {
      let sentCount = 0;
      const errors: { orderId: string; email: string; error: string }[] = [];

      for (const ord of zuccalandOrders) {
        try {
          const fullOrder = await getOrder(ord.id);
          if (fullOrder && fullOrder.status === 'PAID') {
            await sendTicketsEmail(fullOrder);
            sentCount++;
            // Piccola pausa di 200ms per rispettare il rate limit di Resend
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (e: any) {
          console.error(`Errore invio aggiornamento per ordine ${ord.id}:`, e);
          errors.push({ orderId: ord.id, email: ord.buyerEmail, error: e.message || 'Errore sconosciuto' });
        }
      }

      return NextResponse.json({
        success: true,
        total: zuccalandOrders.length,
        sent: sentCount,
        errors
      });
    }

    return NextResponse.json({ error: 'Specifica "testEmail" per inviare una prova oppure "confirmBroadcast": true per procedere con tutti gli ordini.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
