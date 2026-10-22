'use client';

import { CircleHelp } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, focusRing, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { helpFor } from '@/lib/admin-guide';

/** Pulsante "?" accanto al percorso: a cosa serve la pagina, in una riga, e il link alla guida. */
export function SectionHelp() {
  const help = helpFor(usePathname());
  if (!help) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn('inline-flex items-center gap-1 rounded text-label text-muted hover:text-fg', focusRing)} aria-label="Aiuto su questa pagina">
          <CircleHelp size={16} aria-hidden />
          <span className="hidden sm:inline">Aiuto</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-w-xs">
        <p className="text-body text-fg">{help.text}</p>
        <Link href={`/admin/guida#${help.guide}`} className={cn('mt-2 inline-block rounded text-label font-medium text-primary hover:underline', focusRing)}>
          Apri la guida agli eventi
        </Link>
      </PopoverContent>
    </Popover>
  );
}
