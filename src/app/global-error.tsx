'use client';

// Ultima rete di sicurezza: sostituisce anche il layout radice, quindi deve avere <html> e <body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="it">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1>Il sito ha avuto un problema</h1>
          <p>Riprova tra qualche secondo.</p>
          {error.digest && <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>Codice errore: {error.digest}</p>}
          <button type="button" onClick={reset} style={{ padding: '0.7rem 1.5rem', fontWeight: 700 }}>
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
