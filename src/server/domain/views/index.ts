import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb } from '@/server/db/client';
import { savedViews } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { isUniqueViolation } from '@/server/domain/orders/shared';

// Viste salvate degli elenchi (§11.1), per utente. Sono preferenze personali, non dati dell'associazione:
// niente registro attività, e si cancellano davvero. Le viste predefinite stanno nel codice.

export const VIEW_SCOPES = ['orders'] as const;
const Scope = z.enum(VIEW_SCOPES);

function userOf(ctx: Ctx): string {
  if (!ctx.user) throw new DomainError('FORBIDDEN', { message: 'Le viste si salvano solo con un utente personale.' });
  return ctx.user.id;
}

export type SavedView = { id: string; name: string; query: string };

export async function listSavedViews(ctx: Ctx, scope: (typeof VIEW_SCOPES)[number]): Promise<SavedView[]> {
  if (!ctx.user) return [];
  return getDb()
    .select({ id: savedViews.id, name: savedViews.name, query: savedViews.query })
    .from(savedViews)
    .where(and(eq(savedViews.userId, ctx.user.id), eq(savedViews.scope, Scope.parse(scope))))
    .orderBy(asc(savedViews.createdAt));
}

export const SaveViewInput = z.object({
  scope: Scope,
  name: z.string().trim().min(2, 'Dai un nome alla vista.').max(40),
  /** Query string dei filtri: solo caratteri da URL, niente pagina. */
  query: z
    .string()
    .trim()
    .max(500)
    .regex(/^[\w=&%.,+-]*$/, 'Filtri non validi.')
    .transform((q) => {
      const p = new URLSearchParams(q);
      p.delete('pagina');
      return p.toString();
    }),
});

export async function saveView(ctx: Ctx, input: z.input<typeof SaveViewInput>): Promise<SavedView> {
  const userId = userOf(ctx);
  const data = SaveViewInput.parse(input);
  const existing = await listSavedViews(ctx, data.scope);
  if (existing.length >= 20) throw new DomainError('VALIDATION', { message: 'Puoi salvare al massimo 20 viste.' });
  try {
    const [row] = await getDb().insert(savedViews).values({ userId, scope: data.scope, name: data.name, query: data.query }).returning({ id: savedViews.id, name: savedViews.name, query: savedViews.query });
    return row;
  } catch (error) {
    if (isUniqueViolation(error)) throw new DomainError('CONFLICT', { message: 'Hai già una vista con questo nome.' });
    throw error;
  }
}

export async function deleteView(ctx: Ctx, id: string): Promise<void> {
  const userId = userOf(ctx);
  const rows = await getDb()
    .delete(savedViews)
    .where(and(eq(savedViews.id, z.string().uuid().parse(id)), eq(savedViews.userId, userId)))
    .returning({ id: savedViews.id });
  if (!rows.length) throw new DomainError('NOT_FOUND');
}
