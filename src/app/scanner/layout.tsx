import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

// App da campo installabile (PWA): manifest proprio con avvio su /scanner, a schermo intero.
export const metadata: Metadata = {
  title: 'Scanner',
  manifest: '/scanner.webmanifest',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Scanner', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = { themeColor: '#0f172a', viewportFit: 'cover' };

export default function ScannerLayout({ children }: { children: ReactNode }) {
  return children;
}
