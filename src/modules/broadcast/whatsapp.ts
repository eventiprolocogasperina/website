import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Ctx } from '@/server/auth/context-shared';
import { getDb, withTransaction } from '@/server/db/client';
import { editions, sessions, whatsappBroadcasts, whatsappMessages } from '@/server/db/schema';
import { audit } from '@/server/domain/audit';
import { DomainError } from '@/server/domain/errors';
import { getSettings, readSettings } from '@/server/domain/settings';
import { maskPhone, statusesOf, toWhatsappNumber, whatsappClient } from '@/server/integrations/whatsapp';
import { moduleSettings } from '../registry';
import { AudienceInput, broadcastAudience, type AudienceRow } from './server';

// Invio WhatsApp a un segmento (modulo broadcast, prompt 18): si sceglie un modello approvato da Meta,
// si vede quante persone lo riceveranno e si conferma. Nel registro e nelle tabelle dell'invio solo
// codici ordine e numeri mascherati; i numeri interi servono solo durante l'invio.

export const WhatsappSegmentInput = AudienceInput.extend({ templateName: z.string().min(1, 'Scegli un modello.') });
export const WhatsappSendInput = WhatsappSegmentInput.extend({
  requestId: z.uuid(),
  /** Numero di destinatari visto nell'anteprima: se è cambiato si rifà l'anteprima. */
  expectedRecipients: z.number().int().min(1),
});

/** Un numero per destinatario: lo stesso telefono su più ordini riceve un solo messaggio. */
function recipients(rows: AudienceRow[]) {
  const byPhone = new Map<string, AudienceRow & { to: string }>();
  for (const r of rows) {
    const to = toWhatsappNumber(r.phone);
    if (to && !byPhone.has(to)) byPhone.set(to, { ...r, to });
  }
  return [...byPhone.values()];
}

async function setup(ctx: Ctx, input: z.input<typeof WhatsappSegmentInput>) {
  const data = WhatsappSegmentInput.parse(input);
  const [edition] = await getDb().select().from(editions).where(eq(editions.id, data.editionId));
  if (!edition) throw new DomainError('NOT_FOUND');
  if (!moduleSettings('broadcast', edition.moduleSettings).whatsapp) throw new DomainError('VALIDATION', { message: 'L’invio su WhatsApp è spento nelle impostazioni del modulo.' });
  const { whatsapp_templates } = await getSettings('whatsapp');
  const template = whatsapp_templates.find((t) => t.name === data.templateName);
  if (!template) throw new DomainError('VALIDATION', { message: 'Il modello non è tra quelli approvati in Sistema → Notifiche.' });
  const rows = await broadcastAudience(ctx, data); // permesso orders.edit e modulo attivo
  const session = data.sessionId ? (await getDb().select({ label: sessions.label }).from(sessions).where(eq(sessions.id, data.sessionId)))[0] : undefined;
  return { data, edition, template, rows, sessionLabel: session?.label ?? '' };
}

const paramsFor = (names: string[], r: { name: string | null; orderCode: string }, edition: string, sessionLabel: string) =>
  names.map((p) => (p === 'cliente.nome' ? r.name?.split(' ')[0] || 'cliente' : p === 'ordine.codice' ? r.orderCode : p === 'edizione.titolo' ? edition : sessionLabel || edition));

/** Anteprima: quanti riceveranno il messaggio, quanti non hanno un numero, e il testo d'esempio. */
export async function previewWhatsappBroadcast(ctx: Ctx, input: z.input<typeof WhatsappSegmentInput>) {
  const { edition, template, rows, sessionLabel } = await setup(ctx, input);
  const list = recipients(rows);
  const sample = paramsFor(template.params, { name: 'Maria', orderCode: 'ZK26-7F3K' }, edition.title, sessionLabel);
  const text = template.body.replace(/\{\{(\d+)\}\}/g, (_m, i: string) => sample[Number(i) - 1] ?? '');
  return { recipients: list.length, orders: rows.length, withoutPhone: rows.filter((r) => !toWhatsappNumber(r.phone)).length, text };
}

/** Credenziali: Phone Number ID da Sistema → Notifiche (o env), token dall'env o dalle impostazioni di prima. */
async function credentials() {
  const s = await getSettings('whatsapp');
  const legacy = await readSettings(['wa_access_token']);
  return { phoneNumberId: s.wa_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '', token: process.env.WHATSAPP_ACCESS_TOKEN || legacy.wa_access_token || '' };
}

export type WhatsappSendResult = { broadcastId: string; recipients: number; sent: number; failed: number; duplicate: boolean };

/**
 * Invia il modello a tutti i destinatari del segmento. Idempotente sul requestId (doppio clic, rete
 * che ripete la richiesta): la seconda chiamata restituisce l'invio già fatto senza rimandare nulla.
 */
