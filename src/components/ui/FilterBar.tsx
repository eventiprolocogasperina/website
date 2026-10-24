'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn, focusRing, transition } from './cn';
import { Input } from './Input';
import { Kbd } from './Kbd';

export type FilterChip = {
  key: string;
  /** Testo del filtro attivo ("Stato: pagato"). */
  label: ReactNode;
  onRemove: () => void;
};

export type FilterBarProps = {
  /** Testo di ricerca (controllato, tipicamente letto dall'URL). */
  search: string;
  /** Chiamata 300 ms dopo l'ultima battitura (§11.1). */
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Filtri attivi mostrati come chip rimovibili. */
  chips?: FilterChip[];
  /** Pulsanti per aggiungere filtri (Popover, DropdownMenu). */
  filters?: ReactNode;
  /** Elementi a destra: ordinamento, colonne visibili. */
  end?: ReactNode;
  onClearAll?: () => void;
  className?: string;
};

/** Ricerca con debounce, filtri a chip e azioni dell'elenco. Il tasto "/" porta il focus sulla ricerca. */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Cerca…',
  chips = [],
  filters,
  end,
  onClearAll,
  className,
}: FilterBarProps) {
  const [text, setText] = useState(search);
  const [lastSearch, setLastSearch] = useState(search);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onSearchChange);
  useEffect(() => {
    onChangeRef.current = onSearchChange;
  });

  if (search !== lastSearch) {
    setLastSearch(search);
    setText(search);
  }

  useEffect(() => {
    if (text === search) return;
    const t = setTimeout(() => onChangeRef.current(text), 300);
    return () => clearTimeout(t);
  }, [text, search]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.key !== '/' || target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={inputRef}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          prefix={<Search size={16} aria-hidden />}
          suffix={<Kbd>/</Kbd>}
          className="min-w-48 flex-1 sm:max-w-sm"
        />
        {filters}
        {end && <div className="ml-auto flex items-center gap-2">{end}</div>}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface-sunken pr-1 pl-3 text-label text-fg">
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Rimuovi filtro ${typeof chip.label === 'string' ? chip.label : ''}`.trim()}
                className={cn('inline-flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-border hover:text-fg', focusRing, transition)}
              >
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
          {onClearAll && (
            <button type="button" onClick={onClearAll} className={cn('rounded px-1 text-label text-primary hover:underline', focusRing)}>
              Togli tutti i filtri
            </button>
          )}
        </div>
      )}
    </div>
  );
}
