// Service worker della cassa (§12.1 punto 7): registrato solo da /cassa con scope /cassa, quindi non
// tocca il resto del sito. Tiene in cache la pagina e i file statici di Next per riaprire la cassa
// senza rete; le API non passano mai dalla cache (la coda delle vendite è in IndexedDB).

const VERSION = 'cassa-v1';

const SCRIPT = `
const CACHE = '${VERSION}';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cassa-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Pagine della cassa: prima la rete, senza rete l'ultima copia.
  if (req.mode === 'navigate' && url.pathname.startsWith('/cassa') && !url.pathname.startsWith('/cassa/pronti')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(url.pathname, copy)); }
          return res;
        })
        .catch(() => caches.match(url.pathname).then((hit) => hit || caches.match('/cassa')).then((hit) => hit || Response.error())),
    );
    return;
  }
  // File statici di Next (con l'hash nel nome): dalla cache se ci sono.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
  }
});
`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      // Lo script sta in /cassa/sw.js ma deve servire anche /cassa (senza barra finale).
      'Service-Worker-Allowed': '/cassa',
    },
  });
}
