'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants, cn, focusRing, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import type { TodoCounts } from '@/server/admin/todo';
import { todoRows } from './todo-rows';

/** Campanella della barra in alto: per ora rimborsi e foto (conteggio) più gli ordini in attesa. */
export function NotificationsBell({ counts }: { counts: TodoCounts }) {
  const total = counts.refunds + counts.photos;
  const rows = todoRows(counts).filter((r) => r.count > 0);
  return (
    <Popover>
      <PopoverTrigger aria-label={total > 0 ? `Da fare: ${total}` : 'Da fare'} className={cn(buttonVariants({ variant: 'ghost', size: 'icon-md' }), 'relative')}>
        <Bell size={20} aria-hidden />
        {total > 0 && (
          <span aria-hidden className="pointer-events-none absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 font-semibold text-surface tabular-nums">
            {total}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 text-section font-semibold">Da fare</div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-body text-muted">Niente da fare. Ottimo lavoro.</p>
        ) : (
          <ul className="p-1">
            {rows.map(({ key, icon: Icon, count, text, href }) => (
              <li key={key}>
                <Link href={href} className={cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-body hover:bg-surface-sunken', focusRing)}>
                  <Icon size={16} aria-hidden className="text-muted" />
                  <span className="flex-1">{text(count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
