import { asc, eq } from 'drizzle-orm';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { PageHeader } from '@/components/ui';
import { listWhatsappBroadcasts } from '@/modules/broadcast/whatsapp';
import { moduleSettings } from '@/modules/registry';
import { getDb } from '@/server/db/client';
import { editions, sessions } from '@/server/db/schema';
import { getSettings } from '@/server/domain/settings';
import { BroadcastClient } from './BroadcastClient';

/** Modulo Messaggi: WhatsApp a un segmento di partecipanti con anteprima dei destinatari e conferma. */
export async function BroadcastPage({ edition: slug }: { edition: string }) {
  const db = getDb();
  const [edition] = await db.select().from(editions).where(eq(editions.slug, slug));
  const [days, wa, history] = await Promise.all([
    db.select({ id: sessions.id, label: sessions.label }).from(sessions).where(eq(sessions.editionId, edition.id)).orderBy(asc(sessions.startsAt)),
    getSettings('whatsapp'),
    listWhatsappBroadcasts(edition.id),
  ]);
  const settings = moduleSettings('broadcast', edition.moduleSettings) as { whatsapp: boolean };
  return (
    <AdminPage>
      <PageHeader title="Messaggi" subtitle="Manda un messaggio WhatsApp a chi ha un ordine pagato, per data e per ingresso. Prima vedi a quante persone arriva, poi confermi." />
      <BroadcastClient
        edition={{ slug, id: edition.id, readOnly: edition.status === 'archived', whatsapp: settings.whatsapp }}
        sessions={days}
        templates={wa.whatsapp_templates.map((t) => ({ name: t.name, body: t.body }))}
        history={history}
      />
    </AdminPage>
  );
}
