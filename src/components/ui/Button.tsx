import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn, focusRing, transition } from './cn';

export const buttonVariants = cva(
  cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium select-none',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    focusRing,
    transition,
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
        secondary: 'border border-border-strong bg-surface text-fg hover:bg-surface-sunken shadow-sm',
        ghost: 'text-fg hover:bg-surface-sunken',
        danger: 'bg-danger text-surface hover:bg-danger-hover shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-label',
        md: 'h-9 px-4 text-body',
        lg: 'h-11 px-5 text-section',
        // Quadrati, per IconButton
        'icon-sm': 'h-8 w-8',
        'icon-md': 'h-9 w-9',
        'icon-lg': 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonOwnProps = VariantProps<typeof buttonVariants> & {
  /** Icona lucide mostrata prima del testo (20 px nei pulsanti, §14.6; 16 px nella taglia sm). */
  icon?: LucideIcon;
  /** Icona dopo il testo, ad esempio una freccia. */
  iconEnd?: LucideIcon;
  /** Mostra lo spinner e disabilita il pulsante finché l'azione è in corso. */
  loading?: boolean;
  children?: ReactNode;
};

export type ButtonProps = ButtonOwnProps & ComponentProps<'button'>;

function Content({ icon: Icon, iconEnd: IconEnd, loading, size, children }: ButtonOwnProps) {
  const iconSize = size === 'sm' || size === 'icon-sm' ? 16 : 20;
  return (
    <>
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin motion-reduce:animate-none" aria-hidden />
      ) : (
        Icon && <Icon size={iconSize} aria-hidden />
      )}
      {children}
      {IconEnd && !loading && <IconEnd size={iconSize} aria-hidden />}
    </>
  );
}

/** Pulsante con verbo e oggetto ("Rimborsa ordine", §15). Varianti primary, secondary, ghost, danger. */
export function Button({ variant, size, icon, iconEnd, loading, className, children, disabled, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <Content icon={icon} iconEnd={iconEnd} loading={loading} size={size}>
        {children}
      </Content>
    </button>
  );
}

export type ButtonLinkProps = ButtonOwnProps & ComponentProps<typeof Link>;

/** Link con l'aspetto di un pulsante, per la navigazione (mai un <button> che fa router.push). */
export function ButtonLink({ variant, size, icon, iconEnd, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size }), className)} {...props}>
      <Content icon={icon} iconEnd={iconEnd} size={size}>
        {children}
      </Content>
    </Link>
  );
}
