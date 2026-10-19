'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';
import { IconButton } from './IconButton';

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;

export type SheetContentProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Barra fissa in basso con le azioni (Annulla · Salva). */
  footer?: ReactNode;
  children?: ReactNode;
  /** Lato da cui entra. Default: destra. */
  side?: 'right' | 'left';
  /** Larghezza su desktop. Su mobile occupa tutto lo schermo. */
  size?: 'md' | 'lg';
  className?: string;
};

/** Pannello laterale per modifiche rapide senza lasciare l'elenco (§11.7). */
export function SheetContent({ title, description, footer, children, side = 'right', size = 'md', className }: SheetContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
      <RadixDialog.Content
        {...(!description && { 'aria-describedby': undefined })}
        className={cn(
          'ui-root fixed inset-y-0 z-50 flex w-full flex-col border-border bg-surface-raised shadow-lg outline-none',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          size === 'md' ? 'sm:max-w-md' : 'sm:max-w-2xl',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <RadixDialog.Title className="text-section font-semibold text-fg">{title}</RadixDialog.Title>
            {description && <RadixDialog.Description className="mt-0.5 text-label text-muted">{description}</RadixDialog.Description>}
          </div>
          <RadixDialog.Close asChild>
            <IconButton icon={X} label="Chiudi" size="sm" tooltip={false} />
          </RadixDialog.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
