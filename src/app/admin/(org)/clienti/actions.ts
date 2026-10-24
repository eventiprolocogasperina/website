'use server';

// Server Action della pagina Clienti: modifica (note, telefono, revoca consenso), unione dei doppioni.
import { runAction } from '@/server/admin/run-action';
import { listCustomers, mergeCustomers, updateCustomer } from '@/server/domain/customers/admin';

const PATHS = ['/admin/clienti'];

export async function updateCustomerAction(id: string, input: { name: string; phone: string; notes: string; revokeConsent: boolean }) {
  return runAction(PATHS, (ctx) => updateCustomer(ctx, { id, ...input, name: input.name || null }));
}

/** `sourceId` è il doppione che sparisce dall'elenco, `targetId` il cliente che resta. */
export async function mergeCustomersAction(sourceId: string, targetId: string, confirmEmail: string) {
  return runAction(PATHS, (ctx) => mergeCustomers(ctx, { sourceId, targetId, confirmEmail }));
}

/** Ricerca per scegliere il doppione da unire (prima pagina dei risultati). */
export async function searchCustomersAction(q: string) {
  return runAction([], async (ctx) => (await listCustomers(ctx, { q, page: 0 })).rows.slice(0, 20).map((r) => ({ id: r.id, name: r.name, email: r.email, orders: r.orders })));
}
