import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/server/auth/token';

// Primo livello di protezione dell'admin (il secondo è requireAdmin() dentro ogni rotta).
// Senza una sessione admin valida: /admin/** va al login, /api/admin/** risponde 401.

const ADMIN_COOKIE = 'pl_admin';

// Rotte sotto /api/admin che il sito pubblico usa in sola lettura.
const PUBLIC_ADMIN_API: Array<{ method: string; path: string }> = [
  { method: 'GET', path: '/api/admin/sponsors' }, // SponsorsMarquee
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_ADMIN_API.some((r) => r.method === request.method && r.path === pathname)) {
    return NextResponse.next();
  }

  const session = verifyToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.AUTH_SECRET || '');
  if (session?.role === 'admin') return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
