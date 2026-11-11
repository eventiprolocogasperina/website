import { ScannerApp } from '@/components/scanner/ScannerApp';

export const dynamic = 'force-dynamic';

/** /scanner: lo scanner nuovo con le liste di check-in (§12.3). Lo scanner di prima è stato tolto il 2026-11-11. */
export default function ScannerPage() {
  return <ScannerApp />;
}
