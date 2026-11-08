'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Menu, X } from 'lucide-react';
import { isActiveHref, type ResolvedNavItem, type ResolvedNavLink } from '@/lib/public/nav';
import { v3Fonts } from './fonts';

type Props = { items: ResolvedNavItem[]; cta: ResolvedNavLink | null; pathname: string };

/** Intestazione delle pagine v3: stesso menu di Navbar (configurabile da admin), aspetto nuovo. */
export default function SiteHeader({ items, cta, pathname }: Props) {
  const [open, setOpen] = useState(false);
  const active = (item: ResolvedNavItem) => isActiveHref(pathname, item.href) || item.children.some((c) => isActiveHref(pathname, c.href));

  return (
    <div className={`v3 ${v3Fonts}`}>
      <div className="page" style={{ paddingBottom: 0 }}>
        <header className="site-header">
          <Link className="brand" href="/" onClick={() => setOpen(false)}>
            <Image src="/img/Logo_color_sm.png" alt="Pro Loco Gasperina" width={54} height={54} priority />
            <span>
              <b>Pro Loco Gasperina</b>
              <small>Associazione di Promozione Sociale</small>
            </span>
          </Link>
          <nav className="nav" aria-label="Menu principale">
            {items.map((item) =>
              item.children.length ? (
                <div key={item.href} className={`dd${active(item) ? ' on' : ''}`}>
                  <span tabIndex={0}>
                    {item.label} <ChevronDown size={14} aria-hidden />
                  </span>
                  <div className="dd-menu">
                    <div>
                      {item.children.map((c) => (
                        <Link key={c.href} href={c.href}>
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link key={item.href} href={item.href} className={active(item) ? 'on' : undefined} aria-current={active(item) ? 'page' : undefined}>
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          {cta && (
            <Link className="vbtn vbtn-gold vbtn-sm" href={cta.href}>
              {cta.label}
            </Link>
          )}
          <button type="button" className="burger" aria-label={open ? 'Chiudi il menu' : 'Apri il menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>
        {open && (
          <nav className="mnav" aria-label="Menu">
            {items.map((item) => (
              <div key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
                {item.children
                  .filter((c) => c.href !== item.href)
                  .map((c) => (
                    <Link key={c.href} className="sub" href={c.href} onClick={() => setOpen(false)}>
                      {c.label}
                    </Link>
                  ))}
              </div>
            ))}
            {cta && (
              <Link className="vbtn vbtn-gold" href={cta.href} onClick={() => setOpen(false)}>
                {cta.label}
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
