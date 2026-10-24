'use client';

import Link from 'next/link';
import { useEffect } from 'react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Dove portare chi non vuole riprovare. */
  homeHref?: string;
  homeLabel?: string;
};

/**
 * Pagina mostrata quando un caricamento dati fallisce. Prima del prompt 04 le funzioni di
 * src/lib/data restituivano liste vuote e le pagine sembravano semplicemente senza contenuti.
 */
export default function ErrorView({ error, reset, homeHref = '/', homeLabel = 'Torna alla home' }: Props) {
  useEffect(() => {
    // Il dettaglio resta nei log del server; qui teniamo solo il riferimento per l'assistenza.
    console.error('Errore di pagina', error.digest ?? error.message);
  }, [error]);

  return (
    <div
      role="alert"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', margin: 0 }}>
        Non siamo riusciti a caricare la pagina
      </h1>
      <p style={{ maxWidth: 520, margin: 0, opacity: 0.8 }}>
        Può succedere se la connessione è lenta o il servizio è momentaneamente occupato. Riprova tra qualche
        secondo.
      </p>
      {error.digest && <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>Codice errore: {error.digest}</p>}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={reset}
          style={{
            background: '#E8C042',
            color: '#1a1a1a',
            border: 0,
            borderRadius: 999,
            padding: '0.8rem 1.8rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Riprova
        </button>
        <Link href={homeHref} style={{ padding: '0.8rem 1.4rem', fontWeight: 600 }}>
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
