'use client';

import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check, type LucideIcon } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { useFieldControl } from '@/components/ui/Field';

/*
 * Mattoni delle pagine d'acquisto (sito pubblico, guida di design P2): card, titoli di sezione, campi
 * grandi (48 px, testo 16 px: niente zoom su iOS), caselle di spunta da 22 px. Colori dal tema del format
 * (--ev-*, editionThemeStyle), mai esadecimali qui.
 */

/** Riquadro bianco delle sezioni del checkout. */
export const card = 'rounded-[1.25rem] border border-[var(--ev-border)] bg-white shadow-[0_10px_30px_-14px_var(--ev-glow)]';

/** Titolo di sezione con icona emoji in un riquadro colorato e titolo nel font del format. */
export function SectionTitle({ emoji, title, hint, id }: { emoji: string; title: string; hint?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ev-soft)] text-[1.35rem]">
        {emoji}
      </span>
      <div className="min-w-0">
        <h2 id={id} className="font-ev-display text-pub-xl font-bold text-[var(--ev-ink)]">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-pub-sm text-muted">{hint}</p>}
      </div>
    </div>
  );
}

/** Pill piccola (orari, destinatari, posti). */
export function Pill({ tone = 'soft', children }: { tone?: 'soft' | 'warning' | 'danger' | 'success' | 'neutral'; children: ReactNode }) {
  const tones = {
    soft: 'bg-[var(--ev-soft)] text-[var(--ev-ink)]',
    warning: 'bg-warning-bg text-warning',
    danger: 'bg-danger-bg text-danger',
    success: 'bg-success-bg text-success',
    neutral: 'bg-surface-sunken text-muted',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-pub-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

type PublicInputProps = ComponentProps<'input'> & { icon?: LucideIcon; invalid?: boolean };

/** Campo di testo grande del sito pubblico; dentro un Field riceve id, errore e aria-describedby. */
export function PublicInput({ icon: Icon, invalid, className, ...props }: PublicInputProps) {
  const { attrs } = useFieldControl({ ...props, invalid });
  return (
    <div className={`relative ${className ?? ''}`}>
      {Icon && <Icon size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ev-accent)]" />}
      <input
        {...props}
        {...attrs}
        className={`h-12 w-full rounded-xl border-2 border-[var(--ev-border)] bg-[var(--ev-softer)] text-[16px] text-fg shadow-[inset_0_1px_2px_rgb(0_0_0_/_0.04)] outline-none transition placeholder:text-subtle focus:border-[var(--ev-accent)] focus:bg-white focus:ring-4 focus:ring-[var(--ev-glow)] aria-[invalid=true]:border-danger aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-danger/15 ${Icon ? 'pl-11 pr-4' : 'px-4'}`}
      />
    </div>
  );
}

/** Casella di spunta grande con etichetta cliccabile ed errore sotto. */
export function PublicCheckbox({
  checked,
  onCheckedChange,
  label,
  error,
}: {
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
  label: ReactNode;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-3">
        <RadixCheckbox.Root
          id={id}
          checked={checked}
          onCheckedChange={(c) => onCheckedChange(c === true)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-md border-2 bg-white text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)] data-[state=checked]:border-[var(--ev-accent)] data-[state=checked]:bg-[var(--ev-accent)] ${error ? 'border-danger' : 'border-[var(--ev-border)]'}`}
        >
          <RadixCheckbox.Indicator>
            <Check size={14} strokeWidth={3.5} aria-hidden />
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        <label htmlFor={id} className="text-pub-sm text-fg">
          {label}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="ml-[34px] mt-1 text-pub-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
