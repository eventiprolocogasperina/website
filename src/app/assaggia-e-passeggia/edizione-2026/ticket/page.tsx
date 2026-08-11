'use client';

export default function TicketPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '6rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '1rem', color: '#1a1a1a' }}>
        L'evento si è concluso
      </h1>
      <p style={{ color: '#666', fontSize: '1.2rem', lineHeight: 1.6 }}>
        Le vendite dei biglietti per l'edizione di Assaggia & Passeggia sono attualmente chiuse.
        <br />
        Grazie a tutti per aver partecipato!
      </p>
      <div style={{ marginTop: '2.5rem' }}>
        <a href="/" className="btn btn-primary" style={{ padding: '0.8rem 1.5rem', display: 'inline-flex' }}>
          Torna alla Home
        </a>
      </div>
    </div>
  );
}
