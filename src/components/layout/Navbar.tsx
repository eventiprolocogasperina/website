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
  { href: '/progetti', label: 'Progetti' },
  { href: '/media', label: 'Galleria' },
  { href: '/associazione', label: 'Chi Siamo' },
  { href: '/sponsor', label: 'Sponsor' },
  { href: '/contatti', label: 'Contatti' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const pathname = usePathname();

  // Persist theme across sessions
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
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

  // Not scrolled → transparent navbar over dark photo hero (ALL pages) → white text.
  // Scrolled → colored navbar bg → use theme text.
  const navTextColor = !scrolled
    ? 'rgba(255,255,255,0.9)'
    : dark ? 'rgba(255,255,255,0.82)' : 'rgba(25,20,15,0.85)';

  const scrolledBg = dark
    ? 'rgba(10,12,18,0.92)'
    : 'rgba(247,244,238,0.95)';

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
          background: scrolled ? scrolledBg : 'transparent',
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
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: !scrolled ? '#ffffff' : dark ? '#ffffff' : '#1a1410', letterSpacing: '0.03em' }}>Gasperina</div>
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

            <Link
              href="/admin"
              style={{
                padding: '0.5rem 1rem',
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: dark ? 'rgba(255,255,255,0.45)' : 'rgba(30,25,20,0.45)',
                border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
                borderRadius: 'var(--radius-full)',
                transition: 'all 0.2s',
              }}
            >
              Admin
            </Link>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(m => !m)}
              className="hamburger"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: !scrolled ? '#ffffff' : dark ? '#ffffff' : '#1a1410',
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
