import { Archive, ArrowRight, BarChart3, CheckCircle2, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { FillBar } from '@/components/admin/edition/common';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { editionNav } from '@/components/admin/shell/nav.config';
import { ColumnChart } from '@/components/admin/stats/Charts';
import { ButtonLink, Card, cn, focusRing, PageHeader, Stat, StatusBadge } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { extensionPoints } from '@/modules/registry';
import { activityCounts } from '@/modules/activities/server';
import { getAdminCtx } from '@/server/auth/context';
import { can } from '@/server/auth/permissions';
import { getEditionDetail } from '@/server/domain/editions';
import { getClosingChecklist } from '@/server/domain/editions/closing';
import { editionFromParams, type EditionParams } from '@/server/domain/editions/page-params';
import { editionOverview, nextAction } from '@/server/domain/stats/overview';
import { DeclareConcluded } from './DeclareConcluded';

export async function generateMetadata(props: EditionParams) {
  return { title: (await editionFromParams(props)).title };
}

const delta = (now: number, before: number | undefined) => {
  if (before === undefined || before === 0) return {};
  const pct = Math.round(((now - before) / before) * 100);
  return { delta: `${pct > 0 ? '+' : ''}${pct}%`, trend: pct > 0 ? ('up' as const) : pct < 0 ? ('down' as const) : ('flat' as const) };
};

/** Panoramica dell'edizione (§11.5): stato e prossima azione, numeri, capienza, vendite, "Da fare", moduli. */
export default async function EditionOverviewPage(props: EditionParams) {
  const edition = await editionFromParams(props);
  const ctx = (await getAdminCtx())!;
  const scope = { edition: edition.slug };
  const canNumbers = can(ctx, 'orders.read', scope);
  const sections = editionNav(edition.slug, edition.modules)
    .flatMap((g) => g.items)
    .filter((i) => i.href !== `/admin/e/${edition.slug}`);
  const [detail, overview, closing] = await Promise.all([
    getEditionDetail(edition.slug),
    canNumbers ? editionOverview(edition.id, edition.slug) : null,
    edition.status === 'concluded' && can(ctx, 'editions.edit', scope) ? getClosingChecklist(ctx, edition.slug) : null,
  ]);
  const next = can(ctx, 'editions.edit', scope) ? nextAction(edition.slug, edition.status, closing) : null;
  const canConclude = (edition.status === 'live' || edition.status === 'suspended') && can(ctx, 'editions.edit', scope);
  const widgets = detail ? extensionPoints.dashboardWidgets(detail) : [];
  const activities = canNumbers && widgets.some((w) => w.key === 'activities-today') ? await activityCounts(ctx, edition.slug) : null;
  const t = overview?.stats.totals;
  const prev = overview?.previous?.totals;

  return (
    <AdminPage>
      <PageHeader
        title={edition.title}
        badge={<StatusBadge status={edition.status} />}
        subtitle={edition.startsOn ? formatDate(edition.startsOn) : 'Data da definire'}
        secondaryActions={
          canNumbers ? (
            <ButtonLink href={`/admin/e/${edition.slug}/statistiche`} variant="secondary" icon={BarChart3}>
              Statistiche
            </ButtonLink>
          ) : undefined
        }
        primaryAction={canConclude ? <DeclareConcluded edition={edition.slug} title={edition.title} /> : undefined}
      />
      {edition.status === 'archived' && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-surface-sunken px-4 py-3 text-body text-muted">
          <Archive size={18} aria-hidden className="mt-0.5 shrink-0" />
          <span>Edizione archiviata: i dati restano consultabili ma non si modificano.</span>
        </div>
      )}
      {next && (
        <div className="flex flex-col gap-3 rounded-xl border border-info/30 bg-info-bg px-4 py-3 sm:flex-row sm:items-center">
          <Lightbulb size={18} aria-hidden className="shrink-0 text-info" />
          <p className="flex-1 text-body text-fg">{next.text}</p>
          <Link href={next.href} className={cn('inline-flex items-center gap-1 rounded text-label font-medium text-primary hover:underline', focusRing)}>
            {next.cta} <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      )}

      {t && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Biglietti venduti" value={t.tickets} {...delta(t.tickets, prev?.tickets)} help={prev ? `rispetto a ${overview!.previous!.title}` : `${t.orders} ordini`} />
          <Stat label="Incassato netto" value={formatMoney(t.netCents)} {...delta(t.netCents, prev?.netCents)} help={t.refundedCents ? `${formatMoney(t.refundedCents)} rimborsati` : undefined} />
          <Stat label="Ingressi registrati" value={t.checkins} help={t.tickets ? `${Math.round((t.checkins / t.tickets) * 100)}% dei biglietti` : undefined} />
          <Stat label="Posti liberi" value={t.remaining ?? '—'} help={t.remaining === null ? 'nessuna data futura con capienza' : 'nelle date future'} />
        </div>
      )}

      {overview && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Da fare" flush>
            {overview.todo.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-6 text-body text-muted">
                <CheckCircle2 size={18} aria-hidden className="text-success" /> Niente da fare per questa edizione.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {overview.todo.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href} className={cn('flex items-center gap-3 px-4 py-3 text-body text-fg hover:bg-surface-sunken', focusRing)}>
                      <span className="flex-1">{item.text}</span>
                      <ArrowRight size={16} aria-hidden className="text-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Vendite degli ultimi 14 giorni" description="Incassato per giorno, ordini pagati" className="lg:col-span-2">
            <ColumnChart
              data={overview.daily.map((d) => ({ label: d.day.slice(8), value: d.cents, hint: `${d.orders} ordini` }))}
              format={formatMoney}
            />
          </Card>
        </div>
      )}

      {overview && overview.stats.bySession.length > 0 && (
        <Card title="Capienza per data" flush>
          <ul className="divide-y divide-border">
            {overview.stats.bySession.map((s) => (
              <li key={s.sessionId} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-medium text-fg">{s.label}</span>
                  <span className="block text-label text-muted">
                    {formatDateTime(s.startsAt)} · {s.checkins} entrati
                  </span>
                </span>
                <FillBar used={s.sold} size={s.capacity} className="sm:w-64" />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {activities && (
        <Card title="Attività e laboratori" description="Ingressi, bambini e posti delle attività per data" flush>
          <ul className="divide-y divide-border">
            {activities.days.map((d) => (
              <li key={d.sessionId} className="flex flex-col gap-1 px-4 py-3">
                <span className="text-body font-medium text-fg">
                  {d.label} · {d.admissions} ingressi · {d.children} bambini
                </span>
                {d.activities.length > 0 && (
                  <span className="text-label text-muted">{d.activities.map((a) => `${a.label} ${a.used}/${a.maxPlaces}`).join(' · ')}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Sezioni" flush>
        <ul className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0">
          {sections.map(({ href, label, icon: Icon }) => (
            <li key={href} className="sm:border-b sm:border-border sm:odd:border-r">
              <Link href={href} className={cn('flex items-center gap-3 px-4 py-3 text-body text-fg hover:bg-surface-sunken', focusRing)}>
                <Icon size={18} aria-hidden className="shrink-0 text-muted" />
                <span className="flex-1">{label}</span>
                <ArrowRight size={16} aria-hidden className="text-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </AdminPage>
  );
}
