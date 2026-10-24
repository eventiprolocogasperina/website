import 'server-only';
import { count, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { actorLabel, type Ctx } from '@/server/auth/context-shared';
import { can, type Permission } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { privacyRequests, transparencyVersions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { sendAlert } from '@/server/integrations/telegram';
import { log } from '@/server/log';
import {
  DEFAULT_TRANSPARENCY,
  PRIVACY_REQUEST_LABELS,
  PRIVACY_REQUEST_STATUSES,
  PrivacyRequestInput,
  TransparencyContent,
  type PrivacyRequestKind,
  type PrivacyRequestStatus,
} from '@/lib/public/transparency';

// Pagina Trasparenza (§13.6): versioni dei contenuti e richieste degli interessati.

function assertCan(ctx: Ctx, permission: Permission) {
  if (!can(ctx, permission)) throw new DomainError('FORBIDDEN');
}

export type TransparencyVersion = { id: string; note: string; author: string; createdAt: Date };
export type TransparencyView = { content: TransparencyContent; updatedAt: Date | null; versions: TransparencyVersion[] };

/** Contenuto pubblicato (l'ultima versione valida) e lo storico. Senza versioni: il testo predefinito. */
export async function getTransparency(): Promise<TransparencyView> {
  const rows = await getDb().select().from(transparencyVersions).orderBy(desc(transparencyVersions.createdAt)).limit(30);
  const latest = rows.find((r) => TransparencyContent.safeParse(r.content).success);
  return {
    content: latest ? TransparencyContent.parse(latest.content) : DEFAULT_TRANSPARENCY,
    updatedAt: latest?.createdAt ?? null,
    versions: rows.map((r) => ({ id: r.id, note: r.note, author: r.publishedByLabel, createdAt: r.createdAt })),
  };
}

export const PublishTransparencyInput = z.object({
  content: TransparencyContent,
  note: z.string().trim().min(3, 'Scrivi in breve cosa è cambiato.').max(300),
});

/** Pubblica una nuova versione (le precedenti restano nello storico). Serve `content.edit`. */
export async function publishTransparency(ctx: Ctx, input: z.input<typeof PublishTransparencyInput>): Promise<{ id: string }> {
  assertCan(ctx, 'content.edit');
  const data = PublishTransparencyInput.parse(input);
  return withTransaction(async (tx) => {
    const [row] = await tx
      .insert(transparencyVersions)
      .values({ content: data.content, note: data.note, publishedByUserId: ctx.user?.id ?? null, publishedByLabel: actorLabel(ctx) })
      .returning({ id: transparencyVersions.id });
    await audit(tx, ctx, 'site.transparency_published', { entityType: 'transparency_version', entityId: row.id, after: { note: data.note } });
    return row;
  });
}

/**
 * Richiesta dal modulo pubblico: crea una voce da gestire in /admin/sito/trasparenza.
 * L'allarme Telegram dice solo che è arrivata e di che tipo (§18.11: nessun dato personale).
 */
export async function createPrivacyRequest(ip: string | null, input: PrivacyRequestInput): Promise<{ id: string }> {
  const data = PrivacyRequestInput.parse(input);
  if (data.website) throw new DomainError('VALIDATION');
  const row = await withTransaction(async (tx) => {
    const [created] = await tx
      .insert(privacyRequests)
      .values({ kind: data.kind, name: data.name, email: data.email.toLowerCase(), message: data.message })
      .returning({ id: privacyRequests.id });
    const ctx: Ctx = { user: null, device: null, legacy: false, grants: [], ip };
    await audit(tx, ctx, 'privacy_request.created', { entityType: 'privacy_request', entityId: created.id, after: { kind: data.kind } });
    return created;
  });
  try {
    await sendAlert(`Nuova richiesta sui dati personali (${PRIVACY_REQUEST_LABELS[data.kind]}). Rispondere entro 30 giorni: /admin/sito/trasparenza`);
  } catch (error) {
    log.warn('Allarme richiesta privacy non inviato', { error });
  }
  return row;
}

export type PrivacyRequestRow = {
  id: string;
  kind: PrivacyRequestKind;
  name: string;
  email: string;
  message: string | null;
  status: PrivacyRequestStatus;
  resolutionNote: string | null;
  handledAt: Date | null;
  createdAt: Date;
};

/** Richieste ricevute, le aperte per prime. Contengono dati personali: servono `customers.read`. */
export async function listPrivacyRequests(ctx: Ctx): Promise<{ rows: PrivacyRequestRow[]; open: number }> {
  assertCan(ctx, 'customers.read');
  const db = getDb();
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(privacyRequests).orderBy(desc(privacyRequests.createdAt)).limit(200),
    db.select({ n: count() }).from(privacyRequests).where(inArray(privacyRequests.status, ['new', 'in_progress'])),
  ]);
  const rank = (s: string) => (s === 'new' ? 0 : s === 'in_progress' ? 1 : 2);
  return {
    open: n,
    rows: rows
      .map((r) => ({ ...r, kind: r.kind as PrivacyRequestKind, status: r.status as PrivacyRequestStatus }))
      .sort((a, b) => rank(a.status) - rank(b.status) || b.createdAt.getTime() - a.createdAt.getTime()),
  };
}

/** Numero di richieste aperte, per il riepilogo della pagina (anche per chi non vede i dati). */
export async function countOpenPrivacyRequests(): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(privacyRequests).where(inArray(privacyRequests.status, ['new', 'in_progress']));
  return n;
}

export const UpdatePrivacyRequestInput = z.object({
  status: z.enum(PRIVACY_REQUEST_STATUSES),
  resolutionNote: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
});

/** Cambia lo stato di una richiesta (con nota). Non si cancella mai: resta la prova della risposta. */
export async function updatePrivacyRequest(ctx: Ctx, id: string, input: z.input<typeof UpdatePrivacyRequestInput>): Promise<void> {
  assertCan(ctx, 'customers.read');
  const data = UpdatePrivacyRequestInput.parse(input);
  if (data.status === 'rejected' && !data.resolutionNote) throw new DomainError('VALIDATION', { message: 'Scrivi perché la richiesta è respinta.' });
  await withTransaction(async (tx) => {
    const [before] = await tx.select().from(privacyRequests).where(eq(privacyRequests.id, id)).for('update');
    if (!before) throw new DomainError('NOT_FOUND');
    const closing = data.status === 'done' || data.status === 'rejected';
    await tx
      .update(privacyRequests)
      .set({
        status: data.status,
        resolutionNote: data.resolutionNote ?? before.resolutionNote,
        handledByUserId: ctx.user?.id ?? null,
        handledAt: closing ? (before.handledAt ?? new Date()) : null,
      })
      .where(eq(privacyRequests.id, id));
    await audit(tx, ctx, 'privacy_request.updated', {
      entityType: 'privacy_request',
      entityId: id,
      before: { status: before.status },
      after: { status: data.status },
    });
  });
}
