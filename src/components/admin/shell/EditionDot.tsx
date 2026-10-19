import { cn } from '@/components/ui';
import type { EditionSummary } from '@/server/domain/editions/types';

const DOT: Record<EditionSummary['dot'], string> = {
  orange: 'bg-warning',
  blue: 'bg-primary',
  gold: 'bg-accent',
  gray: 'bg-subtle',
};

/** Pallino colorato del format: l'unico richiamo ai temi dei format nell'admin (§14.3). */
export function EditionDot({ dot, className }: { dot: EditionSummary['dot']; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-2 w-2 shrink-0 rounded-full', DOT[dot], className)} />;
}
