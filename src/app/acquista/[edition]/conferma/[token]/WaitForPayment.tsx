'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Mentre l'ordine è in attesa, ricarica lo stato ogni 3 secondi (per 2 minuti): la notifica di Nexi può arrivare dopo il ritorno. */
export function WaitForPayment() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= 40) return;
    const t = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, 3000);
    return () => clearTimeout(t);
  }, [router, tries]);
  return null;
}

/** Svuota il carrello salvato quando l'ordine è confermato. */
export function ClearCart({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      sessionStorage.removeItem(`acquista:${slug}`);
    } catch {}
  }, [slug]);
  return null;
}
