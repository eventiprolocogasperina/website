'use server';

import { runAction } from '@/server/admin/run-action';
import { createEdition, type CreateEditionInput } from '@/server/domain/editions';
import { deleteSeries } from '@/server/domain/editions/delete';
import { saveSeries, type SeriesInput } from '@/server/domain/editions/series';
import { startEditionWizard, type StartWizardInput } from '@/server/domain/editions/setup';

export async function createEditionAction(input: CreateEditionInput) {
  return runAction(['/admin'], (ctx) => createEdition(ctx, input));
}

export async function saveSeriesAction(id: string | null, input: SeriesInput) {
  return runAction(['/admin'], (ctx) => saveSeries(ctx, id, input));
}

export async function startEditionWizardAction(input: StartWizardInput) {
  return runAction(['/admin'], (ctx) => startEditionWizard(ctx, input));
}

export async function deleteSeriesAction(id: string) {
  return runAction(['/admin'], (ctx) => deleteSeries(ctx, id));
}
