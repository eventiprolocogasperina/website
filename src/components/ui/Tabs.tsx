'use client';

import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cn, focusRing, transition } from './cn';

export type TabItem = {
  value: string;
  label: ReactNode;
  /** Numero mostrato accanto all'etichetta (es. ordini in attesa). */
  count?: number;
  content?: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Nome dell'insieme di schede per i lettori di schermo. */
  'aria-label'?: string;
  className?: string;
};

/** Schede orizzontali. Senza `content` servono come viste salvate di un elenco (§11.1). */
export function Tabs({ items, className, 'aria-label': ariaLabel, ...props }: TabsProps) {
  return (
    <RadixTabs.Root defaultValue={props.defaultValue ?? items[0]?.value} {...props} className={className}>
      <RadixTabs.List aria-label={ariaLabel} className="flex gap-1 overflow-x-auto border-b border-border">
        {items.map((t) => (
          <RadixTabs.Trigger
            key={t.value}
            value={t.value}
            disabled={t.disabled}
            className={cn(
              '-mb-px inline-flex h-9 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 text-body font-medium text-muted',
              'hover:text-fg data-[state=active]:border-primary data-[state=active]:text-fg disabled:opacity-50',
              focusRing,
              transition,
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="rounded-full bg-surface-sunken px-1.5 text-caption tabular-nums text-muted">{t.count}</span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map(
        (t) =>
          t.content !== undefined && (
            <RadixTabs.Content key={t.value} value={t.value} className={cn('pt-4', focusRing)}>
              {t.content}
            </RadixTabs.Content>
          ),
      )}
    </RadixTabs.Root>
  );
}
