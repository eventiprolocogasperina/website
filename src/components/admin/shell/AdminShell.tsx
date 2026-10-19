'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { cn, focusRing, IconButton, Kbd, Toaster, TooltipProvider } from '@/components/ui';
import type { TodoCounts } from '@/server/admin/todo';
import { ACTIVE_STATUSES, type EditionSummary } from '@/server/domain/editions/types';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import { CommandPalette } from './CommandPalette';
import { EditionSwitcher } from './EditionSwitcher';
import { editionNav, findActive, ORG_NAV, type NavGroup } from './nav.config';
import { NotificationsBell } from './NotificationsBell';
import { Sidebar } from './Sidebar';
import { useShortcuts } from './useShortcuts';
import { UserMenu } from './UserMenu';

export type AdminShellProps = {
  editions: EditionSummary[];
  counts: TodoCounts;
  /** Ultima edizione scelta (cookie), usata fuori dal livello edizione. */
  cookieEdition: string | null;
  children: ReactNode;
};

function Brand() {
  return (
    <Link href="/admin" className={cn('flex min-w-0 items-center gap-2 rounded-lg', focusRing)} aria-label="Pro Loco Gasperina, panoramica dell'associazione">
      <Image src="/img/Logo_color_sm.png" alt="" width={28} height={28} className="h-7 w-7 shrink-0 object-contain" />
      <span className="hidden truncate text-body font-semibold text-fg sm:inline">Pro Loco Gasperina</span>
    </Link>
  );
}

/**
 * Shell dell'admin a due livelli (§10): barra in alto con selettore di edizione, ricerca, campanella
 * e menu utente; sidebar che cambia tra Associazione ed Edizione; cassetto su mobile.
 * Il contenuto (main) NON è dentro .ui-root: le pagine precedenti al rifacimento mantengono i loro stili,
 * le pagine nuove si avvolgono da sole in .ui-root (vedi AdminPage).
 */
export function AdminShell({ editions, counts, cookieEdition, children }: AdminShellProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const routeSlug = pathname.match(/^\/admin\/e\/([^/]+)/)?.[1] ?? null;
  const routeEdition = routeSlug ? editions.find((e) => e.slug === routeSlug) ?? null : null;
  const current =
    routeEdition ??
    editions.find((e) => e.slug === cookieEdition) ??
    editions.find((e) => ACTIVE_STATUSES.includes(e.status)) ??
    editions[0] ??
    null;

  const groups: NavGroup[] = routeEdition ? editionNav(routeEdition.slug, routeEdition.modules) : ORG_NAV;
  const currentEditionNav = useMemo(() => (current ? editionNav(current.slug, current.modules) : []), [current]);

  const crumbs: Crumb[] = useMemo(() => {
    const root: Crumb = routeEdition ? { label: routeEdition.title, href: `/admin/e/${routeEdition.slug}` } : { label: 'Pro Loco Gasperina', href: '/admin' };
    const found = findActive(groups, pathname);
    const out: Crumb[] = [root];
    if (found && found.item.href !== root.href) {
      if (found.group?.label && found.group.label !== found.item.label) out.push({ label: found.group.label });
      out.push({ label: found.item.label, href: found.item.href });
    }
    // Segmento finale oltre la voce di menu (es. il codice di un ordine).
    if (found && pathname.length > found.item.href.length + 1) {
      out.push({ label: decodeURIComponent(pathname.slice(found.item.href.length + 1).split('/')[0]) });
    }
    return out;
  }, [groups, pathname, routeEdition]);

  const goTo = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of [...ORG_NAV, ...currentEditionNav]) for (const i of g.items) if (i.shortcut) map[i.shortcut.split(' ')[1]] = i.href;
    return map;
  }, [currentEditionNav]);
  useShortcuts({ onOpenPalette: () => setPaletteOpen(true), goTo });

  const heading = routeEdition ? routeEdition.title : 'Associazione';
  const sidebar = (onNavigate?: () => void) => <Sidebar groups={groups} counts={counts} heading={heading} onNavigate={onNavigate} />;

  return (
    <TooltipProvider>
      <div className="admin-layout min-h-screen bg-bg">
        {/* Sidebar fissa da desktop */}
        <aside className="ui-root fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
          <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
            <Brand />
          </div>
          <div className="flex-1 overflow-y-auto">{sidebar()}</div>
        </aside>

        {/* Cassetto su mobile */}
        <RadixDialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <RadixDialog.Portal>
            <RadixDialog.Overlay className="fixed inset-0 z-50 bg-overlay lg:hidden" />
            <RadixDialog.Content aria-describedby={undefined} className="ui-root fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col border-r border-border bg-surface shadow-lg outline-none lg:hidden">
              <RadixDialog.Title className="sr-only">Menu</RadixDialog.Title>
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                <Brand />
                <RadixDialog.Close asChild>
                  <IconButton icon={X} label="Chiudi menu" tooltip={false} />
                </RadixDialog.Close>
              </div>
              <div className="border-b border-border p-3">
                <EditionSwitcher editions={editions} current={current} inEdition={!!routeEdition} className="w-full justify-between" />
              </div>
              <div className="flex-1 overflow-y-auto">{sidebar(() => setDrawerOpen(false))}</div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>

        {/* Barra in alto */}
        <header className="ui-root sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur sm:px-4">
          <IconButton icon={Menu} label="Apri menu" className="lg:hidden" onClick={() => setDrawerOpen(true)} tooltip={false} />
          <div className="lg:hidden">
            <Brand />
          </div>
          <EditionSwitcher editions={editions} current={current} inEdition={!!routeEdition} className="max-w-[45vw] sm:max-w-xs" />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={cn(
              'ml-auto hidden h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 text-body text-subtle hover:border-border-strong md:flex',
              focusRing,
            )}
          >
            <Search size={16} aria-hidden />
            <span className="flex-1 truncate text-left">Cerca ordini, pagine, edizioni…</span>
            <Kbd>⌘K</Kbd>
          </button>
          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <IconButton icon={Search} label="Cerca (⌘K)" className="md:hidden" onClick={() => setPaletteOpen(true)} />
            <NotificationsBell counts={counts} />
            <IconButton icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'} onClick={toggleTheme} className="hidden sm:inline-flex" />
            <UserMenu />
          </div>
        </header>

        <div className="ui-root bg-transparent px-4 pt-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={crumbs} />
        </div>
        <main id="contenuto" className="admin-main">
          {children}
        </main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        editions={editions}
        currentEdition={current}
        navGroups={[{ title: 'Associazione', groups: ORG_NAV }, ...(current ? [{ title: current.title, groups: currentEditionNav }] : [])]}
      />
      <Toaster />
    </TooltipProvider>
  );
}
