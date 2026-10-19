'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from './cn';

type FieldContextValue = { id: string; describedBy?: string; invalid: boolean; required: boolean };

const FieldContext = createContext<FieldContextValue | null>(null);

/** Collega un controllo al Field che lo contiene: id, aria-describedby, aria-invalid. */
export function useFieldControl(props: { id?: string; invalid?: boolean; required?: boolean; 'aria-describedby'?: string }) {
  const field = useContext(FieldContext);
  const invalid = props.invalid ?? field?.invalid ?? false;
  return {
    invalid,
    /** Attributi da passare all'elemento del controllo. */
    attrs: {
      id: props.id ?? field?.id,
      'aria-describedby': [props['aria-describedby'], field?.describedBy].filter(Boolean).join(' ') || undefined,
      'aria-invalid': invalid || undefined,
      required: props.required ?? field?.required,
    },
  };
}

export type FieldProps = {
  /** Etichetta visibile del campo. */
  label: ReactNode;
  /** Testo d'aiuto sotto il campo. */
  help?: ReactNode;
  /** Messaggio d'errore in italiano: se presente il campo è marcato come non valido. */
  error?: ReactNode;
  /** Mostra "obbligatorio" accanto all'etichetta e imposta required sul controllo. */
  required?: boolean;
  /** Etichetta nascosta alla vista ma letta dai lettori di schermo. */
  hideLabel?: boolean;
  /** Il controllo: Input, Textarea, Select, MoneyInput… */
  children: ReactNode;
  className?: string;
  /** id da usare per il controllo; se manca se ne genera uno. */
  id?: string;
};

/** Etichetta, aiuto ed errore attorno a un controllo, con gli attributi aria già collegati. */
export function Field({ label, help, error, required = false, hideLabel, children, className, id: idProp }: FieldProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy: [errorId, helpId].filter(Boolean).join(' ') || undefined, invalid: !!error, required }}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label htmlFor={id} className={cn('text-label font-medium text-fg', hideLabel && 'sr-only')}>
          {label}
          {required && <span className="ml-1 font-normal text-muted">(obbligatorio)</span>}
        </label>
        {children}
        {error && (
          <p id={errorId} className="text-label text-danger">
            {error}
          </p>
        )}
        {help && (
          <p id={helpId} className="text-caption text-muted">
            {help}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}
