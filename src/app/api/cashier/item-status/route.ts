import { NextResponse } from 'next/server';
import { getCashierConfig, saveCashierConfig } from '@/lib/data/cashier';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const { eventId, itemId, isAvailable } = await request.json();

    if (!eventId || !itemId || typeof isAvailable !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Parametri mancanti' },
        { status: 400 }
      );
    }

    const config = await getCashierConfig();
    const eventIndex = config.events.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Evento non trovato' },
        { status: 404 }
      );
    }

    const itemIndex = config.events[eventIndex].items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Piatto non trovato' },
        { status: 404 }
      );
    }

    config.events[eventIndex].items[itemIndex].isAvailable = isAvailable;
    config.events[eventIndex].updatedAt = new Date().toISOString();

    await saveCashierConfig(config);

    return NextResponse.json({
      success: true,
      item: config.events[eventIndex].items[itemIndex]
    });
  } catch (error: any) {
    console.error('Failed to update cashier item status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
