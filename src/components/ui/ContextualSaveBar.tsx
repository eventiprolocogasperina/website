'use client';

import { useEffect } from 'react';
import { Button } from './Button';
import { cn } from './cn';

export type ContextualSaveBarProps = {
  /** true quando ci sono modifiche non salvate: mostra la barra e attiva l'avviso in uscita. */
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  saving?: boolean;
  /** Disabilita "Salva" (es. errori di validazione). */
  saveDisabled?: boolean;
  message?: string;
  className?: string;
};

/**
 * Barra fissa in alto "Modifiche non salvate · Annulla · Salva" (§11.3).
 * Finché `dirty` è true il browser chiede conferma prima di chiudere o ricaricare la pagina.
 */
export function ContextualSaveBar({ dirty, onSave, onDiscard, saving, saveDisabled, message = 'Modifiche non salvate', className }: ContextualSaveBarProps) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (!dirty) return null;
  return (
    <div
      role="region"
      aria-label="Salvataggio"
      className={cn('sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-3 border-b border-border bg-fg px-4 py-2.5 text-surface shadow-sm sm:-mx-6 sm:px-6', className)}
    >
      <span className="flex-1 text-body font-medium">{message}</span>
      <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving} className="text-surface hover:bg-surface/10">
        Annulla
      </Button>
      <Button variant="secondary" size="sm" onClick={onSave} loading={saving} disabled={saveDisabled}>
        Salva
      </Button>
    </div>
  );
}
