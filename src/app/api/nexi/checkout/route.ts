import { NextResponse } from 'next/server';

// Pagamento del checkout classico chiuso il 2026-11-11. Ritorno e notifica Nexi (/api/nexi/callback,
// /api/nexi/notifica) restano attivi per i pagamenti già avviati prima della chiusura.
export function GET() {
  return NextResponse.json({ error: 'Questo pagamento non è più disponibile. Contatta la Pro Loco.' }, { status: 410 });
}
