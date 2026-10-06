import { NextResponse } from 'next/server';
import { resetCashierReport } from '@/lib/data/cashier';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { eventId, confirmation } = await request.json();

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'ID evento mancante' },
        { status: 400 }
      );
    }

    if (!confirmation || typeof confirmation !== 'string' || confirmation.trim().toLowerCase() !== 'conferma') {
      return NextResponse.json(
        { success: false, error: 'Conferma di sicurezza non valida. È necessario digitare "conferma".' },
        { status: 400 }
      );
    }

    await resetCashierReport(eventId);

    return NextResponse.json({
      success: true,
      message: 'Report incassi e ordini azzerati con successo.'
    });
  } catch (error: any) {
    console.error('Reset cashier report error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore durante l’azzeramento del report.' },
      { status: 500 }
    );
  }
}
