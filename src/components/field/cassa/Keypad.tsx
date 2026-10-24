'use client';

import { Delete } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn, focusRing } from '@/components/ui';
import { popDigit, pushDigit } from '@/lib/cash/change';
import { formatMoney } from '@/lib/money';

/** Tastierino degli importi in centesimi, come le casse: 1 2 5 0 → 12,50 €. Tasti alti 56 px. */
export function MoneyKeypad({ value, onChange, label }: { value: number; onChange: (cents: number) => void; label: string }) {
  return (
    <div>
      <p className="mb-2 rounded-xl border border-border bg-surface-sunken px-4 py-3 text-right text-title font-semibold tabular-nums" aria-live="polite" aria-label={`${label}: ${formatMoney(value)}`}>
        {formatMoney(value)}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((d) => (
          <KeyButton key={d} onClick={() => onChange(pushDigit(value, d))}>
            {d}
          </KeyButton>
        ))}
        <KeyButton onClick={() => onChange(popDigit(value))} label="Cancella una cifra">
          <Delete aria-hidden />
        </KeyButton>
      </div>
    </div>
  );
}

export function KeyButton({ children, onClick, label, className }: { children: ReactNode; onClick: () => void; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn('flex h-14 items-center justify-center rounded-xl border border-border bg-surface text-title font-semibold tabular-nums active:bg-surface-sunken', focusRing, className)}
    >
      {children}
    </button>
  );
}

/** Pulsante grande delle app da campo (min 56 px), primario o secondario. */
export function BigButton({
  children,
  onClick,
  disabled,
  tone = 'primary',
  className,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-4 text-section font-semibold disabled:opacity-40',
        tone === 'primary' && 'bg-primary text-primary-fg active:bg-primary-hover',
        tone === 'secondary' && 'border border-border-strong bg-surface text-fg active:bg-surface-sunken',
        tone === 'danger' && 'bg-danger text-surface active:bg-danger-hover',
        focusRing,
        className,
      )}
    >
      {children}
    </button>
  );
}
