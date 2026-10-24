'use server';

import { runAction } from '@/server/admin/run-action';
import { saveRulesUrl, saveSetupWhereWhen, skipSetupStep, type SetupWhereWhenInput } from '@/server/domain/editions/setup';
import type { z } from 'zod';

const paths = (edition: string) => [`/admin/e/${edition}`];

export async function skipSetupStepAction(edition: string, step: string) {
  return runAction(paths(edition), (ctx) => skipSetupStep(ctx, edition, step));
}
export async function saveWhereWhenAction(edition: string, input: z.input<typeof SetupWhereWhenInput>) {
  return runAction(paths(edition), (ctx) => saveSetupWhereWhen(ctx, edition, input));
}
export async function saveRulesUrlAction(edition: string, url: string) {
  return runAction(paths(edition), (ctx) => saveRulesUrl(ctx, edition, url));
}
