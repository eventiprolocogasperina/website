import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cassa Pro Loco Gasperina',
    short_name: 'Cassa ProLoco',
    description: 'Registratore di cassa e gestione contributi per sagre ed eventi - Pro Loco Gasperina APS',
    start_url: '/cashier',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#1e3a8a',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
