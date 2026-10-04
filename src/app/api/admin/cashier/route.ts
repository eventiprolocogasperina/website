import { NextResponse } from 'next/server';
import { getCashierConfig, saveCashierConfig, getCashierStats, type CashierConfig } from '@/lib/data/cashier';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const config = await getCashierConfig();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId') || config.activeEventId || config.events[0]?.id;

    let stats = null;
    if (eventId) {
      stats = await getCashierStats(eventId);
    }

    return NextResponse.json({
      success: true,
      config,
      stats
    });
  } catch (error: any) {
    console.error('Failed to get admin cashier config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { config } = body as { config: CashierConfig };

    if (!config || !Array.isArray(config.events)) {
      return NextResponse.json(
        { success: false, error: 'Configurazione non valida' },
        { status: 400 }
      );
    }

    const success = await saveCashierConfig(config);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Errore nel salvataggio del database' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    console.error('Failed to save admin cashier config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
