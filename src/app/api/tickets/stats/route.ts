import { NextResponse } from 'next/server';
import { getTicketingStats } from '@/lib/data/tickets';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json({ success: false, error: 'eventId mancante' }, { status: 400 });
  }

  try {
    const stats = await getTicketingStats(eventId);
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    console.error('Failed to get ticket stats:', error);
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 });
  }
}
