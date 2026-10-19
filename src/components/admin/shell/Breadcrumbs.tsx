import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn, focusRing } from '@/components/ui';

export type Crumb = { label: string; href?: string };

/** Percorso della pagina: "Zuccaland 2026 › Ordini › ZK26-7F3K" (§10.2). */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Percorso" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-label text-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {c.href && !last ? (
                <Link href={c.href} className={cn('rounded hover:text-fg hover:underline', focusRing)}>
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={last ? 'text-fg' : undefined}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight size={14} aria-hidden className="text-subtle" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
