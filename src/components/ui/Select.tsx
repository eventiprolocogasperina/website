'use client';

import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn';
import { useFieldControl } from './Field';
import { controlClasses } from './Input';

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = {
  /** Valore selezionato (controllato). */
  value?: string;
  /** Valore iniziale (non controllato). */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  /** Testo mostrato quando non c'è nessun valore. */
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  name?: string;
  className?: string;
  /** Etichetta per i lettori di schermo quando il Select non è dentro un Field. */
  'aria-label'?: string;
};

/** Menu a tendina per scegliere un valore da un elenco breve (per elenchi lunghi usa Combobox). */
export function Select({ options, placeholder = 'Scegli…', className, invalid, id, ...props }: SelectProps) {
  const { attrs } = useFieldControl({ id, invalid });
  return (
    <RadixSelect.Root {...props}>
      <RadixSelect.Trigger
        {...attrs}
        aria-label={props['aria-label']}
        className={cn(controlClasses, 'flex h-9 items-center justify-between gap-2 px-3 text-left data-[placeholder]:text-subtle', className)}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown size={16} className="text-muted" aria-hidden />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="ui-root z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-lg"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex h-9 cursor-default items-center rounded-md pr-8 pl-3 text-body outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-sunken"
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2">
                  <Check size={16} aria-hidden />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
