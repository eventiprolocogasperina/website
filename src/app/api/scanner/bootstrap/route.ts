import { scannerEditions, scannerSetup } from '@/server/domain/checkin';
import { scannerRoute } from '../respond';

export const dynamic = 'force-dynamic';

/**
 * Avvio dello scanner: liste, date, data di oggi e pulsanti dei moduli dell'edizione del dispositivo.
 * Chi entra dall'admin senza dispositivo sceglie l'edizione (`?edizione=`).
 */
export async function GET(request: Request) {
  return scannerRoute('checkin.scan', async (ctx, deviceEdition) => {
    const slug = deviceEdition ?? new URL(request.url).searchParams.get('edizione');
    if (!slug) return { editions: await scannerEditions(ctx) };
    return { setup: await scannerSetup(ctx, slug), canChangeEdition: !deviceEdition };
  });
}
