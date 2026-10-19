import {
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  ChefHat,
  Link2,
  Map as MapIcon,
  Megaphone,
  ClipboardList,
  CreditCard,
  FileText,
  Globe,
  History,
  Home,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Mail,
  Menu as MenuIcon,
  Newspaper,
  Palette,
  Receipt,
  ScanLine,
  Send,
  Settings,
  ShieldCheck,
  Star,
  Store,
  Tag,
  Ticket,
  Undo2,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/server/auth/permissions';
import { MODULES } from '@/modules/registry';
import type { EditionModule as EditionModuleDef } from '@/modules/types';
import type { EditionModule } from '@/server/domain/editions/types';

/** Conteggi che possono comparire accanto a una voce (dalla campanella). */
export type NavBadgeKey = 'refunds' | 'photos';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** true se la voce è attiva solo sull'URL esatto (le panoramiche). */
  exact?: boolean;
  badge?: NavBadgeKey;
  /** Sequenza "g x" per raggiungerla da tastiera (§11.7). */
  shortcut?: string;
  /** Parole in più per la ricerca nella palette ⌘K. */
  keywords?: string[];
  /** Permessi (ne basta uno) per vedere la voce. Senza, la vedono tutti. */
  permission?: Permission | Permission[];
};

export type NavGroup = { label?: string; items: NavItem[] };

