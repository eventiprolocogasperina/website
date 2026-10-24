import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

export type CardProps = ComponentProps<'section'> & {
  /** Titolo della card (16 px, §14.2). */
  title?: ReactNode;
  /** Riga di descrizione sotto il titolo. */
  description?: ReactNode;
  /** Azioni in alto a destra (pulsanti ghost, menu). */
  actions?: ReactNode;
  /** Piè della card, separato da un bordo (es. "Vedi tutti"). */
  footer?: ReactNode;
  /** Toglie il padding interno, per tabelle ed elenchi a tutta larghezza. */
  flush?: boolean;
};

/** Contenitore di base dell'admin: bordo, raggio 12, ombra leggera. */
export function Card({ title, description, actions, footer, flush, className, children, ...props }: CardProps) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <section className={cn('rounded-xl border border-border bg-surface shadow-sm', className)} {...props}>
      {hasHeader && (
        <header className={cn('flex items-start justify-between gap-4 px-4 pt-4', flush && 'pb-3')}>
          <div className="min-w-0">
            {title && <h2 className="text-section font-semibold text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-label text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(!flush && 'p-4', !flush && hasHeader && 'pt-3')}>{children}</div>
      {footer && <footer className="border-t border-border px-4 py-3 text-label">{footer}</footer>}
    </section>
  );
}
