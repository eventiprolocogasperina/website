import 'server-only';
import { eq } from 'drizzle-orm';
import { formatDateTime } from '@/lib/dates';
import { getDb } from '@/server/db/client';
import { customers, ordersV2, sessions } from '@/server/db/schema';
import { orderForTemplate, renderTemplateEmail, varsForOrder } from '@/server/domain/email-templates';
import { sendLoggedEmail } from '@/server/domain/email-templates/log';
import { actionEmail } from '@/server/email/send';
import type { ModuleHandlers } from '../handlers';

/**
 * Email automatica al cliente quando la data del suo ordine cambia (impostazione notifyByEmail).
 * Per un rinvio il testo è il modello "Rinvio" di Sistema → Email (prompt 18); per un cambio data
 * semplice resta l'avviso breve.
 */
export const postponementHandlers: ModuleHandlers = {
  'order.session_moved': async (event, { edition, settings }) => {
    if (!settings.notifyByEmail) return;
    const db = getDb();
    const [row] = await db
      .select({ email: customers.email, name: customers.name })
      .from(ordersV2)
      .innerJoin(customers, eq(customers.id, ordersV2.customerId))
      .where(eq(ordersV2.id, event.orderId));
    const [to] = await db.select({ label: sessions.label, startsAt: sessions.startsAt }).from(sessions).where(eq(sessions.id, event.toSessionId));
    const [from] = event.fromSessionId ? await db.select({ label: sessions.label, status: sessions.status }).from(sessions).where(eq(sessions.id, event.fromSessionId)) : [];
    if (!row || !to) return;
    const meta = { editionId: edition.id, orderId: event.orderId };

    if (from?.status === 'postponed') {
      const order = await orderForTemplate(event.orderId);
      if (!order) return;
      const vars = varsForOrder(order, { 'sessione.data': from.label, 'rinvio.nuova_data': `${to.label} (${formatDateTime(to.startsAt)})` });
      const email = await renderTemplateEmail('postponement', edition.id, vars);
      await sendLoggedEmail({ to: row.email, ...email }, { templateKey: 'postponement', ...meta });
      return;
    }
    const hello = row.name ? `Ciao ${row.name}, ` : '';
    await sendLoggedEmail(
      actionEmail({
        to: row.email,
        subject: `${edition.title}: nuova data per l’ordine ${event.code}`,
        intro: `${hello}la data del tuo ordine ${event.code} è cambiata. Nuova data: ${to.label} (${formatDateTime(to.startsAt)}). I biglietti che hai già restano validi.`,
        outro: 'Se la nuova data non ti va bene, rispondi a questa email: troviamo insieme una soluzione.',
      }),
      { templateKey: null, ...meta },
    );
  },
};
