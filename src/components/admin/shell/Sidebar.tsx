'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, focusRing } from '@/components/ui';
import type { TodoCounts } from '@/server/admin/todo';
import { isActive, type NavGroup } from './nav.config';

export type SidebarProps = {
  groups: NavGroup[];
  counts: TodoCounts;
  /** Titolo sopra le voci: "Associazione" o il nome dell'edizione. */
  heading: React.ReactNode;
  /** Chiamata dopo un clic su una voce (chiude il cassetto su mobile). */
  onNavigate?: () => void;
};

/** Voci della sidebar, generate da nav.config.ts. Cambia col livello (Associazione o Edizione). */
export function Sidebar({ groups, counts, heading, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu principale" className="flex flex-col gap-4 px-3 py-4">
      <div className="px-2 text-caption font-medium tracking-wide text-muted uppercase">{heading}</div>
      {groups.map((group, i) => (
        <div key={group.label ?? i} className="flex flex-col gap-0.5">
          {group.label && <div className="px-2 pb-1 text-caption text-subtle">{group.label}</div>}
          {group.items.map((item) => {
            const active = isActive(item, pathname);
            const Icon = item.icon;
            const badge = item.badge ? counts[item.badge] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-9 items-center gap-2.5 rounded-lg px-2 text-body transition-colors duration-150',
                  active ? 'bg-surface-sunken font-medium text-fg' : 'text-muted hover:bg-surface-sunken hover:text-fg',
                  focusRing,
                )}
              >
                <Icon size={20} aria-hidden className={active ? 'text-primary' : undefined} />
                <span className="flex-1 truncate">{item.label}</span>
                {badge > 0 && (
                  <span className="rounded-full bg-danger-bg px-1.5 text-caption font-medium text-danger tabular-nums" aria-label={`${badge} da gestire`}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
