'use client';

import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn, focusRing, transition } from './cn';

export type CheckboxProps = {
  /** true, false oppure 'indeterminate' (es. "seleziona tutto" con selezione parziale). */
  checked?: boolean | 'indeterminate';
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Testo accanto alla casella; senza, passa `aria-label`. */
  label?: ReactNode;
  /** Descrizione sotto l'etichetta. */
  description?: ReactNode;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
};

/** Casella di spunta accessibile, con stato indeterminato. */
export function Checkbox({ label, description, onCheckedChange, className, id: idProp, ...props }: CheckboxProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const box = (
    <RadixCheckbox.Root
      id={id}
      onCheckedChange={(c) => onCheckedChange?.(c === true)}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border-strong bg-surface text-primary-fg',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        transition,
        !label && className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator>
        {props.checked === 'indeterminate' ? <Minus size={12} strokeWidth={3} aria-hidden /> : <Check size={12} strokeWidth={3} aria-hidden />}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
  if (!label) return box;
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <div className="flex h-5 items-center">{box}</div>
      <div className="flex flex-col">
        <label htmlFor={id} className="text-body text-fg">
          {label}
        </label>
        {description && <span className="text-caption text-muted">{description}</span>}
      </div>
    </div>
  );
}
