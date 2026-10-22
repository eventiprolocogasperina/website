import { ArrowRight, CheckCircle2, Circle, CircleDashed, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { Badge, ButtonLink, Card, cn, focusRing } from '@/components/ui';
import type { SetupChecklist as Checklist, SetupItem, SetupItemStatus, SetupStep } from '@/lib/edition-setup';

const ICON: Record<SetupItemStatus, { icon: typeof Circle; className: string; label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  done: { icon: CheckCircle2, className: 'text-success', label: 'Fatto', tone: 'success' },
  todo: { icon: Circle, className: 'text-warning', label: 'Da fare', tone: 'warning' },
  skipped: { icon: CircleDashed, className: 'text-subtle', label: 'Saltato', tone: 'neutral' },
};

/** Elenco dei passi a sinistra della procedura guidata. */
export function SetupStepper({ items, current, hrefOf }: { items: SetupItem[]; current: SetupStep; hrefOf: (k: SetupStep) => string }) {
  return (
    <nav aria-label="Passi della procedura" className="rounded-xl border border-border bg-surface p-2 shadow-sm">
      <ol className="flex flex-col gap-0.5">
        {items.map((item, i) => {
          const { icon: Icon, className, label } = ICON[item.status];
          const active = item.key === current;
          return (
            <li key={item.key}>
              <Link
                href={hrefOf(item.key)}
                aria-current={active ? 'step' : undefined}
                className={cn('flex items-center gap-2 rounded-lg px-2.5 py-2 text-body', active ? 'bg-surface-sunken font-medium text-fg' : 'text-muted hover:bg-surface-sunken hover:text-fg', focusRing)}
              >
                <Icon size={16} aria-hidden className={cn('shrink-0', className)} />
                <span className="flex-1">
                  {i + 1}. {item.label}
                </span>
                <span className="sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Riquadro "Da completare" della panoramica: passi in ordine, stato calcolato dai dati, dove si fa. */
export function SetupChecklistCard({ edition, list }: { edition: string; list: Checklist }) {
  const base = `/admin/e/${edition}`;
  const pct = Math.round((list.done / list.total) * 100);
  return (
    <Card
      title="Da completare"
      description={`${list.done} di ${list.total} passi fatti${list.kind === 'info' ? ' · evento solo informativo' : ''}`}
      actions={
        <ButtonLink href={`${base}/procedura`} size="sm" icon={ListChecks}>
          Riprendi la procedura
        </ButtonLink>
      }
      flush
      footer={
        list.salesBlockers.length > 0 && list.kind === 'sales' ? (
          <span className="text-muted">Le vendite si aprono quando sono fatti i passi necessari: {list.salesBlockers.map((b) => b.label).join(', ')}.</span>
        ) : list.kind === 'sales' ? (
          <span className="text-success">I passi necessari sono fatti: puoi aprire le vendite.</span>
        ) : undefined
      }
    >
      <div className="mx-4 mb-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Passi fatti">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <ol className="divide-y divide-border border-t border-border" aria-label="Passi da completare">
        {list.items.map((item, i) => {
          const { icon: Icon, className, label, tone } = ICON[item.status];
          return (
            <li key={item.key}>
              <Link href={`${base}/procedura/${item.path}`} className={cn('flex items-center gap-3 px-4 py-3 hover:bg-surface-sunken', focusRing)}>
                <Icon size={18} aria-hidden className={cn('shrink-0', className)} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-body font-medium text-fg">
                    {i + 1}. {item.label}
                    {!item.required && <span className="text-caption font-normal text-subtle">facoltativo</span>}
                  </span>
                  <span className="block truncate text-label text-muted">{item.detail}</span>
                </span>
                <Badge tone={tone}>{label}</Badge>
                <ArrowRight size={16} aria-hidden className="shrink-0 text-subtle" />
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
