'use client';

import * as RadixMenu from '@radix-ui/react-dropdown-menu';
import { Check, type LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

export const DropdownMenu = RadixMenu.Root;
export const DropdownMenuTrigger = RadixMenu.Trigger;
export const DropdownMenuGroup = RadixMenu.Group;

/** Contenitore delle voci. */
export function DropdownMenuContent({ className, align = 'end', sideOffset = 4, ...props }: ComponentProps<typeof RadixMenu.Content>) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn('ui-root z-50 min-w-48 rounded-xl border border-border bg-surface-raised p-1 shadow-lg outline-none', className)}
        {...props}
      />
    </RadixMenu.Portal>
  );
}

const itemClasses =
  'flex h-9 cursor-default items-center gap-2 rounded-md px-2.5 text-body text-fg outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-sunken';

export type DropdownMenuItemProps = ComponentProps<typeof RadixMenu.Item> & {
  /** Icona lucide a 16 px. */
  icon?: LucideIcon;
  /** Scorciatoia da tastiera mostrata a destra (solo testo, es. "⌘K"). */
  shortcut?: string;
  /** danger per le azioni distruttive: vanno per ultime, dopo un separatore. */
  tone?: 'default' | 'danger';
  children: ReactNode;
};

/** Voce del menu. */
export function DropdownMenuItem({ icon: Icon, shortcut, tone = 'default', className, children, ...props }: DropdownMenuItemProps) {
  return (
    <RadixMenu.Item className={cn(itemClasses, tone === 'danger' && 'text-danger', className)} {...props}>
      {Icon && <Icon size={16} aria-hidden className={tone === 'danger' ? undefined : 'text-muted'} />}
      <span className="flex-1">{children}</span>
      {shortcut && <span className="text-caption text-subtle">{shortcut}</span>}
    </RadixMenu.Item>
  );
}

/** Voce con spunta (es. colonne visibili). */
export function DropdownMenuCheckboxItem({ className, children, ...props }: ComponentProps<typeof RadixMenu.CheckboxItem>) {
  return (
    <RadixMenu.CheckboxItem className={cn(itemClasses, 'pl-8 relative', className)} {...props}>
      <RadixMenu.ItemIndicator className="absolute left-2.5">
        <Check size={16} aria-hidden />
      </RadixMenu.ItemIndicator>
      {children}
    </RadixMenu.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof RadixMenu.Label>) {
  return <RadixMenu.Label className={cn('px-2.5 py-1.5 text-caption font-medium text-muted', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof RadixMenu.Separator>) {
  return <RadixMenu.Separator className={cn('my-1 h-px bg-border', className)} {...props} />;
}
