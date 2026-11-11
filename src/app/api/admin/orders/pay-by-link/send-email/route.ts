import { NextResponse } from 'next/server';

// Pay-link del checkout classico chiuso il 2026-11-11: si usa il pay-link del sistema nuovo (modulo Pay-link).
export function POST() {
  return NextResponse.json({ error: 'Il pay-link del sistema vecchio è stato chiuso. Usa il pay-link dalla pagina dell’ordine nel sistema nuovo.' }, { status: 410 });
}
