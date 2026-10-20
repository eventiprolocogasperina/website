import 'server-only';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb, withTransaction } from '@/server/db/client';
import { editions } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { getSettings } from '@/server/domain/settings';

/** Tipi di notifica Telegram, attivabili per singola edizione. Chiave assente = attiva. */
export const NOTIFICATION_TYPES = [
  { key: 'orderPaid', label: 'Nuovo ordine', description: 'Ordine pagato online, con link di pagamento o dall’admin (non la cassa).' },
  { key: 'paymentProblem', label: 'Pagamento non riuscito', description: 'Pagamento rifiutato o con importo diverso dal totale.' },
  { key: 'refundRequested', label: 'Richiesta di rimborso', description: 'Un cliente o lo staff chiede un rimborso.' },
  { key: 'cashDifference', label: 'Turno di cassa con differenza', description: 'Chiusura Z con contanti diversi dall’atteso.' },
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]['key'];

export const isNotificationOn = (settings: Record<string, boolean> | null | undefined, type: NotificationType) => settings?.[type] !== false;

export const EditionNotificationsInput = z.object({
  edition: z.string().min(1),
  settings: z.object(Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t.key, z.boolean()])) as Record<NotificationType, z.ZodBoolean>),
});

/** Accende o spegne i tipi di notifica di un'edizione. Le edizioni archiviate non si toccano (§18.7). */
export async function saveEditionNotifications(ctx: Ctx, input: z.input<typeof EditionNotificationsInput>): Promise<void> {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  const data = EditionNotificationsInput.parse(input);
  await withTransaction(async (tx) => {
    const [e] = await tx.select().from(editions).where(eq(editions.slug, data.edition)).for('update');
    if (!e) throw new DomainError('NOT_FOUND');
    if (e.status === 'archived') throw new DomainError('EDITION_ARCHIVED');
    await tx.update(editions).set({ notificationSettings: data.settings, updatedAt: new Date() }).where(eq(editions.id, e.id));
    await audit(tx, ctx, 'edition.notifications_saved', { entityType: 'edition', entityId: e.id, edition: e.slug, before: e.notificationSettings, after: data.settings });
  });
}

/** Chat che possono usare i comandi del bot: quelle scelte in admin più TELEGRAM_CHAT_ID. */
export async function allowedChatIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  if (process.env.TELEGRAM_CHAT_ID) ids.add(process.env.TELEGRAM_CHAT_ID);
  try {
    const s = await getSettings('telegram');
    for (const c of s.telegram_allowed_chats) ids.add(c.id);
    if (s.telegram_alert_chat_id) ids.add(s.telegram_alert_chat_id);
  } catch {
    // Database irraggiungibile: vale solo la chat dell'env.
  }
  return ids;
}

/** Edizioni con le loro impostazioni di notifica, per la pagina Sistema → Notifiche. */
export async function listEditionNotifications() {
  const rows = await getDb()
    .select({ slug: editions.slug, title: editions.title, status: editions.status, settings: editions.notificationSettings, startsAt: editions.startsAt })
    .from(editions);
  return rows
    .filter((r) => r.status !== 'draft')
    .sort((a, b) => (b.startsAt?.getTime() ?? 0) - (a.startsAt?.getTime() ?? 0))
    .map((r) => ({ ...r, startsAt: r.startsAt?.toISOString() ?? null, settings: Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t.key, isNotificationOn(r.settings, t.key)])) as Record<NotificationType, boolean> }));
}
