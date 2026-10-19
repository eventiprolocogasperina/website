import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BadgeTone } from './Badge';
import { cn } from './cn';

export type TimelineItem = {
  id: string;
  /** Cosa è successo ("Pagamento ricevuto"). */
  title: ReactNode;
  /** Quando, già formattato (formatDateTime o formatRelative). */
  time: ReactNode;
  /** Chi l'ha fatto ("Niccolo", "Sistema", "Cassa 2"). */
  actor?: ReactNode;
  /** Dettaglio facoltativo. */
  body?: ReactNode;
  icon?: LucideIcon;
  tone?: BadgeTone;
};

const dotTone: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-muted',
  info: 'bg-info-bg text-info',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  primary: 'bg-primary text-primary-fg',
};

/** Cronologia degli eventi, la più recente in alto (in fondo ai dettagli, §11.2). */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < items.length - 1 && <span aria-hidden className="absolute top-7 bottom-0 left-3.5 w-px bg-border" />}
            <span className={cn('relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full', dotTone[item.tone ?? 'neutral'])}>
              {Icon ? <Icon size={14} aria-hidden /> : <span className="h-2 w-2 rounded-full bg-current" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-body font-medium text-fg">{item.title}</p>
                <span className="text-caption text-muted tabular-nums">{item.time}</span>
              </div>
              {item.actor && <p className="text-caption text-muted">{item.actor}</p>}
              {item.body && <div className="mt-1 text-label text-muted">{item.body}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
