import { NextResponse } from 'next/server';
import { getCashierConfig, DEFAULT_PRINTER_SETTINGS } from '@/lib/data/cashier';
import { legacyEventCodeEnabled, requirePos } from '@/server/auth/context';
import { legacyIdsFor } from '@/server/domain/editions';
import { createSession } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

type CashierEvent = Awaited<ReturnType<typeof getCashierConfig>>['events'][number];

function eventPayload(matchedEvent: CashierEvent, config: Awaited<ReturnType<typeof getCashierConfig>>) {
  // La prima cassa nella lista è la "master" (genera biglietti progressivi)
  const cassasList = matchedEvent.casses && matchedEvent.casses.length > 0 ? matchedEvent.casses : ['Cassa 1'];
  return {
    id: matchedEvent.id,
    eventId: matchedEvent.id,
    name: matchedEvent.name,
    eventName: matchedEvent.name,
    categories: matchedEvent.categories,
    cassaAssignments: matchedEvent.cassaAssignments || {},
    casses: cassasList,
    masterCassa: cassasList[0],
    enableDepartments: matchedEvent.enableDepartments || false,
    startingNumber: matchedEvent.startingNumber || 1,
    items: matchedEvent.items,
    notes: matchedEvent.notes,
    printerSettings: matchedEvent.printerSettings || config.defaultPrinterSettings || DEFAULT_PRINTER_SETTINGS,
  };
}

/** Dispositivo di cassa abbinato + PIN: restituisce l'evento di cassa dell'edizione del dispositivo. */
export async function GET() {
  const { denied, edition } = await requirePos();
  if (denied) return denied;
  if (!edition) return NextResponse.json({ success: false, error: 'Nessun dispositivo di cassa abbinato.' }, { status: 400 });
  const config = await getCashierConfig();
  const ids = await legacyIdsFor(edition);
  const matchedEvent = config.events.find((e) => ids.includes(e.id));
  if (!matchedEvent) return NextResponse.json({ success: false, error: 'La cassa di questa edizione non è ancora configurata.' }, { status: 404 });
  if (!matchedEvent.active) return NextResponse.json({ success: false, error: 'La cassa per questo evento non è al momento attiva' }, { status: 403 });
  return NextResponse.json({ success: true, event: eventPayload(matchedEvent, config) });
}

export async function POST(request: Request) {
  // Il codice evento è il vecchio sistema: si spegne con il flag legacy_event_code (prompt 14).
  if (!(await legacyEventCodeEnabled())) {
    return NextResponse.json({ success: false, error: 'Il codice evento non è più attivo: usa un dispositivo abbinato e il tuo PIN.' }, { status: 403 });
  }
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

    // La prima cassa nella lista è la "master" (genera biglietti progressivi)
    const cassasList = matchedEvent.casses && matchedEvent.casses.length > 0
      ? matchedEvent.casses
      : ['Cassa 1'];
    const masterCassa = cassasList[0];

    // Il codice è stato verificato qui sul server: apre una sessione di cassa (cookie httpOnly)
    // valida solo per questo evento, richiesta dalle altre rotte /api/cashier.
    await createSession({ sub: 'cassa', role: 'cassa', eventId: matchedEvent.id });

    return NextResponse.json({
      success: true,
      event: {
        id: matchedEvent.id,
        eventId: matchedEvent.id,
        name: matchedEvent.name,
        eventName: matchedEvent.name,
        categories: matchedEvent.categories,
        cassaAssignments: matchedEvent.cassaAssignments || {},
        casses: cassasList,
        masterCassa,
        enableDepartments: matchedEvent.enableDepartments || false,
        startingNumber: matchedEvent.startingNumber || 1,
        items: matchedEvent.items,
        notes: matchedEvent.notes,
        printerSettings: matchedEvent.printerSettings || config.defaultPrinterSettings || DEFAULT_PRINTER_SETTINGS,
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
