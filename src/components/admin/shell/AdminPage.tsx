import type { ReactNode } from 'react';
import { cn } from '@/components/ui';

/** Contenitore delle pagine admin nuove: attiva il design system (.ui-root) e limita la larghezza. */
export function AdminPage({ children, wide, className }: { children: ReactNode; wide?: boolean; className?: string }) {
  return <div className={cn('ui-root mx-auto flex flex-col gap-4 bg-transparent', wide ? 'max-w-none' : 'max-w-6xl', className)}>{children}</div>;
}
