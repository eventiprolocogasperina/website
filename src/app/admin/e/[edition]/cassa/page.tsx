import { AdminPage } from '@/components/admin/shell/AdminPage';
import { moduleSettings } from '@/modules/registry';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { can } from '@/server/auth/permissions';
import { listPosProducts } from '@/server/domain/cash/catalog';
import { listRegisters, nextOrderNumber, printerOf } from '@/server/domain/cash/registers';
import { cashReport } from '@/server/domain/cash/report';
import { listSessions, openSessionOf } from '@/server/domain/cash/sessions';
import { listDevices } from '@/server/domain/devices';
import { getEditionDetail } from '@/server/domain/editions';
import { editionFromParams, type EditionParams } from '@/server/domain/editions/page-params';
import { CashAdminClient } from './CashAdminClient';
import type { CashAdminData } from './types';

export const metadata = { title: 'Cassa' };

const TABS = ['casse', 'prodotti', 'reparti', 'stampanti', 'turni', 'dispositivi', 'rendiconto'] as const;

/** Gestione della nuova cassa dell'edizione (prompt 14). La vecchia pagina è in /cassa/vecchia. */
export default async function CashAdminPage(props: EditionParams & { searchParams: Promise<{ tab?: string }> }) {
  const summary = await editionFromParams(props);
  const denied = await pageDenied(['catalog.edit', 'reports.export'], { edition: summary.slug });
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const edition = (await getEditionDetail(summary.slug))!;
  const perms = {
    edit: can(ctx, 'catalog.edit', { edition: edition.slug }),
    report: can(ctx, 'reports.export', { edition: edition.slug }),
    devices: can(ctx, 'settings.manage'),
    correct: can(ctx, 'pos.void', { edition: edition.slug }),
  };

  const registers = await listRegisters(edition.id);
  const [open, posProducts, nextNumber, sessions, report, devices] = await Promise.all([
    Promise.all(registers.map((r) => openSessionOf(r.id))),
    listPosProducts(edition.id),
    nextOrderNumber(edition.id),
    perms.report ? listSessions(ctx, edition.slug, edition.id) : null,
    perms.report ? cashReport(ctx, edition.slug) : null,
    perms.devices ? listDevices(ctx) : null,
  ]);

  const departments = new Map<string, number>();
  for (const p of posProducts) if (p.department) departments.set(p.department, (departments.get(p.department) ?? 0) + 1);

  const data: CashAdminData = {
    edition: {
      slug: edition.slug,
      title: edition.title,
      status: edition.status,
      readOnly: edition.status === 'archived',
      departmentsModule: edition.enabledModules.includes('departments'),
      readyScreen: !!(moduleSettings('departments', edition.moduleSettings) as { readyScreen?: boolean }).readyScreen,
    },
    can: perms,
    registers: registers.map((r, i) => ({
      id: r.id,
      name: r.name,
      active: r.active,
      issuesNumbers: r.issuesNumbers,
      allowOpenAmount: r.allowOpenAmount,
      productIds: r.productIds,
      printer: printerOf(r),
      openSince: open[i]?.openedAt.toISOString() ?? null,
    })),
    products: posProducts,
    nextNumber,
    departments: [...departments].map(([name, products]) => ({ name, products })),
    sessions:
      sessions?.map((s) => ({ ...s, openedAt: s.openedAt.toISOString(), closedAt: s.closedAt?.toISOString() ?? null })) ?? null,
    summary: report
      ? {
          netCents: report.totals.netCents,
          complimentaryCents: report.totals.complimentaryCents,
          sales: report.totals.sales,
          voided: report.totals.voided,
          byMethod: report.totals.byMethod.map((m) => ({ label: m.label, netCents: m.netCents, count: m.count })),
          products: report.totals.products.map((p) => ({ id: p.productId, name: p.name, quantity: p.quantity, amountCents: p.amountCents })),
        }
      : null,
    flagged: report?.flagged ?? null,
    devices:
devices?.filter((d) => d.kind === 'pos' && d.edition === edition.slug) ?? null,
  };
  const { tab } = await props.searchParams;
  return (
    <AdminPage>
      <CashAdminClient data={data} initialTab={TABS.includes(tab as (typeof TABS)[number]) ? (tab as string) : 'casse'} />
    </AdminPage>
  );
}
