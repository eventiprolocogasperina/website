import { NextResponse } from 'next/server';
import { getCashierOrders, updateCashierDepartmentStatus, getCashierConfig } from '@/lib/data/cashier';
import { broadcastCashierEvent } from '../realtime/route';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const department = searchParams.get('department') || undefined;

    const config = await getCashierConfig();
    const targetEventId = eventId || config.activeEventId || config.events[0]?.id;

    if (!targetEventId) {
      return NextResponse.json({ success: false, error: 'Evento non trovato' }, { status: 400 });
    }

    const eventConfig = config.events.find(e => e.id === targetEventId);
    const orders = await getCashierOrders(targetEventId, { department, limit: 100 });
    const activeOrders = orders.filter(o => o.status === 'COMPLETED');

    return NextResponse.json({
      success: true,
      eventId: targetEventId,
      orders: activeOrders,
      departments: eventConfig?.departments || [],
      enableDepartments: !!eventConfig?.enableDepartments,
    });
  } catch (error: any) {
    console.error('Failed to get stand orders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore recupero comande stand' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { orderId, department, status } = await request.json();

    if (!orderId || !department || !status) {
      return NextResponse.json(
        { success: false, error: 'Parametri mancanti (orderId, department, status)' },
        { status: 400 }
      );
    }

    if (!['PENDING', 'PREPARING', 'READY', 'DELIVERED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Stato reparto non valido' },
        { status: 400 }
      );
    }

    const ok = await updateCashierDepartmentStatus(orderId, department, status);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Ordine non trovato' }, { status: 404 });
    }

    try {
      broadcastCashierEvent('status_updated', { orderId, department, status });
    } catch { /* ignore */ }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update department status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore aggiornamento stato reparto' },
      { status: 500 }
    );
  }
}
