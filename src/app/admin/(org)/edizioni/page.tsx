import { AdminPage } from '@/components/admin/shell/AdminPage';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can, canSomewhere } from '@/server/auth/permissions';
import { listEditionsWithCounts } from '@/server/domain/editions';
import { listSeries } from '@/server/domain/editions/series';
import { EditionsClient } from './EditionsClient';

export const metadata = { title: 'Edizioni' };

export default async function EditionsPage({ searchParams }: { searchParams: Promise<{ q?: string; stato?: string; format?: string }> }) {
  const ctx = (await getAdminCtx())!;
  if (!canSomewhere(ctx, 'editions.edit') && !canSomewhere(ctx, 'catalog.edit')) return pageDenied('editions.edit');
  const [rows, formats] = await Promise.all([listEditionsWithCounts(ctx), listSeries()]);
  const sp = await searchParams;
  return (
    <AdminPage>
      <EditionsClient
        rows={rows}
        formats={formats.map((f) => ({ id: f.id, slug: f.slug, name: f.name }))}
        canCreate={can(ctx, 'editions.create')}
        canCalendar={can(ctx, 'editions.edit')}
        filters={{ q: sp.q ?? '', stato: sp.stato ?? '', format: sp.format ?? '' }}
      />
    </AdminPage>
  );
}
