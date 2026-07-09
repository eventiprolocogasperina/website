import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Wine, Utensils, MapPin, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import type { Metadata } from 'next';

import { getPageContent, DEFAULT_ASSAGGIA_CONTENT, type AssaggiaEPasseggiaContent } from '@/lib/data/pages';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getPageContent<AssaggiaEPasseggiaContent>('assaggia-e-passeggia', DEFAULT_ASSAGGIA_CONTENT);
  const tappa = data.tappe.find(t => t.id === id);
  if (!tappa) return { title: 'Tappa non trovata' };
  return {
    title: `Tappa ${tappa.id}: ${tappa.title} - Assaggia & Passeggia`,
  };
}

export const revalidate = 0;

export default async function TappaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPageContent<AssaggiaEPasseggiaContent>('assaggia-e-passeggia', DEFAULT_ASSAGGIA_CONTENT);
  const tappe = data.tappe;
  const tappaIndex = tappe.findIndex(t => t.id === id);
  
  if (tappaIndex === -1) {
    notFound();
  }

  const tappa = tappe[tappaIndex];
  const nextTappa = tappe[tappaIndex + 1];
  const prevTappa = tappe[tappaIndex - 1];

  return (
    <div style={{ background: '#F9F3E4', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Header speciale per la tappa */}
      <div style={{ background: tappa.themeColor, padding: '4rem 2rem', color: 'white', textAlign: 'center', borderRadius: '0 0 2rem 2rem' }}>
        <div style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>
          Tappa {tappa.id} di {tappe.length}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', marginBottom: '1rem', lineHeight: 1.2 }}>
          {tappa.title}
        </h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.9rem' }}>
          <MapPin size={16} /> {tappa.location}
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '-2rem auto 0', padding: '0 1.5rem', position: 'relative', zIndex: 10 }}>
        {/* Card Dettagli */}
        <div style={{ background: 'white', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div style={{ background: '#F9F3E4', padding: '1rem', borderRadius: '1rem', color: '#7a6040' }}>
              <Utensils size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#1a1a1a', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>Il Piatto</h3>
              <p style={{ color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>{tappa.description}</p>
              {tappa.allergens && (
                <div style={{ fontSize: '0.85rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <AlertCircle size={14} /> <strong>Allergeni:</strong> {tappa.allergens}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: '1px', background: '#eaeaea', margin: '0 0 2rem' }} />

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ background: '#F9F3E4', padding: '1rem', borderRadius: '1rem', color: '#8b1a1a' }}>
              <Wine size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#1a1a1a', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>In Degustazione</h3>
              <p style={{ color: '#283983', fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{tappa.wineName}</p>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Cantina: {tappa.wineryName}</p>
            </div>
          </div>
        </div>

        {/* Navigazione */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          {prevTappa ? (
            <Link href={`/assaggia-e-passeggia/tappa/${prevTappa.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem',
              background: 'white', color: '#283983', textDecoration: 'none', borderRadius: '1rem',
              fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', flex: 1, justifyContent: 'center'
            }}>
              <ArrowLeft size={16} /> Precedente
            </Link>
          ) : <div style={{ flex: 1 }} />}
          
          {nextTappa ? (
            <Link href={`/assaggia-e-passeggia/tappa/${nextTappa.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem',
              background: '#283983', color: 'white', textDecoration: 'none', borderRadius: '1rem',
              fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(40,57,131,0.2)', flex: 1, justifyContent: 'center'
            }}>
              Prossima Tappa <ArrowRight size={16} />
            </Link>
          ) : (
            <Link href="/assaggia-e-passeggia" style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem',
              background: '#E8C042', color: '#283983', textDecoration: 'none', borderRadius: '1rem',
              fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(232,192,66,0.3)', flex: 1, justifyContent: 'center'
            }}>
              Torna alla Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
