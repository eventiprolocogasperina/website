import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { EDITION_COOKIE, listEditions, pickDefaultEdition } from '@/server/domain/editions';

/**
 * /admin/vai/<sezione> porta alla stessa sezione dell'edizione scelta per ultima (o della prima attiva).
 * Serve ai vecchi indirizzi senza edizione, es. /admin/cassa → /admin/vai/cassa (vedi next.config.ts).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const edition = pickDefaultEdition(await listEditions(), (await cookies()).get(EDITION_COOKIE)?.value);
  const rest = path.map(encodeURIComponent).join('/');
  const target = edition ? `/admin/e/${edition.slug}/${rest}` : '/admin';
  return NextResponse.redirect(new URL(target, req.url), 307);
}