export async function sendWhatsappBroadcast(ctx: Ctx, input: z.input<typeof WhatsappSendInput>): Promise<WhatsappSendResult> {
  const send = WhatsappSendInput.parse(input);
  const { data, edition, template, rows, sessionLabel } = await setup(ctx, send);
  if (edition.status === 'archived') throw new DomainError('EDITION_ARCHIVED');
  const list = recipients(rows);
  if (list.length !== send.expectedRecipients) throw new DomainError('CONFLICT', { message: `I destinatari sono cambiati (ora ${list.length}). Ricalcola l’anteprima e conferma di nuovo.` });
  const cred = await credentials();
  if (!cred.phoneNumberId || !cred.token) throw new DomainError('VALIDATION', { message: 'WhatsApp non è configurato: servono Phone Number ID e WHATSAPP_ACCESS_TOKEN.' });

  const created = await withTransaction(async (tx) => {
    const [row] = await tx
      .insert(whatsappBroadcasts)
      .values({ requestId: send.requestId, editionId: edition.id, templateName: template.name, segment: { sessionId: data.sessionId ?? null, checkedIn: data.checkedIn }, recipients: list.length, createdBy: ctx.user?.id ?? null })
      .onConflictDoNothing({ target: whatsappBroadcasts.requestId })
      .returning();
    if (row) await audit(tx, ctx, 'broadcast.whatsapp_sent', { entityType: 'edition', entityId: edition.id, edition: edition.slug, after: { template: template.name, recipients: list.length, sessionId: data.sessionId ?? null, checkedIn: data.checkedIn } });
    return row;
  });
  if (!created) {
    const [prev] = await getDb().select().from(whatsappBroadcasts).where(eq(whatsappBroadcasts.requestId, send.requestId));
    return { broadcastId: prev.id, recipients: prev.recipients, sent: prev.sent, failed: prev.failed, duplicate: true };
  }

  let sent = 0;
  for (const r of list) {
    const res = await whatsappClient().sendTemplate({ ...cred, to: r.to, template: template.name, language: template.language, params: paramsFor(template.params, r, edition.title, sessionLabel) });
    if (res.ok) sent++;
    await getDb()
      .insert(whatsappMessages)
      .values({ broadcastId: created.id, orderCode: r.orderCode, phoneMasked: maskPhone(r.to), waMessageId: res.ok ? res.id : null, status: res.ok ? 'accepted' : 'failed', error: res.ok ? null : res.error });
  }
  await getDb().update(whatsappBroadcasts).set({ sent, failed: list.length - sent }).where(eq(whatsappBroadcasts.id, created.id));
  return { broadcastId: created.id, recipients: list.length, sent, failed: list.length - sent, duplicate: false };
}

/** Storico degli invii di un'edizione con il conteggio per stato (dal webhook). */
export async function listWhatsappBroadcasts(editionId: string) {
  const db = getDb();
  const rows = await db.select().from(whatsappBroadcasts).where(eq(whatsappBroadcasts.editionId, editionId)).orderBy(desc(whatsappBroadcasts.createdAt)).limit(20);
  if (!rows.length) return [];
  const counts = await db
    .select({ broadcastId: whatsappMessages.broadcastId, status: whatsappMessages.status, n: sql<number>`count(*)::int` })
    .from(whatsappMessages)
    .where(inArray(whatsappMessages.broadcastId, rows.map((r) => r.id)))
    .groupBy(whatsappMessages.broadcastId, whatsappMessages.status);
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    templateName: r.templateName,
    recipients: r.recipients,
    byStatus: Object.fromEntries(counts.filter((c) => c.broadcastId === r.id).map((c) => [c.status, c.n])) as Record<string, number>,
  }));
}

const STATUS_ORDER = sql.raw("ARRAY['accepted','sent','delivered','read','failed']");

/** Aggiorna lo stato dei messaggi dalla notifica (già verificata) del webhook di Meta. */
export async function applyWhatsappStatuses(body: unknown): Promise<number> {
  let updated = 0;
  for (const s of statusesOf(body)) {
    const res = await getDb()
      .update(whatsappMessages)
      .set({ status: s.status, error: s.error, updatedAt: new Date() })
      // Gli stati arrivano anche in disordine: si va solo avanti (accettato → inviato → consegnato → letto).
      .where(and(eq(whatsappMessages.waMessageId, s.id), sql`array_position(${STATUS_ORDER}, ${whatsappMessages.status}) < array_position(${STATUS_ORDER}, ${s.status}::text)`))
      .returning({ id: whatsappMessages.id });
    updated += res.length;
  }
  return updated;
}
