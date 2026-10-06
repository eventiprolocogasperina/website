import { NextResponse } from 'next/server';
import { resetCashierOrderSequence, getCashierConfig } from '@/lib/data/cashier';
import { broadcastCashierEvent } from '@/app/api/cashier/realtime/route';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { eventId, startingNumber = 1 } = await request.json();
    
    const config = await getCashierConfig();
    const targetEventId = eventId || config.activeEventId || config.events[0]?.id;

    if (!targetEventId) {
      return NextResponse.json({ success: false, error: 'Evento non trovato' }, { status: 400 });
    }

    const startNum = Math.max(1, parseInt(startingNumber) || 1);
    await resetCashierOrderSequence(targetEventId, startNum);

    try {
      broadcastCashierEvent('sequence_reset', { eventId: targetEventId, startingNumber: startNum });
    } catch { /* ignore */ }

    return NextResponse.json({ success: true, startingNumber: startNum });
  } catch (err: any) {
    console.error('Failed to reset cashier order sequence:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Errore durante il reset della numerazione' },
      { status: 500 }
    );
  }
}
