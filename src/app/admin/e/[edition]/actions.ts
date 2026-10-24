'use server';

import { runAction } from '@/server/admin/run-action';
import {
  deleteDiscount,
  deleteProduct,
  deleteQuota,
  deleteSession,
  saveDiscount,
  saveProduct,
  saveQuota,
  saveSession,
  type DiscountInput,
  type ProductInput,
  type QuotaInput,
  type SessionInput,
} from '@/server/domain/catalog';
import { setProductStock, type StockInput } from '@/server/domain/catalog/stock';
import { changeEditionStatus, updateEdition, type UpdateEditionInput } from '@/server/domain/editions';
import { skipClosingCheck, unskipClosingCheck } from '@/server/domain/editions/closing';
import { generateFinalReport } from '@/server/domain/editions/final-report';
import { saveModuleSettings, setModuleEnabled } from '@/server/domain/editions/modules';
import type { EditionStatus } from '@/server/domain/editions/types';

const paths = (edition: string) => [`/admin/e/${edition}`];

export async function saveSessionAction(edition: string, id: string | null, input: SessionInput) {
  return runAction(paths(edition), (ctx) => saveSession(ctx, edition, id, input));
}
export async function deleteSessionAction(edition: string, id: string) {
  return runAction(paths(edition), (ctx) => deleteSession(ctx, edition, id));
}

export async function saveProductAction(edition: string, id: string | null, input: ProductInput) {
  return runAction(paths(edition), (ctx) => saveProduct(ctx, edition, id, input));
}
export async function deleteProductAction(edition: string, id: string) {
  return runAction(paths(edition), (ctx) => deleteProduct(ctx, edition, id));
}

/** "Pezzi disponibili" di un prodotto di cassa: aggiorna anche la cassa, che legge le stesse quote. */
export async function setProductStockAction(edition: string, input: StockInput) {
  return runAction(paths(edition), (ctx) => setProductStock(ctx, edition, input));
}

export async function saveQuotaAction(edition: string, id: string | null, input: QuotaInput) {
  return runAction(paths(edition), (ctx) => saveQuota(ctx, edition, id, input));
}
export async function deleteQuotaAction(edition: string, id: string) {
  return runAction(paths(edition), (ctx) => deleteQuota(ctx, edition, id));
}

export async function saveDiscountAction(edition: string, id: string | null, input: DiscountInput) {
  return runAction(paths(edition), (ctx) => saveDiscount(ctx, edition, id, input));
}
export async function deleteDiscountAction(edition: string, id: string) {
  return runAction(paths(edition), (ctx) => deleteDiscount(ctx, edition, id));
}

export async function updateEditionAction(edition: string, input: UpdateEditionInput) {
  return runAction(['/admin'], (ctx) => updateEdition(ctx, edition, input));
}
export async function changeStatusAction(edition: string, to: EditionStatus, reason: string | null) {
  return runAction(['/admin'], (ctx) => changeEditionStatus(ctx, edition, { to, reason }));
}

export async function setModuleEnabledAction(edition: string, module: string, enabled: boolean) {
  return runAction(paths(edition), (ctx) => setModuleEnabled(ctx, edition, { module, enabled }));
}
export async function saveModuleSettingsAction(edition: string, module: string, settings: unknown) {
  return runAction(paths(edition), (ctx) => saveModuleSettings(ctx, edition, { module, settings }));
}

export async function skipClosingCheckAction(edition: string, key: string, reason: string) {
  return runAction(paths(edition), (ctx) => skipClosingCheck(ctx, edition, { key, reason }));
}
export async function unskipClosingCheckAction(edition: string, key: string) {
  return runAction(paths(edition), (ctx) => unskipClosingCheck(ctx, edition, key));
}
export async function generateFinalReportAction(edition: string) {
  return runAction(paths(edition), (ctx) => generateFinalReport(ctx, edition));
}
