import { ScannerApp } from '@/components/scanner/ScannerApp';
import { scannerV2Enabled } from '@/server/domain/checkin';
import LegacyScanner from './LegacyScanner';

export const dynamic = 'force-dynamic';

/**
 * /scanner: lo scanner di oggi finché il flag scanner_v2 è spento (Zuccaland 2026 è in vendita e i
 * suoi ordini arrivano nel nucleo nuovo solo con la migrazione); acceso, lo scanner nuovo (§12.3).
 */
export default async function ScannerPage() {
  return (await scannerV2Enabled()) ? <ScannerApp /> : <LegacyScanner />;
}
