import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/server/auth/token';

// Primo livello di protezione dell'admin (il secondo è requireAdmin() dentro ogni rotta).
// Senza una sessione admin valida: /admin/** e /scanner vanno al login, /api/admin/** risponde 401.
// Il secondo livello (permessi per ruolo) è in src/server/auth/context.ts, richiamato da ogni rotta.

const ADMIN_COOKIE = 'pl_admin';
const DEVICE_COOKIE = 'pl_device';
// Ultima edizione aperta nell'admin: la usano il selettore e i vecchi indirizzi senza edizione (/admin/vai/…).
const EDITION_COOKIE = 'pl_edition';
const EDITION_PATH = /^\/admin\/e\/([a-z0-9-]{1,80})(?:\/|$)/;

// Rotte sotto /api/admin che il sito pubblico usa in sola lettura.
const PUBLIC_ADMIN_API: Array<{ method: string; path: string }> = [
  { method: 'GET', path: '/api/admin/sponsors' }, // SponsorsMarquee
];

const CASSA_PUBLIC = ['/cassa/pronti', '/cassa/sw.js', '/cassa/manifest.webmanifest'];

const PROTECTED = ['/admin', '/api/admin', '/scanner', '/cassa'];

// Preview di Vercel bloccato finché non ha le sue variabili (database di prova, Nexi di test):
// senza PREVIEW_READY=1 non apre nessuna pagina, così non lavora mai con le chiavi di produzione.
const previewLocked = () => process.env.VERCEL_ENV === 'preview' && (process.env.PREVIEW_READY !== '1' || !process.env.PREVIEW_POSTGRES_URL);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (previewLocked()) {
    // Solo i nomi delle variabili mancanti, mai i valori.
    const missing = ['PREVIEW_READY', 'PREVIEW_POSTGRES_URL'].filter((k) => (k === 'PREVIEW_READY' ? process.env[k] !== '1' : !process.env[k]));
    return new NextResponse(`Preview non ancora configurato. Mancano: ${missing.join(', ')} (branch ${process.env.VERCEL_GIT_COMMIT_REF ?? '?'}).`, { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  if (PUBLIC_ADMIN_API.some((r) => r.method === request.method && r.path === pathname)) {
    return NextResponse.next();
  }

  const session = verifyToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.AUTH_SECRET || '');
  // L'accesso di emergenza (sub "admin", senza sessione sul server) vale solo con ALLOW_LEGACY_ADMIN=true.
  // Le sessioni degli utenti si controllano anche sul database, in getAdminCtx().
  const validAdmin = session?.role === 'admin' && (!!session.sid || process.env.ALLOW_LEGACY_ADMIN === 'true');

  // Lo scanner si apre anche da un dispositivo abbinato: il PIN lo chiede la pagina (§8.2).
  if (pathname.startsWith('/scanner') && (validAdmin || request.cookies.has(DEVICE_COOKIE))) return NextResponse.next();

  // Nuova cassa (§12.1): come lo scanner. Lo schermo "Pronti", il manifest e il service worker sono pubblici.
  if (pathname === '/cassa' || pathname.startsWith('/cassa/')) {
    if (CASSA_PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
    if (validAdmin || request.cookies.has(DEVICE_COOKIE)) return NextResponse.next();
  }

  if (validAdmin) {
    const res = NextResponse.next();
    const edition = pathname.match(EDITION_PATH)?.[1];
    if (edition && request.cookies.get(EDITION_COOKIE)?.value !== edition) {
      res.cookies.set(EDITION_COOKIE, edition, {
        path: '/admin',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 180,
      });
    }
    return res;
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Tutte le rotte, per il blocco del Preview; fuori dalle aree protette il proxy non fa nulla.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
