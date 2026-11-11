import { NextResponse } from 'next/server';

// Checkout classico chiuso il 2026-11-11: gli acquisti passano da /acquista/[edizione] (checkout nuovo).
export function POST() {
  return NextResponse.json({ error: 'Le vendite da questa pagina sono chiuse. Acquista dalla pagina dell’evento.' }, { status: 410 });
}
