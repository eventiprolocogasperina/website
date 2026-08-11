import { Inter, Outfit } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-display' });

export default function AssaggiaPasseggiaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable} ${outfit.variable}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F9F3E4', color: '#1a1a1a' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(242, 226, 191, 0.95)', /* #f2e2bf */
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{ 
          maxWidth: '1200px', margin: '0 auto', padding: '0.75rem 1rem', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '1rem'
        }}>
          <Link href="/assaggia-e-passeggia" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #283983, #151e45)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="/img/AP_letters.png?v=2" alt="AP" style={{ width: '100%', height: '100%', padding: '2px', marginTop: '3px', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.25rem' }}>
              <img src="/img/AP_only.png?v=2" alt="Assaggia & Passeggia" style={{ height: '32px', objectFit: 'contain' }} />
            </div>
          </Link>
          
          <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/assaggia-e-passeggia" style={{ color: '#444', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Home</Link>
            <Link href="/assaggia-e-passeggia/ticket" style={{
              background: '#283983', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '999px',
              textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, transition: 'background 0.2s',
              boxShadow: '0 4px 14px rgba(40, 57, 131, 0.3)',
              textAlign: 'center',
              whiteSpace: 'nowrap'
            }}>
              Acquista
            </Link>
            <Link href="/" style={{ color: '#888', textDecoration: 'none', fontSize: '0.8rem', borderLeft: '1px solid #ddd', paddingLeft: '1rem', whiteSpace: 'nowrap' }}>Sito principale</Link>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, fontFamily: 'var(--font-body)' }}>
        {children}
      </main>

      <footer style={{ background: '#1a1a1a', color: 'white', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '1rem', color: '#E8C042' }}>Assaggia & Passeggia</div>
        <p style={{ fontSize: '0.9rem', color: '#888', maxWidth: '500px', margin: '0 auto 2rem' }}>
          Un viaggio enogastronomico tra le vie del borgo di Gasperina. Scopri i sapori autentici della nostra terra.
        </p>
        <div style={{ fontSize: '0.8rem', color: '#555', borderTop: '1px solid #333', paddingTop: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          &copy; {new Date().getFullYear()} Pro Loco Gasperina APS. Tutti i diritti riservati.
        </div>
      </footer>
    </div>
  );
}
