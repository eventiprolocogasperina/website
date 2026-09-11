'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { type ZuccalandContent, DEFAULT_ZUCCALAND_CONTENT } from '@/lib/data/pages';
import ThemeToggle from '@/components/ThemeToggle';

export default function ZuccalandAdminPage() {
  const [data, setData] = useState<ZuccalandContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    fetch('/api/admin/pages?slug=zuccaland')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setData({
            hero: { ...DEFAULT_ZUCCALAND_CONTENT.hero, ...(json.data.hero || {}) },
            program: { ...DEFAULT_ZUCCALAND_CONTENT.program, ...(json.data.program || {}) },
            tickets: { ...DEFAULT_ZUCCALAND_CONTENT.tickets, ...(json.data.tickets || {}) },
            faqs: json.data.faqs || DEFAULT_ZUCCALAND_CONTENT.faqs,
          });
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'zuccaland', content: data })
      });
      const json = await res.json();
      if (json.success) {
        setStatus({ type: 'success', message: 'Modifiche salvate con successo. Il sito è aggiornato!' });
        setTimeout(() => setStatus(null), 5000);
      } else {
        setStatus({ type: 'error', message: json.error || 'Errore durante il salvataggio' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Caricamento configurazione...</div>;
  if (!data) return <div className="p-8">Errore nel caricamento dei dati.</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem 6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'var(--neutral-100)', color: 'var(--neutral-600)', textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', margin: 0, color: 'var(--color-heading)' }}>
              CMS: Zuccaland
            </h1>
            <p style={{ color: 'var(--neutral-500)', margin: '0.2rem 0 0', fontSize: '0.9rem' }}>
              Modifica i testi della landing page di Zuccaland.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <ThemeToggle />
          <button 
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {saving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={18} />}
            {saving ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </div>

      {status && (
        <div style={{
          padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: status.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          color: status.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {status.message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* ── Hero ── */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-heading)', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '0.75rem' }}>
            Sezione Hero
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="label">Titolo H1 (nascosto visualmente ma per SEO)</label>
              <input type="text" className="input" value={data.hero.title} onChange={e => setData({...data, hero: {...data.hero, title: e.target.value}})} />
            </div>
            <div>
              <label className="label">Sottotitolo (es. Il villaggio delle zucche...)</label>
              <input type="text" className="input" value={data.hero.subtitle} onChange={e => setData({...data, hero: {...data.hero, subtitle: e.target.value}})} />
            </div>
            <div>
              <label className="label">Descrizione introduttiva</label>
              <textarea className="input" rows={2} value={data.hero.description} onChange={e => setData({...data, hero: {...data.hero, description: e.target.value}})} />
            </div>
            <div>
              <label className="label">Badge Date e Luogo</label>
              <input type="text" className="input" value={data.hero.badge} onChange={e => setData({...data, hero: {...data.hero, badge: e.target.value}})} />
            </div>
          </div>
        </div>

        {/* ── Programma ── */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-heading)', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '0.75rem' }}>
            Sezione Programma
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="label">Titolo Sezione</label>
              <input type="text" className="input" value={data.program.title} onChange={e => setData({...data, program: {...data.program, title: e.target.value}})} />
            </div>
            <div>
              <label className="label">Contenuto (Supporta markdown)</label>
              <textarea className="input" rows={6} value={data.program.content} onChange={e => setData({...data, program: {...data.program, content: e.target.value}})} />
              <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>Puoi usare **grassetto**, *corsivo*, e inserire andate a capo vuote per i paragrafi.</p>
            </div>
          </div>
        </div>

        {/* ── Tickets ── */}
        <div className="admin-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-heading)', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '0.75rem' }}>
            Sezione Ticket
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="label">Titolo Sezione</label>
              <input type="text" className="input" value={data.tickets.title} onChange={e => setData({...data, tickets: {...data.tickets, title: e.target.value}})} />
            </div>
            <div>
              <label className="label">Disclaimer (Attenzione: ...)</label>
              <textarea className="input" rows={2} value={data.tickets.disclaimer} onChange={e => setData({...data, tickets: {...data.tickets, disclaimer: e.target.value}})} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
