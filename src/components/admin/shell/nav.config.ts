import {
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
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
};

export type NavGroup = { label?: string; items: NavItem[] };

/** Sidebar del livello Associazione (§10.3). */
export const ORG_NAV: NavGroup[] = [
  { items: [{ label: 'Panoramica', href: '/admin', icon: Home, exact: true, shortcut: 'g d', keywords: ['dashboard', 'home'] }] },
  {
    label: 'Edizioni',
    items: [
      { label: 'Edizioni', href: '/admin/edizioni', icon: CalendarDays, shortcut: 'g e', keywords: ['eventi', 'calendario'] },
      { label: 'Format', href: '/admin/format', icon: Layers },
    ],
  },
  {
    label: 'Vendite',
    items: [
      { label: 'Ordini', href: '/admin/ordini', icon: Receipt, shortcut: 'g o', keywords: ['biglietti', 'vendite'] },
      { label: 'Rimborsi', href: '/admin/rimborsi', icon: Undo2, badge: 'refunds', shortcut: 'g r' },
      { label: 'Sconti', href: '/admin/sconti', icon: Tag, keywords: ['codici', 'promo'] },
    ],
  },
  { label: 'Clienti', items: [{ label: 'Clienti', href: '/admin/clienti', icon: User }] },
  { label: 'Associazione', items: [{ label: 'Soci', href: '/admin/soci', icon: Users, keywords: ['iscritti', 'quote'] }] },
  {
    label: 'Sito',
    items: [
      { label: 'Notizie', href: '/admin/sito/notizie', icon: Newspaper },
      { label: 'Galleria', href: '/admin/sito/galleria', icon: ImageIcon, keywords: ['media', 'foto'] },
      { label: 'Pagine', href: '/admin/sito/pagine', icon: FileText, keywords: ['chi siamo', 'associazione'] },
      { label: 'Sponsor', href: '/admin/sito/sponsor', icon: Globe },
      { label: 'Trasparenza', href: '/admin/sito/trasparenza', icon: ShieldCheck, keywords: ['privacy', 'dati'] },
      { label: 'Navigazione', href: '/admin/sito/navigazione', icon: MenuIcon, keywords: ['menu', 'footer'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Utenti', href: '/admin/sistema/utenti', icon: Users, keywords: ['operatori', 'ruoli', 'pin', 'dispositivi'] },
      { label: 'Pagamenti', href: '/admin/sistema/pagamenti', icon: CreditCard, keywords: ['nexi'] },
      { label: 'Email', href: '/admin/sistema/email', icon: Mail, keywords: ['modelli', 'anteprima'] },
      { label: 'Notifiche', href: '/admin/sistema/notifiche', icon: Bell, keywords: ['telegram', 'whatsapp'] },
      { label: 'Impostazioni', href: '/admin/sistema/impostazioni', icon: Settings, shortcut: 'g i' },
      { label: 'Registro attività', href: '/admin/sistema/registro', icon: History, keywords: ['log', 'audit'] },
      { label: 'Design system', href: '/admin/_ui', icon: Palette, keywords: ['componenti'] },
    ],
  },
];

const MODULE_NAV: Record<EditionModule, { label: string; icon: LucideIcon; badge?: NavBadgeKey }> = {
  invites: { label: 'Inviti', icon: Send },
  'visitor-photos': { label: 'Foto dei visitatori', icon: Camera, badge: 'photos' },
  reviews: { label: 'Recensioni', icon: Star },
};

export const MODULE_LABELS: Record<EditionModule, string> = Object.fromEntries(
  Object.entries(MODULE_NAV).map(([k, v]) => [k, v.label]),
) as Record<EditionModule, string>;

/** Sidebar del livello Edizione (§10.3), con una voce per ogni modulo attivo. */
export function editionNav(slug: string, modules: EditionModule[]): NavGroup[] {
  const base = `/admin/e/${slug}`;
  const groups: NavGroup[] = [
    {
      items: [
        { label: 'Panoramica', href: base, icon: Home, exact: true },
        { label: 'Date e capienze', href: `${base}/date`, icon: CalendarDays, keywords: ['sessioni', 'quote'] },
        { label: 'Catalogo', href: `${base}/catalogo`, icon: Ticket, keywords: ['prodotti', 'prezzi'] },
      ],
    },
    {
      label: 'Vendite',
      items: [
        { label: 'Ordini', href: `${base}/ordini`, icon: Receipt },
        { label: 'Partecipanti', href: `${base}/partecipanti`, icon: ClipboardList, keywords: ['prenotazioni'] },
        { label: 'Check-in', href: `${base}/check-in`, icon: ScanLine, keywords: ['scanner', 'ingressi'] },
        { label: 'Cassa', href: `${base}/cassa`, icon: Store, shortcut: 'g c', keywords: ['pos', 'stand'] },
        { label: 'Rimborsi', href: `${base}/rimborsi`, icon: Undo2 },
        { label: 'Statistiche', href: `${base}/statistiche`, icon: BarChart3, keywords: ['analytics'] },
      ],
    },
    { label: 'Sito', items: [{ label: 'Pagina pubblica', href: `${base}/pagina`, icon: LayoutTemplate, keywords: ['cms', 'landing'] }] },
  ];
  if (modules.length > 0) {
    groups.push({
      label: 'Moduli',
      items: modules.map((m) => ({ ...MODULE_NAV[m], href: `${base}/m/${m}` })),
    });
  }
  groups.push({ items: [{ label: 'Impostazioni', href: `${base}/impostazioni`, icon: Settings }] });
  return groups;
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
