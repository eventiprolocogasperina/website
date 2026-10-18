import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo con LOCAL_DB=1 (sviluppo locale, vedi dev/README.md): una sola copia del driver Neon,
  // così la configurazione in src/instrumentation.ts vale per tutte le rotte.
  serverExternalPackages: process.env.LOCAL_DB === '1' ? ['@neondatabase/serverless'] : [],
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
