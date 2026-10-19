import { NextResponse } from 'next/server';
import { getTicketingStats } from '@/lib/data/tickets';
import { requireCheckin, requirePermission } from '@/server/auth/context';

export async function GET(request: Request) {
  const denied = (await requirePermission('orders.read')) && (await requireCheckin()).denied;
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId') || 'assaggia-e-passeggia-2024';

    const stats = await getTicketingStats(eventId);
    return NextResponse.json(stats);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
