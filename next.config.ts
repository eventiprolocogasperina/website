import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo con LOCAL_DB=1 (sviluppo locale, vedi dev/README.md): una sola copia del driver Neon,
  // così la configurazione in src/instrumentation.ts vale per tutte le rotte.
  serverExternalPackages: process.env.LOCAL_DB === '1' ? ['@neondatabase/serverless'] : [],
  async redirects() {
    return [
      // Sito pubblico (§13.2, prompt 17): l'edizione A&P 2026 vive in /assaggia-e-passeggia/2026 e i QR stampati
      // delle tappe (/assaggia-e-passeggia/tappa/:id) sono l'URL stabile, risolto dal modulo route-stops.
      // La vecchia pagina di successo resta (link nelle email già inviate, con ?order=…).
      { source: '/assaggia-e-passeggia/edizione-2026', destination: '/assaggia-e-passeggia/2026', permanent: true },
      { source: '/assaggia-e-passeggia/edizione-2026/tappa/:id', destination: '/assaggia-e-passeggia/tappa/:id', permanent: true },
      { source: '/assaggia-e-passeggia/edizione-2026/ticket', destination: '/assaggia-e-passeggia/2026', permanent: true },
      { source: '/assaggia-e-passeggia/ticket', destination: '/assaggia-e-passeggia/2026', permanent: true },
      { source: '/assaggia-e-passeggia/success', destination: '/assaggia-e-passeggia/edizione-2026/success', permanent: true },
      // Vecchia mappa dell'admin → nuova shell a due livelli (§10.4). /admin/vai/… sceglie l'edizione corrente.
      ...[
        ['/admin/eventi', '/admin/edizioni'],
        ['/admin/notizie', '/admin/sito/notizie'],
        ['/admin/media', '/admin/sito/galleria'],
        ['/admin/recensioni', '/admin/e/zuccaland-2026/m/reviews'],
        ['/admin/zuccaland-inviti', '/admin/e/zuccaland-2026/m/invites'],
        ['/admin/zuccaland-photos', '/admin/e/zuccaland-2026/m/visitor-photos'],
        ['/admin/cassa', '/admin/vai/cassa'],
        ['/admin/analytics', '/admin/vai/statistiche'],
        ['/admin/pagine/zuccaland', '/admin/e/zuccaland-2026/pagina'],
        ['/admin/pagine/sponsor', '/admin/sito/sponsor'],
        ['/admin/pagine/associazione', '/admin/sito/pagine'],
        ['/admin/pagine/archiviate/assaggia-2026', '/admin/e/assaggia-e-passeggia-2026/pagina'],
        ['/admin/impostazioni', '/admin/sistema/impostazioni'],
        ['/admin/email-preview', '/admin/sistema/email'],
        ['/admin/scanner', '/scanner'],
      ].map(([source, destination]) => ({ source, destination, permanent: true })),
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
