import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo con LOCAL_DB=1 (sviluppo locale, vedi dev/README.md): una sola copia del driver Neon,
  // così la configurazione in src/instrumentation.ts vale per tutte le rotte.
  serverExternalPackages: process.env.LOCAL_DB === '1' ? ['@neondatabase/serverless'] : [],
  async redirects() {
    return [
      // I QR stampati delle tappe A&P 2026 e i vecchi link puntano a percorsi senza "edizione-2026".
      { source: '/assaggia-e-passeggia/tappa/:id', destination: '/assaggia-e-passeggia/edizione-2026/tappa/:id', permanent: true },
      { source: '/assaggia-e-passeggia/ticket', destination: '/assaggia-e-passeggia/edizione-2026/ticket', permanent: true },
      { source: '/assaggia-e-passeggia/success', destination: '/assaggia-e-passeggia/edizione-2026/success', permanent: true },
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
