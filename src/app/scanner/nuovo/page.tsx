import type { Metadata } from 'next';
import { ScannerApp } from '@/components/scanner/ScannerApp';

export const metadata: Metadata = { title: 'Scanner nuovo' };

/** Lo scanner nuovo, sempre: per provarlo sui telefoni prima di accendere il flag scanner_v2. */
export default function NewScannerPage() {
  return <ScannerApp />;
}
