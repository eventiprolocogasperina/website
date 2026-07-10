'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, GripVertical, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { AssaggiaEPasseggiaContent } from '@/lib/data/pages';
import ThemeToggle from '@/components/ThemeToggle';

export default function AssaggiaAdminPage() {
  const [data, setData] = useState<AssaggiaEPasseggiaContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    fetch('/api/admin/pages?slug=assaggia-e-passeggia')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setData(json.data);
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
        body: JSON.stringify({ slug: 'assaggia-e-passeggia', content: data })
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

  const addTappa = () => {
    if (!data) return;
    const newId = String((data.tappe.length > 0 ? Math.max(...data.tappe.map(t => parseInt(t.id) || 0)) : 0) + 1);
    setData({
      ...data,
      tappe: [
        ...data.tappe,
        { id: newId, title: 'Nuova Tappa', description: '', wineName: '', wineryName: '', location: '', themeColor: 'var(--blue-500)', allergens: '' }
      ]
    });
  };

  const removeTappa = (index: number) => {
    if (!data) return;
    const newTappe = [...data.tappe];
    newTappe.splice(index, 1);
    setData({ ...data, tappe: newTappe });
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--color-text)' }}>Caricamento...</div>;
  }

  if (!data) {
    return <div style={{ padding: '2rem', color: 'var(--red-500)' }}>Errore di caricamento dati.</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-text)', textDecoration: 'none', fontSize: '0.9rem', opacity: 0.8 }}>
          <ArrowLeft size={16} /> Torna alla Dashboard
        </Link>
        <ThemeToggle />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-heading)' }}>Gestione: Assaggia & Passeggia</h1>
          <p style={{ color: 'var(--color-text)', opacity: 0.7, marginTop: '0.5rem' }}>Modifica i testi e le tappe del percorso enogastronomico.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="btn btn-primary" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={18} /> {saving ? 'Salvataggio...' : 'Salva Modifiche'}
        </button>
      </div>

      {status && (
        <div style={{ 
          padding: '1rem', marginBottom: '2rem', borderRadius: 'var(--radius-md)', 
          background: status.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${status.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: status.type === 'success' ? 'var(--green-500)' : 'var(--red-500)',
          display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {status.message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Hero Section */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            Sezione Iniziale (Hero)
          </h2>
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Badge Data/Luogo</label>
              <input type="text" className="input" value={data.hero.badge} onChange={e => setData({...data, hero: {...data.hero, badge: e.target.value}})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Titolo Evento</label>
              <input type="text" className="input" value={data.hero.title} onChange={e => setData({...data, hero: {...data.hero, title: e.target.value}})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Sottotitolo Hero</label>
              <textarea className="input" rows={2} value={data.hero.subtitle} onChange={e => setData({...data, hero: {...data.hero, subtitle: e.target.value}})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>URL Immagine di Sfondo (Es: /images/bg.jpg o https://...)</label>
              <input type="text" className="input" value={data.hero.bgImageUrl} onChange={e => setData({...data, hero: {...data.hero, bgImageUrl: e.target.value}})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>URL Video Sfondo YouTube (Opzionale)</label>
              <input type="text" className="input" placeholder="Es. https://www.youtube.com/watch?v=..." value={data.hero.heroVideoUrl || ''} onChange={e => setData({...data, hero: {...data.hero, heroVideoUrl: e.target.value}})} />
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>Se inserito, sostituirà l'immagine di sfondo con un video in autoplay muto.</p>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>URL Logo Evento (Opzionale)</label>
              <input type="text" className="input" value={data.hero.logoUrl} onChange={e => setData({...data, hero: {...data.hero, logoUrl: e.target.value}})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Testo Bottone (CTA)</label>
                <input type="text" className="input" value={data.hero.ctaText} onChange={e => setData({...data, hero: {...data.hero, ctaText: e.target.value}})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Link Bottone</label>
                <input type="text" className="input" value={data.hero.ctaLink} onChange={e => setData({...data, hero: {...data.hero, ctaLink: e.target.value}})} />
              </div>
            </div>
          </div>
        </div>

        {/* La Nostra Storia */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            La Nostra Storia / Il Concept
          </h2>
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Titolo Sezione</label>
              <input type="text" className="input" value={data.story.title} onChange={e => setData({...data, story: {...data.story, title: e.target.value}})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Paragrafo 1</label>
              <textarea className="input" rows={3} value={data.story.paragraph1} onChange={e => setData({...data, story: {...data.story, paragraph1: e.target.value}})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Paragrafo 2</label>
              <textarea className="input" rows={3} value={data.story.paragraph2} onChange={e => setData({...data, story: {...data.story, paragraph2: e.target.value}})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>URL Immagine 1</label>
                <input type="text" className="input" value={data.story.image1Url} onChange={e => setData({...data, story: {...data.story, image1Url: e.target.value}})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>URL Immagine 2</label>
                <input type="text" className="input" value={data.story.image2Url} onChange={e => setData({...data, story: {...data.story, image2Url: e.target.value}})} />
              </div>
            </div>
          </div>
        </div>

        {/* Le Tappe */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-heading)' }}>
              Menu e Le Tappe
            </h2>
            <button onClick={addTappa} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              <Plus size={16} /> Aggiungi Tappa
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Sottotitolo (es. Il Percorso)</label>
              <input type="text" className="input" value={data.menu.subtitle} onChange={e => setData({...data, menu: {...data.menu, subtitle: e.target.value}})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Titolo Principale (es. Il Menù Degustazione)</label>
              <input type="text" className="input" value={data.menu.title} onChange={e => setData({...data, menu: {...data.menu, title: e.target.value}})} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>URL PDF Menu (es. /menu.pdf o https://...)</label>
              <input type="text" className="input" placeholder="Lascia vuoto per non allegare il menu" value={data.menu.pdfUrl || ''} onChange={e => setData({...data, menu: {...data.menu, pdfUrl: e.target.value}})} />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {data.tappe.map((tappa, idx) => (
              <div key={idx} style={{ padding: '1.25rem', background: 'var(--neutral-800)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-heading)' }}>
                    <GripVertical size={18} style={{ opacity: 0.5 }} />
                    <h3 style={{ fontWeight: 600 }}>Tappa {idx + 1}</h3>
                  </div>
                  <button onClick={() => removeTappa(idx)} style={{ color: 'var(--red-500)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Titolo (es. Aperitivo)</label>
                    <input type="text" className="input" value={tappa.title} onChange={e => {
                      const nt = [...data.tappe]; nt[idx].title = e.target.value; setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Luogo / Via</label>
                    <input type="text" className="input" value={tappa.location} onChange={e => {
                      const nt = [...data.tappe]; nt[idx].location = e.target.value; setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Descrizione Piatto (Usa **grassetto** e *corsivo*)</label>
                    <textarea className="input" rows={3} value={tappa.description} onChange={e => {
                      const nt = [...data.tappe]; nt[idx].description = e.target.value; setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Allergeni (es: Glutine, Lattosio)</label>
                    <input type="text" className="input" value={tappa.allergens || ''} onChange={e => {
                      const nt = [...data.tappe]; nt[idx].allergens = e.target.value; setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Nome Vino</label>
                    <input type="text" className="input" value={tappa.wineName} onChange={e => {
                      const nt = [...data.tappe]; nt[idx].wineName = e.target.value; setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Cantina</label>
                    <input type="text" className="input" value={tappa.wineryName} onChange={e => {
                      const nt = [...data.tappe]; nt[idx].wineryName = e.target.value; setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Colore Tema UI</label>
                    <select className="input" value={tappa.themeColor} onChange={e => {
                      const nt = [...data.tappe]; nt[idx].themeColor = e.target.value; setData({...data, tappe: nt});
                    }}>
                      <option value="var(--blue-500)">Blu (Classico)</option>
                      <option value="var(--gold-500)">Oro / Giallo</option>
                      <option value="var(--red-500)">Rosso / Vino</option>
                      <option value="var(--green-500)">Verde</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Curiosità (Opzionale)</label>
                    <textarea className="input" rows={2} value={tappa.curiosities || ''} onChange={e => {
                      const nt = [...data.tappe]; nt[idx].curiosities = e.target.value; setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Informazioni Extra (Opzionale)</label>
                    <textarea className="input" rows={2} value={tappa.extraInfo || ''} onChange={e => {
                      const nt = [...data.tappe]; nt[idx].extraInfo = e.target.value; setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>URL Foto (separate da virgola, Opzionale)</label>
                    <input type="text" className="input" value={(tappa.photos || []).join(', ')} onChange={e => {
                      const nt = [...data.tappe]; 
                      nt[idx].photos = e.target.value.split(',').map(s => s.trim()).filter(s => s); 
                      setData({...data, tappe: nt});
                    }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Logistiche */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            Informazioni Logistiche
          </h2>
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Ritiro Ticket</label>
              <textarea 
                className="input" 
                rows={2} 
                value={data.logistics.ticketInfo} 
                onChange={e => setData({...data, logistics: {...data.logistics, ticketInfo: e.target.value}})}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Parcheggi</label>
              <textarea 
                className="input" 
                rows={2} 
                value={data.logistics.parkingInfo} 
                onChange={e => setData({...data, logistics: {...data.logistics, parkingInfo: e.target.value}})}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Disclaimer (Allergie/Intolleranze)</label>
              <textarea 
                className="input" 
                rows={3} 
                value={data.logistics.disclaimer} 
                onChange={e => setData({...data, logistics: {...data.logistics, disclaimer: e.target.value}})}
              />
            </div>
          </div>
        </div>

        {/* Prevendita / Box Acquisto */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            Box Prevendita
          </h2>
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Titolo (Es. Prevendita Aperta)</label>
              <input type="text" className="input" value={data.presale.title} onChange={e => setData({...data, presale: {...data.presale, title: e.target.value}})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Testo / Descrizione</label>
              <textarea className="input" rows={2} value={data.presale.subtitle} onChange={e => setData({...data, presale: {...data.presale, subtitle: e.target.value}})} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Contributo (Es. 15€)</label>
                <input type="text" className="input" value={data.presale.priceInfo} onChange={e => setData({...data, presale: {...data.presale, priceInfo: e.target.value}})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Testo Bottone</label>
                <input type="text" className="input" value={data.presale.ctaText} onChange={e => setData({...data, presale: {...data.presale, ctaText: e.target.value}})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text)' }}>Link Bottone</label>
                <input type="text" className="input" value={data.presale.ctaLink} onChange={e => setData({...data, presale: {...data.presale, ctaLink: e.target.value}})} />
              </div>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-heading)' }}>
              Domande Frequenti (FAQ)
            </h2>
            <button onClick={() => {
              const newFaqs = [...(data.faqs || []), { question: 'Nuova domanda', answer: '' }];
              setData({ ...data, faqs: newFaqs });
            }} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              <Plus size={16} /> Aggiungi FAQ
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {(data.faqs || []).map((faq, idx) => (
              <div key={idx} style={{ padding: '1.25rem', background: 'var(--neutral-800)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-heading)' }}>
                    <h3 style={{ fontWeight: 600 }}>FAQ {idx + 1}</h3>
                  </div>
                  <button onClick={() => {
                    const newFaqs = [...(data.faqs || [])];
                    newFaqs.splice(idx, 1);
                    setData({ ...data, faqs: newFaqs });
                  }} style={{ color: 'var(--red-500)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Domanda</label>
                    <input type="text" className="input" value={faq.question} onChange={e => {
                      const nf = [...(data.faqs || [])]; nf[idx].question = e.target.value; setData({...data, faqs: nf});
                    }}/>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Risposta (puoi usare HTML/Markdown base)</label>
                    <textarea className="input" rows={2} value={faq.answer} onChange={e => {
                      const nf = [...(data.faqs || [])]; nf[idx].answer = e.target.value; setData({...data, faqs: nf});
                    }}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
