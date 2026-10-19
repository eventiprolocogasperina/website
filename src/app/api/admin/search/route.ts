import { NextResponse } from 'next/server';
import { searchOrders } from '@/server/admin/search';
import { requirePermission } from '@/server/auth/context';
import { log } from '@/server/log';

// GET /api/admin/search?q=… — ricerca ordini per la palette ⌘K (al massimo 10 risultati).
export async function GET(request: Request) {
  const denied = await requirePermission('orders.read');
  if (denied) return denied;
  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q.length > 100) return NextResponse.json({ error: 'Ricerca troppo lunga' }, { status: 400 });
  try {
    return NextResponse.json({ orders: await searchOrders(q) });
  } catch (error) {
    log.error('Admin search failed', { error });
    return NextResponse.json({ error: 'Ricerca non riuscita. Riprova.' }, { status: 500 });
  }
}
