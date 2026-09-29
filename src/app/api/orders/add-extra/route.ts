import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(request: Request) {
  try {
    const { orderId, amount, description } = await request.json();
    
    if (!orderId || !description) {
      return NextResponse.json({ success: false, message: 'Dati mancanti' }, { status: 400 });
    }

    if (!process.env.POSTGRES_URL) {
      throw new Error('Missing POSTGRES_URL');
    }
    const sql = neon(process.env.POSTGRES_URL);
    
    const amountVal = parseFloat(amount) || 0;
    const extraStr = `\n[EXTRA PAGATO ALL'INGRESSO]: +${amountVal}€ - ${description}`;
    
    await sql`
      UPDATE orders 
      SET 
        "totalAmount" = "totalAmount" + ${amountVal},
        notes = COALESCE(notes, '') || ${extraStr}
      WHERE id = ${orderId}
    `;

    return NextResponse.json({ success: true, message: 'Extra aggiunto con successo' });
  } catch (error: any) {
    console.error('Add extra error:', error);
    return NextResponse.json({ success: false, message: 'Errore interno del server' }, { status: 500 });
  }
}
