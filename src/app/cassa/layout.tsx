import type { Metadata, Viewport } from 'next';
import { RegisterServiceWorker } from './RegisterServiceWorker';

export const metadata: Metadata = {
  title: 'Cassa · Pro Loco Gasperina',
  manifest: '/cassa/manifest.webmanifest',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Cassa', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e3a8a',
};

export default function CassaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterServiceWorker />
      {children}
    </>
  );
}
