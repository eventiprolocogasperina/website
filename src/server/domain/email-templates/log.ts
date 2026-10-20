import 'server-only';
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import type { Ctx } from '@/server/auth/context-shared';
import { can } from '@/server/auth/permissions';
import { getDb } from '@/server/db/client';
import { editions, emailLog, ordersV2 } from '@/server/db/schema';
import { DomainError } from '@/server/domain/errors';
import { deliverEmail, type Email } from '@/server/email/send';
import { log } from '@/server/log';
import { maskEmail } from '@/server/domain/checkout/my-tickets';

// Registro degli invii email (prompt 18): ogni email da un modello passa da qui. Si salva solo
// l'indirizzo mascherato, il modello, l'oggetto e l'esito di Resend; le righe non si cancellano.

export type EmailMeta = { templateKey: string | null; editionId?: string | null; orderId?: string | null; isTest?: boolean };

/** Invia e scrive la riga nel registro. Un registro che non si scrive non blocca l'email. */
export async function sendLoggedEmail(email: Email, meta: EmailMeta): Promise<boolean> {
  const result = await deliverEmail(email);
  try {
    await getDb()
      .insert(emailLog)
      .values({
        templateKey: meta.templateKey,
        editionId: meta.editionId ?? null,
        orderId: meta.orderId ?? null,
        recipientMasked: maskEmail(email.to),
        subject: email.subject.slice(0, 300),
        status: result.status,
        providerId: result.providerId ?? null,
        error: result.error ?? null,
        isTest: meta.isTest ?? false,
      });
  } catch (error) {
    log.error('Registro degli invii email non scritto', { error });
  }
  return result.status !== 'failed';
}

export type EmailLogRow = {
  id: string;
  createdAt: Date;
  templateKey: string | null;
  recipientMasked: string;
  subject: string;
  status: string;
  providerId: string | null;
  error: string | null;
  isTest: boolean;
  orderCode: string | null;
  edition: string | null;
};

export const EMAIL_LOG_PAGE = 50;

/** Ultimi invii, filtrabili per modello ed esito. Solo per chi gestisce le impostazioni. */
export async function listEmailLog(ctx: Ctx, filters: { template?: string; status?: string; page?: number } = {}): Promise<{ rows: EmailLogRow[]; total: number }> {
  if (!can(ctx, 'settings.manage')) throw new DomainError('FORBIDDEN');
  const where: SQL[] = [];
  if (filters.template) where.push(eq(emailLog.templateKey, filters.template));
  if (filters.status) where.push(eq(emailLog.status, filters.status));
  const page = Math.max(1, filters.page ?? 1);
  const db = getDb();
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: emailLog.id,
        createdAt: emailLog.createdAt,
        templateKey: emailLog.templateKey,
        recipientMasked: emailLog.recipientMasked,
        subject: emailLog.subject,
        status: emailLog.status,
        providerId: emailLog.providerId,
        error: emailLog.error,
        isTest: emailLog.isTest,
        orderCode: ordersV2.code,
        edition: editions.title,
      })
      .from(emailLog)
      .leftJoin(ordersV2, eq(ordersV2.id, emailLog.orderId))
      .leftJoin(editions, eq(editions.id, emailLog.editionId))
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(emailLog.createdAt))
      .limit(EMAIL_LOG_PAGE)
      .offset((page - 1) * EMAIL_LOG_PAGE),
    db.select({ n: count() }).from(emailLog).where(where.length ? and(...where) : undefined),
  ]);
  return { rows, total: n };
}
