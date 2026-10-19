import { asc } from 'drizzle-orm';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { PageHeader } from '@/components/ui';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { getDb } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { AUDIT_PAGE_SIZE, listAudit } from '@/server/domain/audit';
import { listAssignableEditions } from '@/server/domain/editions';
import { AuditClient } from './AuditClient';

export const metadata = { title: 'Registro attività' };

type Search = { utente?: string; azione?: string; edizione?: string; dal?: string; al?: string; pagina?: string };

export default async function AuditPage({ searchParams }: { searchParams: Promise<Search> }) {
  const denied = await pageDenied('audit.read');
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const sp = await searchParams;
  const uuid = /^[0-9a-f-]{36}$/i;
  const page = Math.max(0, Number(sp.pagina ?? 1) - 1) || 0;
  const [{ rows, total }, people, editions] = await Promise.all([
    listAudit(ctx, {
      user: sp.utente && uuid.test(sp.utente) ? sp.utente : undefined,
      action: sp.azione?.slice(0, 60),
      edition: sp.edizione?.slice(0, 80),
      from: sp.dal,
      to: sp.al,
      page,
    }),
    getDb().select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.name)),
    listAssignableEditions(),
  ]);
  return (
    <AdminPage wide>
      <PageHeader title="Registro attività" count={total} subtitle="Chi ha fatto cosa nell’admin, in cassa e allo scanner. Non si modifica e non si cancella." />
      <AuditClient
        rows={rows}
        total={total}
        page={page}
        pageSize={AUDIT_PAGE_SIZE}
        people={people}
        editions={editions}
        filters={{ utente: sp.utente ?? '', azione: sp.azione ?? '', edizione: sp.edizione ?? '', dal: sp.dal ?? '', al: sp.al ?? '' }}
      />
    </AdminPage>
  );
}
