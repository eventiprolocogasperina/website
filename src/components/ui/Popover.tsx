'use client';

import * as RadixPopover from '@radix-ui/react-popover';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverClose = RadixPopover.Close;
export const PopoverAnchor = RadixPopover.Anchor;

export type PopoverContentProps = ComponentProps<typeof RadixPopover.Content> & { children: ReactNode };

/** Riquadro flottante ancorato a un elemento (filtri, selettori, dettagli rapidi). */
export function PopoverContent({ className, sideOffset = 6, align = 'start', ...props }: PopoverContentProps) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={sideOffset}
        align={align}
        className={cn('ui-root z-50 rounded-xl border border-border bg-surface-raised p-3 shadow-lg outline-none', className)}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
