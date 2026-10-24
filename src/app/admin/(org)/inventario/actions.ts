'use server';

import { runAction } from '@/server/admin/run-action';
import { adjustItem, assignToEdition, createItem, dismissItem, itemMovements, returnFromEdition, updateItem, type AdjustInput, type AssignInput, type ItemInput } from '@/server/domain/inventory';
import type { z } from 'zod';

const PATHS = ['/admin/inventario', '/admin/e'];

export async function saveItemAction(id: string | null, input: ItemInput & { quantity: number }) {
  return runAction(PATHS, async (ctx) => {
    if (id) await updateItem(ctx, id, input);
    else await createItem(ctx, input);
  });
}

export async function dismissItemAction(id: string, reason: string) {
  return runAction(PATHS, (ctx) => dismissItem(ctx, id, reason));
}

export async function adjustItemAction(id: string, input: z.input<typeof AdjustInput>) {
  return runAction(PATHS, (ctx) => adjustItem(ctx, id, input));
}

export async function assignItemAction(id: string, input: z.input<typeof AssignInput>) {
  return runAction(PATHS, (ctx) => assignToEdition(ctx, id, input));
}

export async function returnItemAction(movementId: string, returnedQuantity: number, reason: string) {
  return runAction(PATHS, (ctx) => returnFromEdition(ctx, movementId, { returnedQuantity, reason }));
}

/** Storico di un materiale, per il pannello di dettaglio. */
export async function itemMovementsAction(id: string) {
  return runAction([], async (ctx) =>
    (await itemMovements(ctx, id)).map((r) => ({ id: r.m.id, kind: r.m.kind, quantity: r.m.quantity, at: r.m.createdAt.toISOString(), returnedAt: r.m.returnedAt?.toISOString() ?? null, returnedQuantity: r.m.returnedQuantity, reason: r.m.reason, edition: r.editionTitle, by: r.by })),
  );
}
