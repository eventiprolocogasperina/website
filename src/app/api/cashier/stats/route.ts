import { NextResponse } from 'next/server';
import { getCashierStats } from '@/lib/data/cashier';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const cassaName = searchParams.get('cassaName') || undefined;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId richiesto' },
        { status: 400 }
      );
    }

    const stats = await getCashierStats(eventId, cassaName);
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('Failed to get cashier stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
