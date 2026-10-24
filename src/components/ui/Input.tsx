'use client';

import type { ComponentProps, ReactNode } from 'react';
import { cn, focusRing, transition } from './cn';
import { useFieldControl } from './Field';

/** Classi comuni a tutti i campi di testo: 36 px di altezza (§14.4), bordo almeno 3:1. */
export const controlClasses = cn(
  'w-full rounded-md border border-border-strong bg-surface text-body text-fg placeholder:text-subtle',
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-muted',
  'aria-[invalid=true]:border-danger',
  focusRing,
  'focus-visible:outline-offset-0',
  transition,
);

export type InputProps = Omit<ComponentProps<'input'>, 'prefix'> & {
  /** Contenuto fisso a sinistra (icona o testo come "€"). */
  prefix?: ReactNode;
  /** Contenuto fisso a destra (unità, scorciatoia). */
  suffix?: ReactNode;
  /** Forza lo stato di errore; dentro un Field arriva dal suo `error`. */
  invalid?: boolean;
};

/** Campo di testo. Dentro un Field riceve id ed errori automaticamente. */
export function Input({ prefix, suffix, invalid, className, ...props }: InputProps) {
  const { attrs } = useFieldControl({ ...props, invalid });
  const input = (
    <input
      {...props}
      {...attrs}
      className={cn(controlClasses, 'h-9 px-3', prefix ? 'pl-9' : undefined, suffix ? 'pr-12' : undefined, !prefix && !suffix && className)}
    />
  );
  if (!prefix && !suffix) return input;
  return (
    <div className={cn('relative flex items-center', className)}>
      {prefix && <span className="pointer-events-none absolute left-3 flex items-center text-muted">{prefix}</span>}
      {input}
      {suffix && <span className="pointer-events-none absolute right-3 flex items-center text-label text-muted">{suffix}</span>}
    </div>
  );
}

export type TextareaProps = ComponentProps<'textarea'> & { invalid?: boolean };

/** Testo su più righe. */
export function Textarea({ invalid, className, rows = 4, ...props }: TextareaProps) {
  const { attrs } = useFieldControl({ ...props, invalid });
  return <textarea rows={rows} {...props} {...attrs} className={cn(controlClasses, 'min-h-20 px-3 py-2', className)} />;
}
