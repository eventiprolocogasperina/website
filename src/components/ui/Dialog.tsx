'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';
import { IconButton } from './IconButton';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export type DialogContentProps = {
  /** Titolo obbligatorio: è anche il nome accessibile della finestra. */
  title: ReactNode;
  /** Spiega cosa succede; letto dai lettori di schermo all'apertura. */
  description?: ReactNode;
  /** Pulsanti in basso a destra: azione principale per ultima. */
  footer?: ReactNode;
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

/** Finestra modale centrata. Esc e clic fuori la chiudono; il focus resta dentro finché è aperta. */
export function DialogContent({ title, description, footer, children, size = 'md', className }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
      <RadixDialog.Content
        // Senza descrizione Radix chiede di dichiararlo esplicitamente.
        {...(!description && { 'aria-describedby': undefined })}
        className={cn(
          'ui-root fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-surface-raised shadow-lg outline-none',
          { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div>
            <RadixDialog.Title className="text-section font-semibold text-fg">{title}</RadixDialog.Title>
            {description && <RadixDialog.Description className="mt-1 text-body text-muted">{description}</RadixDialog.Description>}
          </div>
          <RadixDialog.Close asChild>
            <IconButton icon={X} label="Chiudi" size="sm" tooltip={false} className="-mt-1 -mr-2" />
          </RadixDialog.Close>
        </div>
        {children && <div className="overflow-y-auto px-5 pt-4">{children}</div>}
        {footer && <div className="mt-2 flex flex-wrap justify-end gap-2 px-5 pt-3 pb-5">{footer}</div>}
        {!footer && <div className="pb-5" />}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
