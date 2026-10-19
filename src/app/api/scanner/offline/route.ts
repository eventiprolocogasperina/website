import { offlineManifest } from '@/server/domain/checkin';
import { scannerRoute } from '../respond';

export const dynamic = 'force-dynamic';

/** Elenco per la modalità offline: impronte dei QR validi, senza dati personali. */
export async function GET(request: Request) {
  const list = new URL(request.url).searchParams.get('lista') ?? '';
  return scannerRoute('checkin.scan', (ctx) => offlineManifest(ctx, list));
}
