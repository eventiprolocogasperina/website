'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, Sun, Moon } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/scopri-gasperina', label: 'Scopri Gasperina' },
  { href: '/eventi', label: 'Eventi' },
  { href: '/media', label: 'Galleria' },
  { href: '/associazione', label: 'Chi Siamo' },
  { href: '/sponsor', label: 'Sponsor' },
  { href: '/contatti', label: 'Contatti' },
  // { href: '/progetti', label: 'Progetti' }, // nascosta temporaneamente
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const pathname = usePathname();

  // Light mode is the default (:root CSS). Only apply dark if user explicitly chose it.
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      // Ensure light mode: remove any stale dark attribute
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/admin')) return null;

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  };

  // Not scrolled: subtle dark gradient → white text always readable (Netflix/Airbnb pattern).
  // Scrolled: solid colored bg → theme text.
  const navTextColor = !scrolled
    ? 'rgba(255,255,255,0.92)'
    : dark ? 'rgba(255,255,255,0.85)' : 'rgba(20,15,10,0.88)';

  const navBg = scrolled
    ? dark ? 'rgba(10,12,18,0.94)' : 'rgba(247,244,238,0.96)'
    : 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.0) 100%)';

  const navBrand = !scrolled ? '#ffffff' : dark ? '#ffffff' : '#1a1410';

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
            ? dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)'
            : '1px solid transparent',
          padding: scrolled ? '0.6rem 2rem' : '1.2rem 2rem',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Image src="/img/Logo_color.png" alt="Pro Loco Gasperina" width={44} height={44} style={{ objectFit: 'contain' }} />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--gold-600)', textTransform: 'uppercase' }}>Pro Loco</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: navBrand, letterSpacing: '0.03em' }}>Gasperina</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="desktop-nav">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
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
              aria-label={dark ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
              title={dark ? 'Modalità chiara' : 'Modalità scura'}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-full)',
                border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.12)',
                background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                cursor: 'pointer',
                color: dark ? 'var(--gold-400)' : 'var(--blue-700)',
                transition: 'all 0.25s ease',
                flexShrink: 0,
              }}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <Link
              href="/iscriviti"
              className="btn btn-gold"
              style={{ padding: '0.55rem 1.2rem', fontSize: '0.82rem', display: 'none' }}
              id="nav-cta"
            >
              Iscriviti
            </Link>

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
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
            background: dark ? 'rgba(10,12,18,0.98)' : 'rgba(247,244,238,0.98)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {navLinks.map((link, i) => (
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
          <Link href="/iscriviti" className="btn btn-gold" style={{ marginTop: '1.5rem' }} onClick={() => setMenuOpen(false)}>
            Iscriviti Ora
          </Link>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
        }
        @media (min-width: 901px) {
          #nav-cta { display: inline-flex !important; }
        }
      `}</style>
    </>
  );
}
