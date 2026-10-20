'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { ResolvedNavItem } from '@/lib/public/nav';

// Tendina del menu (§13.1, "Eventi"): pulsante che apre l'elenco (disclosure), da mouse e da tastiera.
// Freccia giù apre e va alla prima voce, frecce su/giù scorrono, Esc chiude e torna al pulsante.

export function NavDropdown({ item, color, active }: { item: ResolvedNavItem; color: string; active: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // Aperta dal passaggio del mouse: il clic non la richiude subito (con la tastiera il clic alterna).
  const hovered = useRef(false);
  const links = () => Array.from(root.current?.querySelectorAll<HTMLAnchorElement>('[data-nav-child]') ?? []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    const list = links();
    const index = list.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      requestAnimationFrame(() => links()[index < 0 ? 0 : Math.min(index + 1, list.length - 1)]?.focus());
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      if (index <= 0) button.current?.focus();
      else list[index - 1]?.focus();
    }
  }

  return (
    <div
      ref={root}
      style={{ position: 'relative' }}
      onMouseEnter={() => ((hovered.current = true), setOpen(true))}
      onMouseLeave={() => ((hovered.current = false), setOpen(false))}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => setOpen((o) => (e.detail > 0 && hovered.current ? true : !o))}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.5rem 0.85rem',
          fontFamily: 'var(--font-body)',
          fontSize: '0.88rem',
          fontWeight: 500,
          color: active ? 'var(--gold-400)' : color,
          background: 'none',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {item.label}
        <ChevronDown size={14} aria-hidden style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <ul
        id={id}
        hidden={!open}
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          minWidth: '13rem',
          margin: 0,
          padding: '0.4rem',
          listStyle: 'none',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 32px -12px rgba(0,0,0,0.45)',
        }}
      >
        {item.children.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              data-nav-child
              onClick={() => setOpen(false)}
              className="nav-dropdown-link"
              style={{ display: 'block', padding: '0.55rem 0.8rem', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--color-heading)' }}
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Voce con sottovoci nel menu a tutto schermo del telefono: si apre come una fisarmonica. */
export function MobileNavAccordion({ item, onNavigate }: { item: ResolvedNavItem; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.8rem, 6vw, 2.8rem)',
          fontWeight: 300,
          color: 'var(--color-heading)',
          padding: '0.3rem 1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {item.label}
        <ChevronDown size={22} aria-hidden style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      <ul id={id} hidden={!open} style={{ listStyle: 'none', margin: 0, padding: 0, textAlign: 'center' }}>
        {item.children.map((c) => (
          <li key={c.href}>
            <Link href={c.href} onClick={onNavigate} style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '1.1rem', color: 'var(--gold-500)', padding: '0.4rem 1rem' }}>
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
