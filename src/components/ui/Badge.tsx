import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from './cn';

export const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-caption font-medium whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-surface-sunken text-muted',
      info: 'bg-info-bg text-info',
      success: 'bg-success-bg text-success',
      warning: 'bg-warning-bg text-warning',
      danger: 'bg-danger-bg text-danger',
      primary: 'bg-primary text-primary-fg',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

export type BadgeProps = {
  /** Colore semantico: neutral, info, success, warning, danger, primary. */
  tone?: BadgeTone;
  /** Mostra un pallino colorato prima del testo. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
};

/** Etichetta breve di stato o categoria. Per gli stati del dominio usa StatusBadge. */
export function Badge({ tone, dot, children, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
