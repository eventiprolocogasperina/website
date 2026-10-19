'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { CalendarDays, Loader2, Moon, Receipt, ScanLine, Search, Store, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { Kbd, StatusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { formatMoney, toCents } from '@/lib/money';
import type { OrderSearchResult } from '@/server/admin/search';
import type { EditionSummary } from '@/server/domain/editions/types';
import { EditionDot } from './EditionDot';
import type { NavGroup } from './nav.config';

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Voci di menu raggiungibili (Associazione + edizione corrente). */
  navGroups: { title: string; groups: NavGroup[] }[];
  editions: EditionSummary[];
  currentEdition: EditionSummary | null;
};

const itemClass =
  'flex min-h-10 cursor-default items-center gap-3 rounded-md px-3 py-1.5 text-body text-fg outline-none select-none data-[selected=true]:bg-surface-sunken';
const groupClass =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted';

function Item({ value, onSelect, icon, children, end }: { value: string; onSelect: () => void; icon?: ReactNode; children: ReactNode; end?: ReactNode }) {
  return (
    <Command.Item value={value} onSelect={onSelect} className={itemClass}>
      <span className="flex w-4 shrink-0 justify-center text-muted">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {end}
    </Command.Item>
  );
}

/** Ricerca globale ⌘K (§10.2): ordini, voci di menu, edizioni e comandi rapidi. */
export function CommandPalette({ open, onOpenChange, navGroups, editions, currentEdition }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<OrderSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  // Ricerca ordini sul server, 250 ms dopo l'ultima battitura.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      setSearchError(false);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        setOrders((await res.json()).orders ?? []);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setSearchError(true);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setQuery('');
      setOrders([]);
    }
  };
  const go = (href: string) => {
    close(false);
    router.push(href);
  };
  const showOrders = query.trim().length >= 2;

  return (
    <RadixDialog.Root open={open} onOpenChange={close}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="ui-root fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-lg outline-none"
        >
          <RadixDialog.Title className="sr-only">Cerca nell&apos;admin</RadixDialog.Title>
          <Command loop label="Cerca nell'admin">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search size={16} aria-hidden className="text-muted" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder="Cerca ordini, pagine, edizioni o comandi…"
                className="h-12 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-subtle"
              />
              {searching && <Loader2 size={16} aria-hidden className="animate-spin text-muted motion-reduce:animate-none" />}
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="max-h-[60vh] overflow-y-auto p-1">
              <Command.Empty className="px-3 py-8 text-center text-body text-muted">
                {searching ? 'Cerco…' : 'Nessun risultato'}
              </Command.Empty>

              {showOrders && (orders.length > 0 || searchError) && (
                <Command.Group heading="Ordini" className={groupClass}>
                  {searchError && (
                    <Command.Item value={`${query} errore`} disabled className={itemClass}>
                      <span className="text-danger">Ricerca ordini non riuscita. Riprova.</span>
                    </Command.Item>
                  )}
                  {orders.map((o) => (
                    <Item
                      key={o.id}
                      // Il testo cercato fa parte del valore: il filtro di cmdk non nasconde i risultati del server.
                      value={`${query} ${o.id} ${o.buyerName} ${o.buyerEmail}`}
                      onSelect={() => go(`/admin/ordini?q=${encodeURIComponent(o.id)}`)}
                      icon={<Receipt size={16} aria-hidden />}
                      end={
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-label tabular-nums text-muted">{formatMoney(toCents(o.totalAmount))}</span>
                          <StatusBadge status={o.status.toLowerCase()} />
                        </span>
                      }
                    >
                      <span className="block truncate">{o.buyerName}</span>
                      <span className="block truncate text-caption text-muted">
                        {o.id.slice(0, 10)}… · {o.buyerEmail}
                        {o.createdAt ? ` · ${formatDateTime(o.createdAt)}` : ''}
                      </span>
                    </Item>
                  ))}
                </Command.Group>
              )}

              <Command.Group heading="Comandi" className={groupClass}>
                {currentEdition && (
                  <Item value={`apri cassa ${currentEdition.title}`} onSelect={() => go(`/admin/e/${currentEdition.slug}/cassa`)} icon={<Store size={16} aria-hidden />}>
                    Apri cassa · {currentEdition.title}
                  </Item>
                )}
                <Item value="apri scanner check-in ingressi" onSelect={() => go('/scanner')} icon={<ScanLine size={16} aria-hidden />}>
                  Apri scanner
                </Item>
                <Item value="cambia tema chiaro scuro" onSelect={() => { toggleTheme(); close(false); }} icon={theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}>
                  {theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
                </Item>
              </Command.Group>

              {navGroups.map(({ title, groups }) => (
                <Command.Group key={title} heading={`Vai a · ${title}`} className={groupClass}>
                  {groups.flatMap((g) =>
                    g.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Item
                          key={item.href}
                          value={`vai a ${title} ${g.label ?? ''} ${item.label} ${(item.keywords ?? []).join(' ')}`}
                          onSelect={() => go(item.href)}
                          icon={<Icon size={16} aria-hidden />}
                          end={item.shortcut ? <span className="flex gap-1">{item.shortcut.split(' ').map((k) => <Kbd key={k}>{k}</Kbd>)}</span> : undefined}
                        >
                          {g.label && g.label !== item.label ? <span className="text-muted">{g.label} › </span> : null}
                          {item.label}
                        </Item>
                      );
                    }),
                  )}
                </Command.Group>
              ))}

              <Command.Group heading="Edizioni" className={groupClass}>
                {editions.map((e) => (
                  <Item key={e.slug} value={`edizione ${e.title} ${e.slug}`} onSelect={() => go(`/admin/e/${e.slug}`)} icon={<EditionDot dot={e.dot} />} end={<StatusBadge status={e.status} />}>
                    <span className="flex items-center gap-2">
                      <CalendarDays size={14} aria-hidden className="text-subtle" />
                      {e.title}
                    </span>
                  </Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
