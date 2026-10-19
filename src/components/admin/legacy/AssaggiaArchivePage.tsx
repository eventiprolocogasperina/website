'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, GripVertical, AlertCircle, CheckCircle2, ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import type { AssaggiaEPasseggiaContent } from '@/lib/data/pages';
import ThemeToggle from '@/components/ThemeToggle';

export default function AssaggiaAdminPage() {
  const [data, setData] = useState<AssaggiaEPasseggiaContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

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

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingPdf(true);
    setStatus(null);
    try {
      const formData = new FormData();
      const safeName = file.name.replace(/[^\w.-]/g, '_') || 'menu.pdf';
      formData.append('file', file, safeName);
      formData.append('folder', 'pro-loco-gasperina/menu');
      
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        if (data) {
          setData({ ...data, menu: { ...data.menu, pdfUrl: json.url } });
        }
        setStatus({ type: 'success', message: 'PDF caricato con successo! Ricordati di cliccare Salva Modifiche.' });
      } else {
        throw new Error(json.error || 'Errore durante il caricamento');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setUploadingPdf(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, tappaIdx: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setStatus(null);
    try {
      const formData = new FormData();
      const safeName = file.name.replace(/[^\w.-]/g, '_') || 'photo.jpg';
      formData.append('file', file, safeName);
      formData.append('folder', 'pro-loco-gasperina/tappe');
      
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        if (data) {
          const nt = [...data.tappe];
          nt[tappaIdx].photos = [...(nt[tappaIdx].photos || []), json.url];
          setData({ ...data, tappe: nt });
        }
        setStatus({ type: 'success', message: 'Foto caricata con successo!' });
      } else {
        throw new Error(json.error || 'Errore durante il caricamento');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const handleRecipePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, tappaIdx: number, recipeIdx: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setStatus(null);
    try {
      const formData = new FormData();
      const safeName = file.name.replace(/[^\w.-]/g, '_') || 'recipe.jpg';
      formData.append('file', file, safeName);
      formData.append('folder', 'pro-loco-gasperina/recipes');
      
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (json.success) {
        if (data) {
          const nt = [...data.tappe];
          if (!nt[tappaIdx].recipes) nt[tappaIdx].recipes = [];
          nt[tappaIdx].recipes[recipeIdx].photoUrl = json.url;
          setData({ ...data, tappe: nt });
        }
        setStatus({ type: 'success', message: 'Foto ricetta caricata con successo!' });
      } else {
        throw new Error(json.error || 'Errore durante il caricamento');
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  const addTappa = () => {
    if (!data) return;
    const newId = String((data.tappe.length > 0 ? Math.max(...data.tappe.map(t => parseInt(t.id) || 0)) : 0) + 1);
    setData({
      ...data,
      tappe: [
        ...data.tappe,
        { id: newId, title: 'Nuova Tappa', description: '', wineName: '', wineryName: '', location: '', themeColor: 'var(--blue-500)', allergens: '', hasTasting: true }
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
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>PDF Menu (Allegato Email)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" className="input" style={{ flex: 1 }} placeholder="Nessun file caricato (Incolla un URL o carica un file)" value={data.menu.pdfUrl || ''} onChange={e => setData({...data, menu: {...data.menu, pdfUrl: e.target.value}})} />
                <label className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: uploadingPdf ? 'not-allowed' : 'pointer' }}>
                  <Upload size={16} /> {uploadingPdf ? 'Caricamento...' : 'Carica File PDF'}
                  <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} disabled={uploadingPdf} />
                </label>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {data.tappe.map((tappa, idx) => (
              <div key={idx} style={{ padding: '1.25rem', background: 'var(--neutral-800)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-heading)' }}>
                    <GripVertical size={18} style={{ opacity: 0.5 }} />
                    <h3 style={{ fontWeight: 600 }}>Tappa {idx + 1}</h3>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '1rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={tappa.hasTasting !== false} 
                        onChange={e => {
                          const nt = [...data.tappe]; 
                          nt[idx].hasTasting = e.target.checked; 
                          setData({...data, tappe: nt});
                        }} 
                      />
                      <span>Comprende Degustazione</span>
                    </label>
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
                    <input type="text" className="input" value={typeof tappa.location === 'string' ? tappa.location : (tappa.location?.name || '')} onChange={e => {
                      const nt = [...data.tappe]; 
                      if (typeof nt[idx].location === 'object' && nt[idx].location !== null) {
                        nt[idx].location = { ...(nt[idx].location as any), name: e.target.value };
                      } else {
                        nt[idx].location = e.target.value; 
                      }
                      setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Latitudine Mappa (Es. 38.7423)</label>
                    <input type="number" step="any" className="input" value={typeof tappa.location === 'object' ? (tappa.location?.lat || '') : ''} onChange={e => {
                      const nt = [...data.tappe]; 
                      const oldName = typeof nt[idx].location === 'string' ? nt[idx].location : (nt[idx].location as any)?.name || '';
                      const oldLng = typeof nt[idx].location === 'object' ? (nt[idx].location as any)?.lng || 0 : 0;
                      const oldMapLabel = typeof nt[idx].location === 'object' ? (nt[idx].location as any)?.mapLabel || '' : '';
                      nt[idx].location = { name: oldName, lat: parseFloat(e.target.value) || 0, lng: oldLng, mapLabel: oldMapLabel };
                      setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Longitudine Mappa (Es. 16.4952)</label>
                    <input type="number" step="any" className="input" value={typeof tappa.location === 'object' ? (tappa.location?.lng || '') : ''} onChange={e => {
                      const nt = [...data.tappe]; 
                      const oldName = typeof nt[idx].location === 'string' ? nt[idx].location : (nt[idx].location as any)?.name || '';
                      const oldLat = typeof nt[idx].location === 'object' ? (nt[idx].location as any)?.lat || 0 : 0;
                      const oldMapLabel = typeof nt[idx].location === 'object' ? (nt[idx].location as any)?.mapLabel || '' : '';
                      nt[idx].location = { name: oldName, lat: oldLat, lng: parseFloat(e.target.value) || 0, mapLabel: oldMapLabel };
                      setData({...data, tappe: nt});
                    }}/>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Etichetta Segnaposto (es. Virgileḍu)</label>
                    <input type="text" className="input" value={typeof tappa.location === 'object' ? (tappa.location?.mapLabel || '') : ''} onChange={e => {
                      const nt = [...data.tappe]; 
                      const oldName = typeof nt[idx].location === 'string' ? nt[idx].location : (nt[idx].location as any)?.name || '';
                      const oldLat = typeof nt[idx].location === 'object' ? (nt[idx].location as any)?.lat || 0 : 0;
                      const oldLng = typeof nt[idx].location === 'object' ? (nt[idx].location as any)?.lng || 0 : 0;
                      nt[idx].location = { name: oldName, lat: oldLat, lng: oldLng, mapLabel: e.target.value };
                      setData({...data, tappe: nt});
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
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Testo Introduttivo (Opzionale)</label>
                    <textarea className="input" rows={2} value={tappa.introText || ''} onChange={e => {
                      const nt = [...data.tappe]; nt[idx].introText = e.target.value; setData({...data, tappe: nt});
                    }}/>
                  </div>
                  {tappa.hasTasting !== false && (
                    <>
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
                    </>
                  )}
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
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Foto della Tappa</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {(tappa.photos || []).map((photoUrl, pIdx) => (
                        <div key={pIdx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '0.5rem', overflow: 'hidden' }}>
                          <img src={photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => {
                            const nt = [...data.tappe];
                            nt[idx].photos = (nt[idx].photos || []).filter((_, i) => i !== pIdx);
                            setData({ ...data, tappe: nt });
                          }} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: '0 0 0 0.5rem', cursor: 'pointer', padding: '0.2rem' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      
                      <label style={{ width: '80px', height: '80px', border: '2px dashed var(--color-border)', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text)', opacity: 0.7 }}>
                        <Upload size={20} />
                        <span style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>Carica Foto</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(e, idx)} />
                      </label>
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-heading)', margin: 0 }}>Ricette della Tappa</h4>
                      <button 
                        type="button"
                        onClick={() => {
                          const nt = [...data.tappe];
                          if (!nt[idx].recipes) nt[idx].recipes = [];
                          nt[idx].recipes.push({
                            id: Date.now().toString(),
                            title: '',
                            ingredients: '',
                            instructions: ''
                          });
                          setData({ ...data, tappe: nt });
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                      >
                        <Plus size={14} /> Aggiungi Ricetta
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {(tappa.recipes || []).map((recipe, rIdx) => (
                        <div key={recipe.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', position: 'relative' }}>
                          <button 
                            type="button"
                            onClick={() => {
                              const nt = [...data.tappe];
                              nt[idx].recipes = nt[idx].recipes?.filter((_, i) => i !== rIdx);
                              setData({ ...data, tappe: nt });
                            }}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                          >
                            <Trash2 size={16} />
                          </button>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Titolo Ricetta</label>
                              <input type="text" className="input" value={recipe.title} onChange={e => {
                                const nt = [...data.tappe]; nt[idx].recipes![rIdx].title = e.target.value; setData({...data, tappe: nt});
                              }}/>
                            </div>
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Descrizione / Curiosità (Opzionale)</label>
                              <textarea className="input" rows={2} value={recipe.description || ''} onChange={e => {
                                const nt = [...data.tappe]; nt[idx].recipes![rIdx].description = e.target.value; setData({...data, tappe: nt});
                              }}/>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Ingredienti (Supporta Markdown)</label>
                                <textarea className="input" rows={4} value={recipe.ingredients} onChange={e => {
                                  const nt = [...data.tappe]; nt[idx].recipes![rIdx].ingredients = e.target.value; setData({...data, tappe: nt});
                                }}/>
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Procedimento (Supporta Markdown)</label>
                                <textarea className="input" rows={4} value={recipe.instructions} onChange={e => {
                                  const nt = [...data.tappe]; nt[idx].recipes![rIdx].instructions = e.target.value; setData({...data, tappe: nt});
                                }}/>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Tempo di Prep. (es. 30 min)</label>
                                <input type="text" className="input" value={recipe.prepTime || ''} onChange={e => {
                                  const nt = [...data.tappe]; nt[idx].recipes![rIdx].prepTime = e.target.value; setData({...data, tappe: nt});
                                }}/>
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Difficoltà (es. Facile, Media)</label>
                                <input type="text" className="input" value={recipe.difficulty || ''} onChange={e => {
                                  const nt = [...data.tappe]; nt[idx].recipes![rIdx].difficulty = e.target.value; setData({...data, tappe: nt});
                                }}/>
                              </div>
                            </div>
                            
                            <div>
                              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text)' }}>Foto della Ricetta</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {recipe.photoUrl && (
                                  <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '0.5rem', overflow: 'hidden' }}>
                                    <img src={recipe.photoUrl} alt="Ricetta" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button onClick={() => {
                                      const nt = [...data.tappe];
                                      nt[idx].recipes![rIdx].photoUrl = undefined;
                                      setData({ ...data, tappe: nt });
                                    }} style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: '0 0 0 0.5rem', cursor: 'pointer', padding: '0.2rem' }}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                                <label style={{ width: '80px', height: '80px', border: '2px dashed var(--color-border)', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text)', opacity: 0.7 }}>
                                  <Upload size={20} />
                                  <span style={{ fontSize: '0.65rem', marginTop: '0.2rem', textAlign: 'center' }}>Carica/Cambia</span>
                                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleRecipePhotoUpload(e, idx, rIdx)} />
                                </label>
                              </div>
                            </div>

                          </div>
                        </div>
                      ))}
                      {(!tappa.recipes || tappa.recipes.length === 0) && (
                        <div style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic', padding: '1rem', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '0.5rem', border: '1px dashed var(--color-border)' }}>
                          Nessuna ricetta inserita per questa tappa.
                        </div>
                      )}
                    </div>
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
