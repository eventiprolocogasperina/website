import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn, focusRing } from './cn';

export type PageHeaderProps = {
  /** Titolo della pagina (20 px). */
  title: ReactNode;
  /** Contatore accanto al titolo negli elenchi ("128"). */
  count?: number;
  /** Badge di stato accanto al titolo nei dettagli. */
  badge?: ReactNode;
  /** Riga sotto il titolo: data, edizione, cliente… */
  subtitle?: ReactNode;
  /** Link "indietro" (es. dal dettaglio all'elenco). */
  back?: { href: string; label: string };
  /** Azione principale (un solo Button primary). */
  primaryAction?: ReactNode;
  /** Azioni secondarie e menu "⋯", a sinistra della principale. */
  secondaryActions?: ReactNode;
  className?: string;
};

/** Intestazione di ogni pagina admin (§11). */
export function PageHeader({ title, count, badge, subtitle, back, primaryAction, secondaryActions, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className={cn('mb-1 inline-flex items-center gap-1 rounded text-label text-muted hover:text-fg', focusRing)}>
            <ChevronLeft size={16} aria-hidden />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-title font-semibold text-fg">{title}</h1>
          {count !== undefined && <span className="text-title font-normal text-subtle tabular-nums">{count}</span>}
          {badge}
        </div>
        {subtitle && <div className="mt-0.5 text-body text-muted">{subtitle}</div>}
      </div>
      {(primaryAction || secondaryActions) && (
        <div className="flex flex-wrap items-center gap-2">
          {secondaryActions}
          {primaryAction}
        </div>
      )}
    </header>
  );
}
