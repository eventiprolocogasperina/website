'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';
import { IconButton } from './IconButton';

export type BulkActionBarProps = {
  /** Righe selezionate: con 0 la barra non compare. */
  count: number;
  /** Nome dell'elemento al singolare e al plurale, es. ['ordine', 'ordini']. */
  noun?: [string, string];
  /** Pulsanti delle azioni sulla selezione. */
  actions: ReactNode;
  onClear: () => void;
  className?: string;
};

/** Barra fissa in basso che appare quando selezioni righe in un elenco (§11.1). */
export function BulkActionBar({ count, noun = ['elemento', 'elementi'], actions, onClear, className }: BulkActionBarProps) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Azioni sulla selezione"
      className={cn(
        'fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-2.5 shadow-lg',
        className,
      )}
    >
      <IconButton icon={X} label="Deseleziona tutto" size="sm" onClick={onClear} />
      <span className="text-body font-medium tabular-nums" aria-live="polite">
        {count} {count === 1 ? noun[0] : noun[1]} {count === 1 ? 'selezionato' : 'selezionati'}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}
