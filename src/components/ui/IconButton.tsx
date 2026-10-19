'use client';

import type { LucideIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { buttonVariants } from './Button';
import { cn } from './cn';
import { Tooltip } from './Tooltip';

export type IconButtonProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** Icona lucide. */
  icon: LucideIcon;
  /** Obbligatoria: diventa aria-label e il testo del suggerimento (§14.7). */
  label: string;
  variant?: 'secondary' | 'ghost' | 'danger' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  /** false per non mostrare il suggerimento (l'etichetta resta per i lettori di schermo). */
  tooltip?: boolean;
};

/** Pulsante con sola icona. L'etichetta è obbligatoria. */
export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'md', tooltip = true, className, type = 'button', ...props }: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      className={cn(buttonVariants({ variant, size: `icon-${size}` }), className)}
      {...props}
    >
      <Icon size={size === 'sm' ? 16 : 20} aria-hidden />
    </button>
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
}
