import { AdminPage } from '@/components/admin/shell/AdminPage';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { countOpenPrivacyRequests, getTransparency, listPrivacyRequests } from '@/server/domain/site/transparency';
import { TransparencyClient } from './TransparencyClient';

export const metadata = { title: 'Trasparenza' };

/** Contenuti di /trasparenza (content.edit) e richieste degli interessati (customers.read: contengono dati personali). */
export default async function Page() {
  const denied = await pageDenied('content.edit');
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const canSeeRequests = can(ctx, 'customers.read');
  const [view, requests, open] = await Promise.all([
    getTransparency(),
    canSeeRequests ? listPrivacyRequests(ctx) : Promise.resolve(null),
    canSeeRequests ? Promise.resolve(0) : countOpenPrivacyRequests(),
  ]);
  return (
    <AdminPage>
      <TransparencyClient
        content={view.content}
        updatedAt={view.updatedAt?.toISOString() ?? null}
        versions={view.versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }))}
        requests={requests?.rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), handledAt: r.handledAt?.toISOString() ?? null })) ?? null}
        openRequests={requests?.open ?? open}
      />
    </AdminPage>
  );
}
