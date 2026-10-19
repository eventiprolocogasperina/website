import { notFound } from 'next/navigation';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { romeDateKey, romeTime } from '@/lib/dates';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { getEditionDetail } from '@/server/domain/editions';
import { describeEditionModules, moduleFieldOptions } from '@/server/domain/editions/modules';
import { getClosingChecklist } from '@/server/domain/editions/closing';
import { TRANSITIONS } from '@/server/domain/editions/lifecycle';
import type { EditionParams } from '@/server/domain/editions/page-params';
import { listSeries } from '@/server/domain/editions/series';
import { SettingsClient } from './SettingsClient';

export const metadata = { title: 'Impostazioni' };

export default async function EditionSettingsPage({ params }: EditionParams) {
  const { edition: slug } = await params;
  const denied = await pageDenied('editions.edit', { edition: slug });
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const [e, formats] = await Promise.all([getEditionDetail(slug), listSeries()]);
  if (!e) notFound();
  const moduleOptions = await moduleFieldOptions(e.id);
  const closing = e.status === 'concluded' || e.status === 'archived' ? await getClosingChecklist(ctx, slug) : null;
  const transitions = TRANSITIONS[e.status]
    .filter((t) => can(ctx, t.permission, { edition: slug }))
    .map(({ to, label, description, typeToConfirm }) => ({
      to,
      label,
      description,
      typeToConfirm: !!typeToConfirm,
      disabledReason: to === 'archived' && !closing?.complete ? 'Completa prima la checklist di chiusura.' : null,
    }));
  return (
    <AdminPage>
      <SettingsClient
        edition={{
          slug: e.slug,
          title: e.title,
          status: e.status,
          readOnly: e.status === 'archived',
          concludedAt: e.concludedAt?.toISOString() ?? null,
          archivedAt: e.archivedAt?.toISOString() ?? null,
        }}
        initial={{
          title: e.title,
          subtitle: e.subtitle ?? '',
          location: e.location ?? '',
          coverImage: e.coverImage ?? '',
          seriesId: e.seriesId ?? '',
          startsDate: e.startsAt ? romeDateKey(e.startsAt) : '',
          startsTime: e.startsAt ? romeTime(e.startsAt) : '',
          endsDate: e.endsAt ? romeDateKey(e.endsAt) : '',
          endsTime: e.endsAt ? romeTime(e.endsAt) : '',
          publicPageMode: e.publicPageMode,
        }}
        formats={formats.map((f) => ({ id: f.id, name: f.name, landingPath: f.landingPath }))}
        transitions={transitions}
        modules={describeEditionModules(e)}
        moduleOptions={moduleOptions}
        canManageModules={can(ctx, 'modules.manage', { edition: slug })}
        closing={closing}
        canSkipChecks={can(ctx, 'editions.archive', { edition: slug })}
      />
    </AdminPage>
  );
}
