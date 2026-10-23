'use server';

import { runAction } from '@/server/admin/run-action';
import { createCost, updateCost, voidCost, type CostInput } from '@/server/domain/costs';

const paths = (edition: string | null) => (edition ? [`/admin/e/${edition}/costi`] : ['/admin/costi']);

/** Nuovo costo di un'edizione (slug) o generale (null), oppure modifica di uno esistente. */
export async function saveCostAction(edition: string | null, id: string | null, input: CostInput) {
  return runAction(paths(edition), async (ctx) => {
    if (id) await updateCost(ctx, id, input);
    else await createCost(ctx, edition, input);
  });
}

export async function voidCostAction(edition: string | null, id: string, reason: string) {
  return runAction(paths(edition), (ctx) => voidCost(ctx, id, reason));
}
