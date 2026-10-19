import 'server-only';
import { eq } from 'drizzle-orm';
import { formatDateTime } from '@/lib/dates';
import { getDb } from '@/server/db/client';
import { customers, ordersV2, sessions } from '@/server/db/schema';
import { actionEmail, sendEmail } from '@/server/email/send';
import type { ModuleHandlers } from '../handlers';

/** Email automatica al cliente quando la data del suo ordine cambia (impostazione notifyByEmail). */
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
    if (!row || !to) return;
    await sendEmail(
      actionEmail({
        to: row.email,
        subject: `${edition.title}: nuova data per l’ordine ${event.code}`,
        intro: `${row.name ? `Ciao ${row.name}, l` : 'L'}a data del tuo ordine ${event.code} è cambiata. Nuova data: ${to.label} (${formatDateTime(to.startsAt)}). I biglietti che hai già restano validi.`,
        outro: 'Se la nuova data non ti va bene, rispondi a questa email: troviamo insieme una soluzione.',
      }),
    );
  },
};
