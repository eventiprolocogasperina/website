import { AlertTriangle, Lock, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { cn } from './cn';

export type EmptyStateProps = {
  icon: LucideIcon;
  /** Una frase: cosa manca. */
  title: ReactNode;
  /** Cosa può fare la persona. */
  description?: ReactNode;
  /** Un'azione (Button o ButtonLink). */
  action?: ReactNode;
  className?: string;
};

/** Stato vuoto: icona, una frase e un'azione (§11.6). */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-muted">
        <Icon size={24} aria-hidden />
      </span>
      <p className="text-section font-semibold text-fg">{title}</p>
      {description && <p className="max-w-sm text-body text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export type ErrorStateProps = {
  /** Messaggio in italiano: cosa è successo e cosa fare. */
  message?: ReactNode;
  /** Codice o digest piccolo per l'assistenza. */
  code?: string;
  onRetry?: () => void;
  className?: string;
};

/** Stato di errore con "Riprova" e codice per il supporto (§11.6). */
export function ErrorState({ message = 'Non siamo riusciti a caricare i dati. Riprova tra poco.', code, onRetry, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-2 px-6 py-12 text-center', className)}>
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger">
        <AlertTriangle size={24} aria-hidden />
      </span>
      <p className="max-w-sm text-body text-fg">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          Riprova
        </Button>
      )}
      {code && <p className="text-caption text-subtle">Codice errore: {code}</p>}
    </div>
  );
}

/** Stato "permesso negato" (§11.6). */
export function ForbiddenState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Lock}
      title="Non hai accesso a questa sezione"
      description="Chiedi a un amministratore di darti il permesso."
      className={className}
    />
  );
}
