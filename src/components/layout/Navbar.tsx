'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import type { ResolvedNav } from '@/lib/public/nav';
import { isActiveHref } from '@/lib/public/nav';
import { MobileNavAccordion, NavDropdown } from './NavDropdown';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/scopri-gasperina', label: 'Scopri Gasperina' },
  { href: '/notizie', label: 'Notizie' },
  { href: '/eventi', label: 'Eventi' },
  // { href: '/assaggia-e-passeggia', label: 'Assaggia & Passeggia' },
  { href: '/media', label: 'Galleria' },
  { href: '/associazione', label: 'Chi Siamo' },
  { href: '/sponsor', label: 'Sponsor' },
  { href: '/contatti', label: 'Contatti' },
  // { href: '/progetti', label: 'Progetti' }, // nascosta temporaneamente
];

/**
 * `nav` arriva dal layout solo con il flag public_v2 acceso (menu da /admin/sito/navigazione, tendina Eventi).
 * Senza, il menu resta quello di sempre.
 */
export default function Navbar({ nav = null }: { nav?: ResolvedNav | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const pathname = usePathname();
  const links = nav ? nav.items : navLinks.map((l) => ({ ...l, children: [] }));
  const cta = nav ? nav.cta : { label: 'Iscriviti', href: '/iscriviti' };
  const current = (href: string) => (nav && pathname && isActiveHref(pathname, href) ? ('page' as const) : undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/scanner') || pathname?.startsWith('/cashier') || pathname?.startsWith('/cassa') || pathname?.startsWith('/assaggia-e-passeggia') || pathname === '/zuccaland/photo' || pathname === '/zuccaland/galleria' || pathname?.startsWith('/paga') || pathname?.startsWith('/acquista') || pathname?.startsWith('/i-miei-biglietti')) return null;

  // Not scrolled: subtle dark gradient → white text always readable (Netflix/Airbnb pattern).
  // Scrolled: solid colored bg → theme text.
  const navTextColor = !scrolled
    ? 'rgba(255,255,255,0.92)'
    : 'var(--color-heading)';

  const navBg = scrolled
    ? 'var(--color-surface)'
    : 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.0) 100%)';

  const navBrand = !scrolled ? '#ffffff' : 'var(--color-heading)';

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          background: navBg,
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled
            ? '1px solid var(--color-border)'
            : '1px solid transparent',
          padding: scrolled ? '0.6rem 2rem' : '1.2rem 2rem',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Image src="/img/Logo_color_sm.png" alt="Pro Loco Gasperina" width={44} height={44} style={{ objectFit: 'contain' }} />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold-600)', textTransform: 'uppercase' }}>Pro Loco</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: navBrand, letterSpacing: '0.03em' }}>Gasperina</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="desktop-nav">
            {links.map(link => link.children.length > 0 ? (
              <NavDropdown key={link.href} item={link} color={navTextColor} active={!!pathname && [link.href, ...link.children.map((c) => c.href)].some((h) => isActiveHref(pathname, h))} />
            ) : (
              <Link
                key={link.href}
                href={link.href}
                aria-current={current(link.href)}
                style={{
                  padding: '0.5rem 0.85rem',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  color: navTextColor,
                  borderRadius: 'var(--radius-full)',
                  transition: 'color 0.2s, background 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              id="theme-toggle"
              aria-label={theme === 'dark' ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
              title={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-full)',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)',
                background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                cursor: 'pointer',
                color: theme === 'dark' ? 'var(--gold-400)' : 'var(--blue-700)',
                transition: 'all 0.25s ease',
                flexShrink: 0,
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {cta && (
              <Link
                href={cta.href}
                className="btn btn-gold"
                style={{ padding: '0.55rem 1.2rem', fontSize: '0.82rem', display: 'none' }}
                id="nav-cta"
              >
                {cta.label}
              </Link>
            )}

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(m => !m)}
              className="hamburger"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: navBrand,
                padding: '0.4rem',
                display: 'none',
              }}
              aria-label="Menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          id="mobile-menu"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
            overflowY: 'auto',
            background: dark ? 'rgba(10,12,18,0.98)' : 'rgba(247,244,238,0.98)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: nav ? 'safe center' : 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {links.map((link, i) => link.children.length > 0 ? (
            <MobileNavAccordion key={link.href} item={link} onNavigate={() => setMenuOpen(false)} />
          ) : (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 6vw, 2.8rem)',
                fontWeight: 300,
                color: 'var(--color-heading)',
                padding: '0.3rem 1rem',
                transition: 'color 0.2s',
                animationDelay: `${i * 60}ms`,
              }}
              className="animate-fade-up"
            >
              {link.label}
            </Link>
          ))}
          {cta && (
            <Link href={cta.href} className="btn btn-gold" style={{ marginTop: '1.5rem' }} onClick={() => setMenuOpen(false)}>
              {nav ? cta.label : 'Iscriviti Ora'}
            </Link>
          )}
        </div>
      )}

    </>
  );
}
