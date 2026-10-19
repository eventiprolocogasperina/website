import { AdminPage } from '@/components/admin/shell/AdminPage';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { getCatalogWithAvailability } from '@/server/domain/catalog';
import { editionFromParams, type EditionParams } from '@/server/domain/editions/page-params';
import { SessionsClient } from './SessionsClient';

export const metadata = { title: 'Date e capienze' };

export default async function SessionsPage(props: EditionParams) {
  const edition = await editionFromParams(props);
  const denied = await pageDenied('catalog.edit', { edition: edition.slug });
  if (denied) return denied;
  const { catalog, availability } = await getCatalogWithAvailability((await getAdminCtx())!, edition.slug);
  const sessions = catalog.sessions.map((s) => {
    const a = availability.sessions.find((x) => x.id === s.id)!;
    return { id: s.id, label: s.label, startsAt: s.startsAt.toISOString(), endsAt: s.endsAt?.toISOString() ?? null, capacity: s.capacity, status: s.status, used: a.used };
  });
  return (
    <AdminPage>
      <SessionsClient
        edition={{ slug: edition.slug, title: edition.title, readOnly: edition.status === 'archived', legacy: edition.imported }}
        sessions={sessions}
        hasCapacityProducts={catalog.products.some((p) => p.kind === 'ticket' && p.requiresSession)}
      />
    </AdminPage>
  );
}
