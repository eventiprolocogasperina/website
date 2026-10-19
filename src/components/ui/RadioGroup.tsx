'use client';

import * as RadixRadio from '@radix-ui/react-radio-group';
import { useId, type ReactNode } from 'react';
import { cn, focusRing, transition } from './cn';

export type RadioOption = { value: string; label: ReactNode; description?: ReactNode; disabled?: boolean };

export type RadioGroupProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: RadioOption[];
  /** Nome del gruppo letto dai lettori di schermo, se non c'è un'etichetta visibile collegata. */
  'aria-label'?: string;
  orientation?: 'vertical' | 'horizontal';
  disabled?: boolean;
  name?: string;
  className?: string;
};

/** Scelta singola tra poche opzioni, tutte visibili. */
export function RadioGroup({ options, orientation = 'vertical', className, ...props }: RadioGroupProps) {
  const baseId = useId();
  return (
    <RadixRadio.Root
      orientation={orientation}
      className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap', className)}
      {...props}
    >
      {options.map((o) => {
        const id = `${baseId}-${o.value}`;
        return (
          <div key={o.value} className="flex items-start gap-2">
            <RadixRadio.Item
              id={id}
              value={o.value}
              disabled={o.disabled}
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface',
                'data-[state=checked]:border-primary disabled:opacity-50',
                focusRing,
                transition,
              )}
            >
              <RadixRadio.Indicator className="h-2 w-2 rounded-full bg-primary" />
            </RadixRadio.Item>
            <div className="flex flex-col">
              <label htmlFor={id} className="text-body text-fg">
                {o.label}
              </label>
              {o.description && <span className="text-caption text-muted">{o.description}</span>}
            </div>
          </div>
        );
      })}
    </RadixRadio.Root>
  );
}
