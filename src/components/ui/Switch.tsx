'use client';

import * as RadixSwitch from '@radix-ui/react-switch';
import { useId, type ReactNode } from 'react';
import { cn, focusRing, transition } from './cn';

export type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Etichetta: descrive cosa si attiva, non lo stato ("Vendite online", non "Attivo"). */
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-label'?: string;
};

/** Interruttore per impostazioni che hanno effetto subito (per i moduli con "Salva" preferisci Checkbox). */
export function Switch({ label, description, className, id: idProp, ...props }: SwitchProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const control = (
    <RadixSwitch.Root
      id={id}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-border-strong',
        'data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        transition,
        !label && className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-surface shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-[18px]" />
    </RadixSwitch.Root>
  );
  if (!label) return control;
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col">
        <label htmlFor={id} className="text-body font-medium text-fg">
          {label}
        </label>
        {description && <span className="text-caption text-muted">{description}</span>}
      </div>
      {control}
    </div>
  );
}
