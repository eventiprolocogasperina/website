'use client';

import { Command } from 'cmdk';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from './cn';
import { useFieldControl } from './Field';
import { controlClasses } from './Input';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export type ComboboxOption = { value: string; label: string; /** Testo secondario, es. email o data. */ hint?: string };

export type ComboboxProps = {
  value: string | null;
  onValueChange: (value: string | null) => void;
  options: ComboboxOption[];
  placeholder?: string;
  /** Segnaposto del campo di ricerca. */
  searchPlaceholder?: string;
  /** Testo quando la ricerca non trova nulla. */
  emptyText?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
};

/** Selettore con ricerca, per elenchi lunghi (clienti, edizioni, prodotti). */
export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = 'Scegli…',
  searchPlaceholder = 'Cerca…',
  emptyText = 'Nessun risultato',
  disabled,
  invalid,
  id,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const { attrs } = useFieldControl({ id, invalid });
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        {...attrs}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        className={cn(controlClasses, 'flex h-9 items-center justify-between gap-2 px-3 text-left', !selected && 'text-subtle', className)}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronsUpDown size={16} className="shrink-0 text-muted" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0">
        <Command className="flex flex-col" loop>
          <Command.Input
            placeholder={searchPlaceholder}
            className="h-10 border-b border-border bg-transparent px-3 text-body text-fg outline-none placeholder:text-subtle"
          />
          <Command.List className="max-h-64 overflow-y-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-label text-muted">{emptyText}</Command.Empty>
            {options.map((o) => (
              <Command.Item
                key={o.value}
                value={`${o.label} ${o.hint ?? ''} ${o.value}`}
                onSelect={() => {
                  onValueChange(o.value === value ? null : o.value);
                  setOpen(false);
                }}
                className="flex min-h-9 cursor-default items-center gap-2 rounded-md px-3 py-1.5 text-body outline-none select-none data-[selected=true]:bg-surface-sunken"
              >
                <Check size={16} className={cn('shrink-0', o.value === value ? 'opacity-100' : 'opacity-0')} aria-hidden />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{o.label}</span>
                  {o.hint && <span className="truncate text-caption text-muted">{o.hint}</span>}
                </span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
