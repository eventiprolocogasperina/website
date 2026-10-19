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
import { changeEditionStatus, updateEdition, type UpdateEditionInput } from '@/server/domain/editions';
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
