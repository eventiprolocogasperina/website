import { csvResponse } from '@/lib/csv';
import { authorize } from '@/server/auth/context';
import { costsCsv, listCosts, yearlyCsv, yearlySummary } from '@/server/domain/costs';

export const dynamic = 'force-dynamic';

/** CSV dei costi generali, oppure (?tipo=riepilogo) del riepilogo per anno. */
export async function GET(req: Request) {
  const { ctx, denied } = await authorize('costs.read');
  if (denied) return denied;
  const day = new Date().toISOString().slice(0, 10);
  if (new URL(req.url).searchParams.get('tipo') === 'riepilogo') return csvResponse(yearlyCsv(await yearlySummary(ctx)), `riepilogo-annuale-${day}.csv`);
  return csvResponse(costsCsv(await listCosts(ctx, null)), `costi-generali-${day}.csv`);
}
