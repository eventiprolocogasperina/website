import { NextResponse } from 'next/server';
import { readyNumbers } from '@/server/domain/cash/departments';
import { errorResponse } from '../../_lib';

export const dynamic = 'force-dynamic';

/**
 * Schermo pubblico "Pronti" (§12.2): senza accesso, perché contiene solo numeri e reparti, mai dati
 * personali (§18.3). Esiste solo se il modulo reparti ha lo schermo acceso, altrimenti 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ edition: string }> }) {
  try {
    const slug = (await params).edition;
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    const data = await readyNumbers(slug);
    if (!data) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
