import 'server-only';
import { asc, eq, notInArray } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb } from '@/server/db/client';
import { checkinLists, editions, sessions } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { romeDateKey } from '@/lib/dates';
import { scannerActionsFor } from './actions';
import { paidActionProducts } from './paid';

/** Cosa serve allo scanner per partire: liste, date, data di oggi e pulsanti dei moduli. Nessun dato personale. */
export type ScannerSetup = {
  edition: { slug: string; title: string; status: string };
  lists: Array<{ id: string; name: string; sessionId: string | null; allowMultiple: boolean }>;
  sessions: Array<{ id: string; label: string; startsAt: string }>;
  /** La data di oggi (ora di Roma), se l'edizione ne ha una; altrimenti null = tutte le date. */
  todaySessionId: string | null;
  /** `paid`: prodotto e prezzo del catalogo se il pulsante incassa (si riconfermano nel popup). */
  actions: Array<{ key: string; label: string; questionKey: string; paid: { name: string; priceCents: number } | null }>;
  /** Cosa può fare chi usa lo scanner: l'interfaccia nasconde il resto, il server lo rifiuta comunque. */
  permissions: { revert: boolean; search: boolean; stats: boolean; sell: boolean };
};

export async function scannerSetup(ctx: Ctx, editionSlug: string, now = new Date()): Promise<ScannerSetup> {
  if (!can(ctx, 'checkin.scan', { edition: editionSlug })) throw new DomainError('FORBIDDEN');
  const db = getDb();
  const [edition] = await db.select().from(editions).where(eq(editions.slug, editionSlug));
  if (!edition) throw new DomainError('NOT_FOUND');
  const [lists, days] = await Promise.all([
    db.select().from(checkinLists).where(eq(checkinLists.editionId, edition.id)).orderBy(asc(checkinLists.createdAt)),
    db.select().from(sessions).where(eq(sessions.editionId, edition.id)).orderBy(asc(sessions.startsAt)),
  ]);
  // Le date rinviate non si scelgono: i loro biglietti entrano alla data di recupero.
  const open = days.filter((s) => !(s.status === 'postponed' && s.rescheduledToSessionId));
  const today = romeDateKey(now);
  const actions = scannerActionsFor(edition);
  const paid = await paidActionProducts(edition.id, actions);
  return {
    edition: { slug: edition.slug, title: edition.title, status: edition.status },
    lists: lists.map((l) => ({ id: l.id, name: l.name, sessionId: l.sessionId, allowMultiple: l.allowMultiple })),
    sessions: open.map((s) => ({ id: s.id, label: s.label, startsAt: s.startsAt.toISOString() })),
    todaySessionId: open.find((s) => romeDateKey(s.startsAt) === today)?.id ?? null,
    actions: actions.map((a) => ({ key: a.key, label: a.label, questionKey: a.questionKey, paid: paid[a.key] ?? null })),
    permissions: {
      revert: can(ctx, 'checkin.revert', { edition: editionSlug }),
      search: can(ctx, 'checkin.search', { edition: editionSlug }),
      stats: can(ctx, 'checkin.stats', { edition: editionSlug }),
      sell: can(ctx, 'pos.sell', { edition: editionSlug }),
    },
  };
}

/** Edizioni in cui chi è entrato dall'admin (senza dispositivo) può usare lo scanner. */
export async function scannerEditions(ctx: Ctx): Promise<Array<{ slug: string; title: string }>> {
  const rows = await getDb()
    .select({ slug: editions.slug, title: editions.title, status: editions.status })
    .from(editions)
    .where(notInArray(editions.status, ['draft', 'archived']))
    .orderBy(asc(editions.startsAt));
  return rows.filter((e) => can(ctx, 'checkin.scan', { edition: e.slug })).map(({ slug, title }) => ({ slug, title }));
}
