import type { ReactNode } from 'react';
import { cn } from './cn';

/** Tasto o scorciatoia da tastiera, es. <Kbd>⌘K</Kbd>. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-sunken px-1 font-ui text-caption text-muted', className)}>
      {children}
    </kbd>
  );
}