/** Sidebar del livello Associazione (§10.3). */
export const ORG_NAV: NavGroup[] = [
  { items: [{ label: 'Panoramica', href: '/admin', icon: Home, exact: true, shortcut: 'g d', keywords: ['dashboard', 'home'] }] },
  {
    label: 'Edizioni',
    items: [
      { label: 'Edizioni', href: '/admin/edizioni', permission: 'editions.edit', icon: CalendarDays, shortcut: 'g e', keywords: ['eventi', 'calendario'] },
      { label: 'Format', href: '/admin/format', permission: 'editions.create', icon: Layers },
    ],
  },
  {
    label: 'Vendite',
    items: [
      { label: 'Ordini', href: '/admin/ordini', permission: 'orders.read', icon: Receipt, shortcut: 'g o', keywords: ['biglietti', 'vendite'] },
      { label: 'Rimborsi', href: '/admin/rimborsi', permission: 'orders.read', icon: Undo2, badge: 'refunds', shortcut: 'g r' },
      { label: 'Sconti', href: '/admin/sconti', permission: 'catalog.edit', icon: Tag, keywords: ['codici', 'promo'] },
    ],
  },
  { label: 'Clienti', items: [{ label: 'Clienti', href: '/admin/clienti', permission: 'customers.read', icon: User }] },
  { label: 'Associazione', items: [{ label: 'Soci', href: '/admin/soci', permission: 'members.manage', icon: Users, keywords: ['iscritti', 'quote'] }] },
  {
    label: 'Sito',
    items: [
      { label: 'Notizie', href: '/admin/sito/notizie', permission: 'content.edit', icon: Newspaper },
      { label: 'Galleria', href: '/admin/sito/galleria', permission: 'content.edit', icon: ImageIcon, keywords: ['media', 'foto'] },
      { label: 'Pagine', href: '/admin/sito/pagine', permission: 'content.edit', icon: FileText, keywords: ['chi siamo', 'associazione'] },
      { label: 'Sponsor', href: '/admin/sito/sponsor', permission: 'content.edit', icon: Globe },
      { label: 'Trasparenza', href: '/admin/sito/trasparenza', permission: 'content.edit', icon: ShieldCheck, keywords: ['privacy', 'dati'] },
      { label: 'Navigazione', href: '/admin/sito/navigazione', permission: 'content.edit', icon: MenuIcon, keywords: ['menu', 'footer'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Utenti', href: '/admin/sistema/utenti', permission: ['users.manage', 'settings.manage'], icon: Users, keywords: ['operatori', 'ruoli', 'pin', 'dispositivi'] },
      { label: 'Pagamenti', href: '/admin/sistema/pagamenti', permission: 'settings.payments', icon: CreditCard, keywords: ['nexi'] },
      { label: 'Email', href: '/admin/sistema/email', permission: 'settings.manage', icon: Mail, keywords: ['modelli', 'anteprima'] },
      { label: 'Notifiche', href: '/admin/sistema/notifiche', permission: 'settings.manage', icon: Bell, keywords: ['telegram', 'whatsapp'] },
      { label: 'Impostazioni', href: '/admin/sistema/impostazioni', permission: 'settings.manage', icon: Settings, shortcut: 'g i' },
      { label: 'Registro attività', href: '/admin/sistema/registro', permission: 'audit.read', icon: History, keywords: ['log', 'audit'] },
      { label: 'Design system', href: '/admin/_ui', icon: Palette, keywords: ['componenti'] },
    ],
  },
];

const MODULE_ICONS: Record<NonNullable<NonNullable<EditionModuleDef['admin']>['nav']>['icon'], LucideIcon> = {
  send: Send,
  camera: Camera,
  star: Star,
  link: Link2,
  megaphone: Megaphone,
  map: MapIcon,
  chef: ChefHat,
};

const MODULE_NAV = Object.fromEntries(
  MODULES.flatMap((m) => (m.admin?.nav ? [[m.key, { label: m.admin.nav.label, icon: MODULE_ICONS[m.admin.nav.icon], badge: m.admin.nav.badge as NavBadgeKey | undefined, permission: m.admin.nav.permission }]] : [])),
) as Record<EditionModule, { label: string; icon: LucideIcon; badge?: NavBadgeKey; permission: Permission }>;

/** Permesso per aprire la pagina di un modulo. */
export const MODULE_PERMISSIONS = Object.fromEntries(Object.entries(MODULE_NAV).map(([k, v]) => [k, v.permission])) as Record<EditionModule, Permission>;

export const MODULE_LABELS: Record<EditionModule, string> = Object.fromEntries(Object.entries(MODULE_NAV).map(([k, v]) => [k, v.label])) as Record<EditionModule, string>;

/** Sidebar del livello Edizione (§10.3), con una voce per ogni modulo attivo. */
export function editionNav(slug: string, modules: EditionModule[]): NavGroup[] {
  const base = `/admin/e/${slug}`;
  const groups: NavGroup[] = [
    {
      items: [
        { label: 'Panoramica', href: base, icon: Home, exact: true },
        { label: 'Date e capienze', href: `${base}/date`, permission: 'catalog.edit', icon: CalendarDays, keywords: ['sessioni', 'quote'] },
        { label: 'Catalogo', href: `${base}/catalogo`, permission: 'catalog.edit', icon: Ticket, keywords: ['prodotti', 'prezzi'] },
      ],
    },
    {
      label: 'Vendite',
      items: [
        { label: 'Ordini', href: `${base}/ordini`, permission: 'orders.read', icon: Receipt },
        { label: 'Partecipanti', href: `${base}/partecipanti`, permission: 'orders.read', icon: ClipboardList, keywords: ['prenotazioni'] },
        { label: 'Check-in', href: `${base}/check-in`, permission: 'checkin.scan', icon: ScanLine, keywords: ['scanner', 'ingressi'] },
        { label: 'Cassa', href: `${base}/cassa`, permission: 'catalog.edit', icon: Store, shortcut: 'g c', keywords: ['pos', 'stand'] },
        { label: 'Rimborsi', href: `${base}/rimborsi`, permission: 'orders.read', icon: Undo2 },
        { label: 'Statistiche', href: `${base}/statistiche`, permission: 'orders.read', icon: BarChart3, keywords: ['analytics'] },
      ],
    },
    { label: 'Sito', items: [{ label: 'Pagina pubblica', href: `${base}/pagina`, permission: 'editions.edit', icon: LayoutTemplate, keywords: ['cms', 'landing'] }] },
  ];
  if (modules.length > 0) {
    groups.push({
      label: 'Moduli',
      items: modules.filter((m) => MODULE_NAV[m]).map((m) => ({ ...MODULE_NAV[m], href: `${base}/m/${m}` })),
    });
  }
  groups.push({ items: [{ label: 'Impostazioni', href: `${base}/impostazioni`, permission: 'editions.edit', icon: Settings }] });
  return groups;
}

/** Tiene solo le voci permesse (e i gruppi che restano con almeno una voce). */
export function filterNav(groups: NavGroup[], allowed: readonly Permission[]): NavGroup[] {
  const ok = (item: NavItem) => !item.permission || (Array.isArray(item.permission) ? item.permission : [item.permission]).some((p) => allowed.includes(p));
  return groups.map((g) => ({ ...g, items: g.items.filter(ok) })).filter((g) => g.items.length > 0);
}

export function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Trova la voce più specifica che corrisponde all'URL (per breadcrumb e titolo). */
export function findActive(groups: NavGroup[], pathname: string): { group?: NavGroup; item: NavItem } | null {
  let best: { group?: NavGroup; item: NavItem } | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      if (isActive(item, pathname) && (!best || item.href.length > best.item.href.length)) best = { group, item };
    }
  }
  return best;
}
