'use server';

import { postponeSession } from '@/modules/postponement/server';
import { runAction } from '@/server/admin/run-action';

export async function postponeSessionAction(edition: string, input: { editionId: string; sessionId: string; toSessionId: string; reason: string | null }) {
  return runAction([`/admin/e/${edition}`], (ctx) => postponeSession(ctx, input));
}
