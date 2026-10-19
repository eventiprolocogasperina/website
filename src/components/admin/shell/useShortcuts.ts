'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

/**
 * Scorciatoie globali dell'admin (§11.7): ⌘K / Ctrl+K apre la ricerca, "g" seguito da una lettera
 * entro un secondo porta a una sezione (es. "g o" → Ordini). "/" e "Esc" li gestiscono FilterBar e i dialog.
 */
export function useShortcuts({ onOpenPalette, goTo }: { onOpenPalette: () => void; goTo: Record<string, string> }) {
  const router = useRouter();
  const pendingG = useRef<number | null>(null);
  const latest = useRef({ onOpenPalette, goTo });
  useEffect(() => {
    latest.current = { onOpenPalette, goTo };
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        latest.current.onOpenPalette();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (pendingG.current !== null) {
        const href = latest.current.goTo[e.key.toLowerCase()];
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }
      if (e.key === 'g') {
        pendingG.current = window.setTimeout(() => {
          pendingG.current = null;
        }, 1000);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);
}
