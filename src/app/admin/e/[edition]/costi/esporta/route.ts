import { csvResponse } from '@/lib/csv';
import { authorize } from '@/server/auth/context';
import { costsCsv, listCosts } from '@/server/domain/costs';

export const dynamic = 'force-dynamic';

/** Costi dell'edizione in CSV (annullati compresi, segnati). */
export async function GET(_req: Request, { params }: { params: Promise<{ edition: string }> }) {
  const { edition } = await params;
  const { ctx, denied } = await authorize('costs.read', { edition });
  if (denied) return denied;
  return csvResponse(costsCsv(await listCosts(ctx, edition)), `costi-${edition}.csv`);
}
