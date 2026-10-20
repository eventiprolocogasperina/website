import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { NOTIFY_CONSENT_TEXT } from '@/components/public/blocks/types';
import { getDb } from '@/server/db/client';
import { editions, notifySignups, series } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { actionEmail, sendEmail, siteUrl } from '@/server/email/send';
import { log } from '@/server/log';

/*
 * "Avvisami" (§13.3): iscrizione all'avviso della prossima edizione di un format e invio dell'email
 * quando un'edizione del format passa a on_sale. Le risposte non dicono mai se un'email era già
 * iscritta, e nei log non finiscono né email né token (§18.8).
 */

export const SubscribeInput = z.object({
  seriesId: z.string().uuid(),
  email: z.string().trim().toLowerCase().max(200).email('Scrivi un indirizzo email valido.'),
  consent: z.literal(true, { error: 'Per iscriverti serve il consenso.' }),
  /** Campo nascosto anti-bot: chi lo riempie non viene iscritto. */
  website: z.string().max(0).optional(),
});
export type SubscribeInput = z.input<typeof SubscribeInput>;

/** Iscrive (o riattiva) l'email all'avviso del format. Idempotente: due iscrizioni = una riga. */
export async function subscribeNotify(input: SubscribeInput): Promise<void> {
  const data = SubscribeInput.parse(input);
  const db = getDb();
  const [s] = await db.select({ id: series.id }).from(series).where(eq(series.id, data.seriesId));
  if (!s) throw new DomainError('NOT_FOUND');
  const token = randomBytes(24).toString('base64url');
  await db.execute(sql`
    INSERT INTO ${notifySignups} (series_id, email, consent_text, unsubscribe_token)
    VALUES (${s.id}, ${data.email}, ${NOTIFY_CONSENT_TEXT}, ${token})
    ON CONFLICT (series_id, lower(email)) DO UPDATE
      SET unsubscribed_at = NULL, consent_at = now(), consent_text = EXCLUDED.consent_text`);
}

/** Annulla l'iscrizione dal link dell'email. Restituisce il nome del format, o null se il link non vale. */
export async function unsubscribeNotify(token: string): Promise<string | null> {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const db = getDb();
  const [row] = await db
    .update(notifySignups)
    .set({ unsubscribedAt: sql`coalesce(${notifySignups.unsubscribedAt}, now())` })
    .where(eq(notifySignups.unsubscribeToken, token))
    .returning({ seriesId: notifySignups.seriesId });
  if (!row) return null;
  const [s] = await db.select({ name: series.name }).from(series).where(eq(series.id, row.seriesId));
  return s?.name ?? null;
}

/**
 * Handler di `edition.on_sale`: scrive a tutti gli iscritti del format che non hanno ancora ricevuto
 * l'avviso di questa edizione. Le righe si "prenotano" con un solo UPDATE … RETURNING prima di
 * inviare, così due esecuzioni in parallelo (o un ritorno da sold_out a on_sale) non mandano due email.
 */
export async function notifyEditionOnSale(editionId: string): Promise<number> {
  const db = getDb();
  const [e] = await db
    .select({ id: editions.id, slug: editions.slug, title: editions.title, seriesId: editions.seriesId, landingPath: series.landingPath, seriesName: series.name })
    .from(editions)
    .leftJoin(series, eq(series.id, editions.seriesId))
    .where(eq(editions.id, editionId));
  if (!e?.seriesId) return 0;
  const claimed = await db
    .update(notifySignups)
    .set({ notifiedEditionId: e.id, notifiedAt: new Date() })
    .where(and(eq(notifySignups.seriesId, e.seriesId), isNull(notifySignups.unsubscribedAt), sql`${notifySignups.notifiedEditionId} IS DISTINCT FROM ${e.id}`))
    .returning({ email: notifySignups.email, token: notifySignups.unsubscribeToken });
  const base = siteUrl();
  const url = `${base}${e.landingPath ?? `/acquista/${e.slug}`}`;
  let sent = 0;
  for (const r of claimed) {
    const ok = await sendEmail(
      actionEmail({
        to: r.email,
        subject: `Sono aperte le vendite: ${e.title}`,
        intro: `Ci avevi chiesto di avvisarti: i biglietti di ${e.title} sono in vendita. Ti aspettiamo!`,
        button: 'Scopri e prenota',
        url,
        outro: `Hai ricevuto questa email perché ti sei iscritto all'avviso di ${e.seriesName}. Per non riceverne più: ${base}/avvisami/annulla/${r.token}`,
      }),
    ).catch(() => false);
    if (ok) sent++;
  }
  if (claimed.length) log.info('Avvisi di apertura vendite inviati', { edition: e.slug, sent, total: claimed.length });
  return sent;
}
