'use client';

import { useEffect } from 'react';

/** Registra il service worker della cassa, solo in produzione (in sviluppo i file cambiano a ogni salvataggio). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/cassa/sw.js', { scope: '/cassa' }).catch(() => {
      // senza service worker la cassa funziona lo stesso, solo non si riapre senza rete
    });
  }, []);
  return null;
}
