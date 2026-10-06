import { NextResponse } from 'next/server';
import { getCashierConfig } from '@/lib/data/cashier';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { eventCode } = await request.json();

    if (!eventCode || typeof eventCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Codice evento richiesto' },
        { status: 400 }
      );
    }

    const cleanCode = eventCode.trim().toUpperCase();
    const config = await getCashierConfig();

    // Cerca l'evento corrispondente al codice (case-insensitive)
    const matchedEvent = config.events.find(
      e => e.eventCode.trim().toUpperCase() === cleanCode
    );

    if (!matchedEvent) {
      return NextResponse.json(
        { success: false, error: 'Codice evento non valido o inesistente' },
        { status: 404 }
      );
    }

    if (!matchedEvent.active) {
      return NextResponse.json(
        { success: false, error: 'La cassa per questo evento non è al momento attiva' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      event: {
        id: matchedEvent.id,
        eventId: matchedEvent.id,
        name: matchedEvent.name,
        eventName: matchedEvent.name,
        categories: matchedEvent.categories,
        cassaAssignments: matchedEvent.cassaAssignments || {},
        items: matchedEvent.items,
        notes: matchedEvent.notes,
      }
    });
  } catch (error: any) {
    console.error('Cashier session error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
