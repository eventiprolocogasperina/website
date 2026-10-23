import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { ordersV2 } from '@/server/db/schema';
import { getOrderByToken } from '@/server/domain/checkout/my-tickets';
import { renderTemplateEmail, varsForOrder } from '@/server/domain/email-templates';
import { sendLoggedEmail } from '@/server/domain/email-templates/log';
import { siteUrl } from '@/server/email/send';
import { log } from '@/server/log';

/** Indirizzo che avvia il pagamento Nexi di un ordine pay-link in attesa (route /acquista/paga/[token]). */
export const payUrl = (token: string) => `${siteUrl()}/acquista/paga/${token}`;

/**
 * Email "Link di pagamento" (modello `paylink`) per un ordine pay-link in attesa. Il pulsante porta
 * alla pagina che avvia il pagamento; i biglietti arrivano dopo, con l'email di order.paid.
 * Restituisce false se l'ordine non ha un'email o l'invio non riesce.
 */
export async function sendPaylinkEmail(orderId: string): Promise<boolean> {
  const [row] = await getDb().select({ token: ordersV2.accessToken, editionId: ordersV2.editionId }).from(ordersV2).where(eq(ordersV2.id, orderId));
  const o = row ? await getOrderByToken(row.token) : null;
  if (!row || !o?.customer?.email) return false;
  const email = await renderTemplateEmail('paylink', row.editionId, varsForOrder(o, { 'pagamento.link': payUrl(row.token) }));
  const ok = await sendLoggedEmail({ to: o.customer.email, ...email }, { templateKey: 'paylink', editionId: row.editionId, orderId });
  if (!ok) log.error('Email del link di pagamento non inviata', { code: o.code });
  return ok;
}
