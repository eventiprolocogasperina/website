import { NextResponse } from 'next/server';
import { getCashierStats } from '@/lib/data/cashier';
import { requireCassaOrAdmin } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { denied, cassaEventId } = await requireCassaOrAdmin();
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const cassaName = searchParams.get('cassaName') || undefined;
    const date = searchParams.get('date') || undefined;
    if (cassaEventId && eventId !== cassaEventId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId richiesto' },
        { status: 400 }
      );
    }

    const stats = await getCashierStats(eventId, { cassaName, date });
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('Failed to get cashier stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
