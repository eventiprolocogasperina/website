import { asc, count, eq } from 'drizzle-orm';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { PageHeader } from '@/components/ui';
import { moduleSettings } from '@/modules/registry';
import { getDb } from '@/server/db/client';
import { editions, ordersV2, sessions } from '@/server/db/schema';
import { PostponementClient } from './PostponementClient';

/** Modulo Rinvio per maltempo: date dell'edizione, rinvii fatti e azione "Rinvia". */
export async function PostponementPage({ edition: slug }: { edition: string }) {
  const db = getDb();
  const [edition] = await db.select().from(editions).where(eq(editions.slug, slug));
  const [rows, counts] = await Promise.all([
    db.select().from(sessions).where(eq(sessions.editionId, edition.id)).orderBy(asc(sessions.startsAt)),
    db.select({ sessionId: ordersV2.sessionId, n: count() }).from(ordersV2).where(eq(ordersV2.editionId, edition.id)).groupBy(ordersV2.sessionId),
  ]);
  const settings = moduleSettings('postponement', edition.moduleSettings) as { refundOnSecondPostponement: boolean; notifyByEmail: boolean };
  return (
    <AdminPage>
      <PageHeader
        title="Rinvio per maltempo"
        subtitle={`Rinvia una giornata alla sua data di recupero: gli ordini passano alla nuova data${settings.notifyByEmail ? ' e i clienti ricevono un’email' : ''}. I biglietti restano validi.${settings.refundOnSecondPostponement ? ' Se anche il recupero viene rinviato, gli acquirenti hanno diritto al rimborso.' : ''}`}
      />
      <PostponementClient
        edition={{ slug, id: edition.id, readOnly: edition.status === 'archived' }}
        sessions={rows.map((s) => ({
          id: s.id,
          label: s.label,
          startsAt: s.startsAt.toISOString(),
          status: s.status,
          recovery: rows.find((x) => x.id === s.rescheduledToSessionId)?.label ?? null,
          postponedFrom: rows.filter((x) => x.rescheduledToSessionId === s.id).map((x) => x.label),
          orders: counts.find((c) => c.sessionId === s.id)?.n ?? 0,
        }))}
      />
    </AdminPage>
  );
}
