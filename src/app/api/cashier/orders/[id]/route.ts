import { NextResponse } from 'next/server';
import { getCashierOrderById } from '@/lib/data/cashier';
import { requireCassaOrAdmin } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { denied } = await requireCassaOrAdmin();
  if (denied) return denied;
  try {
    const { id } = await props.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID ordine mancante' },
        { status: 400 }
      );
    }

    const order = await getCashierOrderById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Ricevuta non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Failed to get cashier order by ID:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
