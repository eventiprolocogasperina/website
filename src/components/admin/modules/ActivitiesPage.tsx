import { Palette } from 'lucide-react';
import { SessionStatusBadge, FillBar } from '@/components/admin/edition/common';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { ButtonLink, Card, EmptyState, PageHeader, Stat } from '@/components/ui';
import { activityCounts } from '@/modules/activities/server';
import { getAdminCtx } from '@/server/auth/context';

/** Modulo Attività e laboratori: per ogni giorno ingressi, bambini e posti occupati delle attività. */
export async function ActivitiesPage({ edition }: { edition: string }) {
  const { days, settings } = await activityCounts((await getAdminCtx())!, edition);
  const active = days.filter((d) => d.status !== 'postponed' && d.status !== 'cancelled');
  return (
    <AdminPage>
      <PageHeader
        title="Attività e laboratori"
        subtitle="Bambini e posti delle attività gratuite, giorno per giorno. Contano gli ordini pagati e quelli in attesa di pagamento."
        primaryAction={
          <ButtonLink href={`/admin/e/${edition}/impostazioni`} variant="secondary">
            Modifica attività
          </ButtonLink>
        }
      />
      {!settings.activities.length ? (
        <EmptyState icon={Palette} title="Nessuna attività" description="Aggiungi le attività gratuite in Impostazioni › Moduli › Attività e laboratori." />
      ) : (
        <div className="flex flex-col gap-4">
          {active.map((d) => (
            <Card key={d.sessionId}>
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-section font-semibold text-fg">{d.label}</h2>
                  <SessionStatusBadge status={d.status} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Ordini" value={d.orders} />
                  <Stat label="Ingressi" value={d.admissions} />
                  <Stat label="Bambini" value={d.children} />
                </div>
                {d.activities.length ? (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {d.activities.map((a) => (
                      <li key={a.key} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                        <span className="text-body text-fg">{a.label}</span>
                        <FillBar used={a.used} size={a.maxPlaces || null} noun="iscritti" className="w-56" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-label text-muted">Nessuna attività in questo giorno.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}
