import { ArrowRight, CheckCircle2, ScanLine, Store } from 'lucide-react';
import Link from 'next/link';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { EditionDot } from '@/components/admin/shell/EditionDot';
import { todoRows } from '@/components/admin/shell/todo-rows';
import { ButtonLink, Card, cn, focusRing, PageHeader, StatusBadge } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { getTodoCounts } from '@/server/admin/todo';
import { getAdminCtx } from '@/server/auth/context';
import { can, canSomewhere, editionPermissions } from '@/server/auth/permissions';
import { listEditions } from '@/server/domain/editions';
import { ACTIVE_STATUSES } from '@/server/domain/editions/types';

export const metadata = { title: 'Panoramica' };

/** Panoramica dell'associazione (§10.3): cosa c'è da fare e quali edizioni sono attive. */
export default async function AdminHomePage() {
  const ctx = (await getAdminCtx())!;
  const [editions, counts] = await Promise.all([listEditions(), getTodoCounts()]);
  const allowed = { refunds: can(ctx, 'orders.read'), photos: canSomewhere(ctx, 'photos.moderate'), pending: can(ctx, 'orders.read') };
  const todo = todoRows(counts).filter((r) => r.count > 0 && allowed[r.key as keyof typeof allowed]);
  const active = editions.filter((e) => ACTIVE_STATUSES.includes(e.status) && editionPermissions(ctx, e.slug).length > 0);

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
    </AdminPage>
  );
}
