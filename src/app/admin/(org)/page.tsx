import { ArrowRight, CalendarClock, CheckCircle2, ScanLine, Store } from 'lucide-react';
import Link from 'next/link';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { EditionDot } from '@/components/admin/shell/EditionDot';
import { todoRows } from '@/components/admin/shell/todo-rows';
import { BarList } from '@/components/admin/stats/Charts';
import { ButtonLink, Card, cn, focusRing, PageHeader, StatusBadge, Timeline } from '@/components/ui';
import { formatDate, formatRelative, romeDateKey } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { getTodoCounts } from '@/server/admin/todo';
import { getAdminCtx } from '@/server/auth/context';
import { can, canSomewhere, editionPermissions } from '@/server/auth/permissions';
import { AUDIT_ACTION_LABELS, listAudit } from '@/server/domain/audit';
import { listEditions } from '@/server/domain/editions';
import { ACTIVE_STATUSES } from '@/server/domain/editions/types';
import { netByEdition } from '@/server/domain/stats';

export const metadata = { title: 'Panoramica' };

/** Panoramica dell'associazione (§10.3): cosa c'è da fare e quali edizioni sono attive. */
export default async function AdminHomePage() {
  const ctx = (await getAdminCtx())!;
  const [editions, counts] = await Promise.all([listEditions(), getTodoCounts()]);
  const allowed = { refunds: can(ctx, 'orders.read'), photos: canSomewhere(ctx, 'photos.moderate'), pending: can(ctx, 'orders.read') };
  const todo = todoRows(counts).filter((r) => r.count > 0 && allowed[r.key as keyof typeof allowed]);
  const mine = editions.filter((e) => editionPermissions(ctx, e.slug).length > 0);
  const active = mine.filter((e) => ACTIVE_STATUSES.includes(e.status));
  const today = romeDateKey(new Date());
  const upcoming = mine
    .filter((e) => e.startsOn && (e.endsOn ?? e.startsOn) >= today && e.status !== 'archived' && e.status !== 'concluded')
    .sort((a, b) => a.startsOn!.localeCompare(b.startsOn!))[0];
  // Stagione = anno solare dell'edizione; incassi solo delle edizioni di cui si leggono gli ordini.
  const season = mine.filter((e) => e.startsOn?.startsWith(today.slice(0, 4)) && can(ctx, 'orders.read', { edition: e.slug }));
  const [net, recent] = await Promise.all([
    netByEdition(season.map((e) => e.id)),
    can(ctx, 'audit.read') ? listAudit(ctx, {}).then((r) => r.rows.slice(0, 8)) : Promise.resolve(null),
  ]);
  const seasonRows = season.map((e) => ({ label: e.title, value: net.get(e.id) ?? 0 })).sort((a, b) => b.value - a.value);
  const seasonTotal = seasonRows.reduce((sum, r) => sum + r.value, 0);

  return (
    <AdminPage>
      <PageHeader
        title="Panoramica"
        subtitle="Pro Loco Gasperina"
        secondaryActions={
          <ButtonLink href="/scanner" variant="secondary">
            <ScanLine size={16} aria-hidden /> Scanner
          </ButtonLink>
        }
        primaryAction={
          <ButtonLink href="/cashier">
            <Store size={16} aria-hidden /> Apri la cassa
          </ButtonLink>
        }
      />
      {upcoming && (
        <Link href={`/admin/e/${upcoming.slug}`} className={cn('flex items-center gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm hover:bg-surface-sunken', focusRing)}>
          <CalendarClock size={24} aria-hidden className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-label text-muted">Prossima edizione</span>
            <span className="block truncate text-section font-semibold text-fg">{upcoming.title}</span>
            <span className="block text-label text-muted">{formatDate(upcoming.startsOn!)}</span>
          </span>
          <StatusBadge status={upcoming.status} />
        </Link>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Da fare" flush>
          {todo.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-6 text-body text-muted">
              <CheckCircle2 size={18} aria-hidden className="text-success" /> Niente da fare. Ottimo lavoro.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {todo.map(({ key, icon: Icon, count, text, href }) => (
                <li key={key}>
                  <Link href={href} className={cn('flex items-center gap-3 px-4 py-3 text-body text-fg hover:bg-surface-sunken', focusRing)}>
                    <Icon size={18} aria-hidden className="shrink-0 text-muted" />
                    <span className="flex-1">{text(count)}</span>
                    <ArrowRight size={16} aria-hidden className="text-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Edizioni attive" actions={<Link href="/admin/edizioni" className={cn('rounded text-label text-primary hover:underline', focusRing)}>Tutte</Link>} flush>
          {active.length === 0 ? (
            <p className="px-4 py-6 text-body text-muted">Nessuna edizione in vendita o in corso.</p>
          ) : (
            <ul className="divide-y divide-border">
              {active.map((e) => (
                <li key={e.slug}>
                  <Link href={`/admin/e/${e.slug}`} className={cn('flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken', focusRing)}>
                    <EditionDot dot={e.dot} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-medium text-fg">{e.title}</span>
                      {e.startsOn && <span className="block text-label text-muted">{formatDate(e.startsOn)}</span>}
                    </span>
                    <StatusBadge status={e.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {season.length > 0 && (
          <Card title={`Stagione ${today.slice(0, 4)}`} description={`Incassato netto: ${formatMoney(seasonTotal)}`}>
            <BarList rows={seasonRows} format={formatMoney} />
          </Card>
        )}
        {recent && (
          <Card
            title="Attività recente"
            actions={
              <Link href="/admin/sistema/registro" className={cn('rounded text-label text-primary hover:underline', focusRing)}>
                Registro
              </Link>
            }
          >
            {recent.length === 0 ? (
              <p className="text-body text-muted">Ancora nessuna attività.</p>
            ) : (
              <Timeline
                items={recent.map((r) => ({
                  id: r.id,
                  title: `${AUDIT_ACTION_LABELS[r.action] ?? r.action}${r.edition ? ` · ${editions.find((e) => e.slug === r.edition)?.title ?? r.edition}` : ''}`,
                  time: formatRelative(r.at),
                  actor: r.actor,
                }))}
              />
            )}
          </Card>
        )}
      </div>
    </AdminPage>
  );
}
