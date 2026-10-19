'use client';

import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

/** Va messo una volta sola vicino alla radice (lo fa il layout dell'admin e la vetrina). */
export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <RadixTooltip.Provider delayDuration={300} skipDelayDuration={100}>
    {children}
  </RadixTooltip.Provider>
);

export type TooltipProps = {
  /** Testo del suggerimento. Breve, senza punto finale. */
  content: ReactNode;
  /** Elemento che riceve il suggerimento: deve accettare ref e focus (pulsante, link). */
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
};

/** Suggerimento al passaggio del mouse o al focus da tastiera. */
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="ui-root z-50 rounded-md bg-fg px-2 py-1 text-caption text-surface shadow-lg"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
