// Manifest della nuova cassa: installabile come app con scope /cassa (il manifest del sito resta
// quello della vecchia /cashier, §18.10).
export function GET() {
  const manifest = {
    name: 'Cassa Pro Loco Gasperina',
    short_name: 'Cassa',
    description: 'Cassa delle sagre e degli eventi della Pro Loco Gasperina APS',
    start_url: '/cassa',
    scope: '/cassa',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0f172a',
    theme_color: '#1e3a8a',
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
  };
  return new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } });
}
