'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard, Calendar, Users, ImageIcon,
  BarChart2, LogOut, Eye, FileText, ShoppingCart,
  Tag, CalendarCheck, QrCode, Wrench, Settings, Globe, X
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navGroups = [
  {
    label: 'Principale',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    label: 'Contenuti',
    items: [
      { href: '/admin/eventi', label: 'Eventi', icon: Calendar },
      { href: '/admin/notizie', label: 'Notizie', icon: FileText },
      { href: '/admin/media', label: 'Galleria', icon: ImageIcon },
      { href: '/admin/soci', label: 'Soci', icon: Users },
    ]
  },
  {
    label: 'Assaggia & Passeggia',
    items: [
      { href: '/admin/prenotazioni', label: 'Prenotazioni', icon: CalendarCheck },
      { href: '/admin/ordini', label: 'Ordini', icon: ShoppingCart },
      { href: '/admin/sconti', label: 'Sconti', icon: Tag },
    ]
  },
  {
    label: 'Pagine e CMS',
    items: [
      { href: '/admin/pagine/assaggia', label: 'A&P Landing', icon: Globe },
      { href: '/admin/pagine/sponsor', label: 'Sponsor', icon: Globe },
      { href: '/admin/pagine/associazione', label: 'Chi Siamo', icon: Globe },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/admin/impostazioni', label: 'Impostazioni', icon: Wrench },
    ]
  }
];

export default function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      <div 
        className={`admin-sidebar-mobile-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--neutral-800)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Image src="/img/Logo_color_sm.png" alt="Logo" width={36} height={36} style={{ objectFit: 'contain' }} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.55rem', color: 'var(--gold-500)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Pro Loco</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--color-heading)', fontWeight: 500 }}>Gasperina</div>
          </div>
        </div>
        {/* Mobile close button */}
        <button 
          onClick={onClose}
          style={{
            display: 'flex',
            background: 'transparent',
            border: 'none',
            color: 'var(--neutral-400)',
            cursor: 'pointer'
          }}
          className="md:hidden" /* Or just hide it via CSS, but let's use a simple inline style approach if standard CSS isn't present, actually we will rely on CSS */
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0' }}>
        {navGroups.map(group => (
          <div key={group.label} style={{ marginBottom: '0.75rem' }}>
            <div style={{
              padding: '0.5rem 0.85rem 0.25rem',
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--neutral-600)',
              fontFamily: 'var(--font-body)',
              fontWeight: 600
            }}>
              {group.label}
            </div>
            {group.items.map(item => {
              const Icon = item.icon;
              const active = isActive(item.href, (item as any).exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.88rem',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--color-heading)' : 'var(--neutral-400)',
                    background: active ? 'rgba(27,75,170,0.2)' : 'transparent',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                    borderLeft: active ? '2px solid var(--blue-700)' : '2px solid transparent',
                  }}
                >
                  <Icon size={15} style={{ color: active ? 'var(--blue-500)' : 'var(--neutral-500)' }} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--neutral-800)', display: 'flex', flexDirection: 'column', gap: '0.1rem', flexShrink: 0 }}>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
            border: 'none', cursor: 'pointer', background: 'transparent',
            color: 'var(--neutral-400)', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
            width: '100%', textAlign: 'left',
          }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          Tema: {theme === 'dark' ? 'Chiaro' : 'Scuro'}
        </button>
        <Link href="/admin/scanner" target="_blank" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
          color: 'var(--neutral-400)', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
          textDecoration: 'none',
        }}>
          <QrCode size={14} /> Scanner Biglietti
        </Link>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
          color: 'var(--neutral-400)', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
          textDecoration: 'none',
        }}>
          <Eye size={14} /> Visualizza sito
        </Link>
        <button
          onClick={() => { sessionStorage.removeItem('admin_auth'); window.location.reload(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
            border: 'none', cursor: 'pointer', background: 'transparent',
            color: 'var(--neutral-500)', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
            width: '100%', textAlign: 'left',
          }}
        >
          <LogOut size={14} /> Esci
        </button>
      </div>
    </aside>
    </>
  );
}
