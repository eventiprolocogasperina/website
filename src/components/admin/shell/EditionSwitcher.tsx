'use client';

import { Command } from 'cmdk';
import { Check, ChevronsUpDown, List, Plus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn, focusRing, Popover, PopoverContent, PopoverTrigger, StatusBadge } from '@/components/ui';
import { ACTIVE_STATUSES, type EditionSummary } from '@/server/domain/editions/types';
import { EditionDot } from './EditionDot';

export type EditionSwitcherProps = {
  editions: EditionSummary[];
  /** Edizione mostrata nel pulsante (quella dell'URL o, fuori dal livello edizione, quella del cookie). */
  current: EditionSummary | null;
  /** true quando si è dentro /admin/e/…: il pulsante appare "attivo". */
  inEdition: boolean;
  className?: string;
};

/** Selettore di edizione nella barra in alto (§10.2). La scelta è salvata in un cookie da src/proxy.ts. */
export function EditionSwitcher({ editions, current, inEdition, className }: EditionSwitcherProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const active = editions.filter((e) => ACTIVE_STATUSES.includes(e.status));
  const others = editions.filter((e) => !ACTIVE_STATUSES.includes(e.status));

  function go(target: EditionSummary) {
    setOpen(false);
    // Se sei già in una sezione dell'edizione (es. Cassa), resta nella stessa sezione.
    const m = pathname.match(/^\/admin\/e\/[^/]+(\/(?!m\/)[^/]+)?/);
    const section = inEdition && m?.[1] ? m[1] : '';
    router.push(`/admin/e/${target.slug}${section}`);
  }

  const item = (e: EditionSummary) => (
    <Command.Item
      key={e.slug}
      value={`${e.title} ${e.slug}`}
      onSelect={() => go(e)}
      className="flex h-10 cursor-default items-center gap-2 rounded-md px-2.5 text-body outline-none select-none data-[selected=true]:bg-surface-sunken"
    >
      <EditionDot dot={e.dot} />
      <span className="min-w-0 flex-1 truncate">{e.title}</span>
      <StatusBadge status={e.status} />
      <Check size={16} aria-hidden className={cn('shrink-0', current?.slug === e.slug ? 'opacity-100' : 'opacity-0')} />
    </Command.Item>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'inline-flex h-9 max-w-full min-w-0 items-center gap-2 rounded-lg border px-3 text-body',
          inEdition ? 'border-border-strong bg-surface font-medium text-fg' : 'border-border bg-surface-sunken text-muted',
          focusRing,
          className,
        )}
        aria-label="Cambia edizione"
      >
        {current ? (
          <>
            <EditionDot dot={current.dot} />
            <span className="truncate">{current.title}</span>
          </>
        ) : (
          <span>Scegli edizione</span>
        )}
        <ChevronsUpDown size={16} aria-hidden className="shrink-0 text-muted" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <Command loop>
          <Command.Input
            placeholder="Cerca edizione…"
            className="h-10 w-full border-b border-border bg-transparent px-3 text-body text-fg outline-none placeholder:text-subtle"
          />
          <Command.List className="max-h-80 overflow-y-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-label text-muted">Nessuna edizione</Command.Empty>
            {active.length > 0 && (
              <Command.Group heading="Attive" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-muted">
                {active.map(item)}
              </Command.Group>
            )}
            {others.length > 0 && (
              <Command.Group heading="Altre edizioni" className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-muted">
                {others.map(item)}
              </Command.Group>
            )}
            <Command.Separator className="my-1 h-px bg-border" />
            <Command.Item
              value="tutte le edizioni"
              onSelect={() => {
                setOpen(false);
                router.push('/admin/edizioni');
              }}
              className="flex h-9 cursor-default items-center gap-2 rounded-md px-2.5 text-body outline-none data-[selected=true]:bg-surface-sunken"
            >
              <List size={16} aria-hidden className="text-muted" />
              Tutte le edizioni…
            </Command.Item>
            <Command.Item
              value="nuova edizione"
              onSelect={() => {
                setOpen(false);
                router.push('/admin/edizioni');
              }}
              className="flex h-9 cursor-default items-center gap-2 rounded-md px-2.5 text-body text-primary outline-none data-[selected=true]:bg-surface-sunken"
            >
              <Plus size={16} aria-hidden />
              Nuova edizione
            </Command.Item>
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
