import { Info, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, cn, type BadgeTone } from '@/components/ui';

export const SESSION_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  open: { label: 'Aperta', tone: 'success' },
  closed: { label: 'Chiusa', tone: 'neutral' },
  sold_out: { label: 'Esaurita', tone: 'info' },
  cancelled: { label: 'Annullata', tone: 'danger' },
  postponed: { label: 'Rinviata', tone: 'warning' },
};

export function SessionStatusBadge({ status }: { status: string }) {
  const meta = SESSION_STATUS[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/** Barra di riempimento: venduti su capienza, oppure "senza limite". */
export function FillBar({ used, size, className }: { used: number; size: number | null; className?: string }) {
  if (size === null) return <span className={cn('text-label text-muted tabular-nums', className)}>{used} venduti · senza limite</span>;
  const pct = size === 0 ? 100 : Math.min(100, Math.round((used / size) * 100));
  return (
    <div className={cn('flex min-w-36 flex-col gap-1', className)}>
      <div className="flex justify-between gap-2 text-label tabular-nums">
        <span>
          {used} / {size}
        </span>
        <span className="text-muted">{Math.max(0, size - used)} liberi</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" role="meter" aria-valuemin={0} aria-valuemax={size} aria-valuenow={used} aria-label="Posti venduti">
        <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-danger' : pct >= 85 ? 'bg-warning' : 'bg-primary')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Avvisi in cima alle pagine dell'edizione. */
export function Notice({ tone = 'info', children }: { tone?: 'info' | 'locked'; children: ReactNode }) {
  const Icon = tone === 'locked' ? Lock : Info;
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border px-4 py-3 text-body', tone === 'locked' ? 'border-border bg-surface-sunken text-muted' : 'border-info/30 bg-info-bg text-fg')}>
      <Icon size={18} className={cn('mt-0.5 shrink-0', tone === 'locked' ? 'text-muted' : 'text-info')} aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** Le vendite di oggi passano ancora dal vecchio sistema fino alla fase 3 (prompt 12–14). */
export function LegacySalesNotice() {
  return (
    <Notice>
      Il sito e la cassa vendono ancora con le impostazioni di prima: le modifiche fatte qui valgono dal nuovo checkout e dalla nuova cassa. I posti venduti sono contati dagli ordini di oggi.
    </Notice>
  );
}

export function ArchivedNotice() {
  return <Notice tone="locked">Questa edizione è archiviata: si può consultare ma non modificare.</Notice>;
}
