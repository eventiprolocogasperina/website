'use client';

import { useState } from 'react';
import { Loader2, X, Trash2, Save, UploadCloud, Image as ImageIcon } from 'lucide-react';
import type { GalleryItem } from '@/lib/data/gallery';

// ─── image compressor (re-used from EventForm pattern) ───────────────────────
const compressImage = (file: File, maxW = 1920, maxH = 1200): Promise<{ dataUrl: string; width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new window.Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const ratio = w / h;
        if (w > maxW) { w = maxW; h = Math.round(w / ratio); }
        if (h > maxH) { h = maxH; w = Math.round(h * ratio); }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: w, height: h });
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });

// ─── types ───────────────────────────────────────────────────────────────────
interface GalleryFormProps {
  initialData?: GalleryItem;          // undefined → create mode
  onClose: () => void;
  onSave: (item: GalleryItem) => void;
  onDelete?: (id: string) => void;
}

const CATEGORIES: GalleryItem['category'][] = ['eventi', 'territorio', 'cultura', 'comunità', 'video'];

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const empty: Omit<GalleryItem, 'id'> = {
  src: '',
  alt: '',
  category: 'territorio',
  width: 1920,
  height: 1080,
};

// ─── component ───────────────────────────────────────────────────────────────
export default function GalleryForm({ initialData, onClose, onSave, onDelete }: GalleryFormProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<Omit<GalleryItem, 'id'>>(initialData ?? empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  // ── image upload ───────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('Massimo 8 MB per immagine.'); return; }
    try {
      setLoading(true);
      const { dataUrl, width, height } = await compressImage(file);
      setForm(prev => ({ ...prev, src: dataUrl, width, height }));
      setError('');
    } catch { setError("Errore durante il caricamento dell'immagine."); }
    finally { setLoading(false); }
  };

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.src) { setError("Carica un'immagine prima di salvare."); return; }
    if (!form.alt.trim()) { setError('Inserisci una descrizione per l\'immagine.'); return; }
    setLoading(true); setError('');

    try {
      const url = isEdit ? `/api/gallery/${initialData!.id}` : '/api/gallery';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Errore nel salvataggio');
      }
      const saved = await res.json();
      onSave(saved as GalleryItem);
    } catch (err: any) {
      setError(err.message ?? 'Qualcosa è andato storto.');
    } finally {
      setLoading(false);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!initialData || !onDelete) return;
    if (confirm('Eliminare questa foto dalla galleria?')) onDelete(initialData.id);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1.5rem',
    }}>
      <div style={{
        background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '560px',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 64px -12px rgba(0,0,0,0.6)',
      }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--neutral-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500, color: 'var(--white)' }}>
            {isEdit ? 'Modifica foto' : 'Aggiungi foto'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
          <form id="gallery-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Image/Video upload/input */}
            {form.category === 'video' ? (
              <div>
                <label className="label">Link del video YouTube *</label>
                <input
                  required
                  className="input"
                  type="url"
                  value={form.src}
                  onChange={e => {
                    const url = e.target.value;
                    const id = extractYoutubeId(url);
                    if (id && !form.alt) {
                      // Try to provide a default if empty, though Youtube API would be needed for real title
                    }
                    set('src', url);
                    set('width', 1920);
                    set('height', 1080);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {form.src && extractYoutubeId(form.src) && (
                  <div style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--neutral-700)', position: 'relative', aspectRatio: '16/9' }}>
                    <img 
                      src={`https://img.youtube.com/vi/${extractYoutubeId(form.src)}/maxresdefault.jpg`} 
                      alt="YouTube Thumbnail"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${extractYoutubeId(form.src!)}/hqdefault.jpg`; }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="label">Immagine *</label>
                <label style={{
                  display: 'block', position: 'relative', cursor: 'pointer',
                  borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  border: '2px dashed var(--neutral-700)',
                  background: 'var(--neutral-950)',
                  aspectRatio: '16 / 9',
                }}>
                  {form.src ? (
                    // preview
                    <img
                      src={form.src}
                      alt="Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    // placeholder
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--neutral-600)' }}>
                      <UploadCloud size={32} />
                      <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>Clicca per caricare</span>
                    </div>
                  )}
                  {/* Overlay on hover when image already loaded */}
                  {form.src && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      color: 'var(--white)', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
                    >
                      <UploadCloud size={18} /> Cambia foto
                    </div>
                  )}
                  <input
                    type="file" accept="image/*"
                    onChange={handleFile}
                    style={{ display: 'none' }}
                  />
                </label>
                {form.src && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--neutral-600)', marginTop: '0.35rem' }}>
                    {form.width} × {form.height} px · clicca per sostituire
                  </p>
                )}
              </div>
            )}

            {/* Alt / description */}
            <div>
              <label className="label">Descrizione (alt text) *</label>
              <input
                required
                className="input"
                value={form.alt}
                onChange={e => set('alt', e.target.value)}
                placeholder="Es. Vista aerea di Gasperina al tramonto"
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--neutral-600)', marginTop: '0.35rem' }}>
                Visibile sotto la foto nel lightbox e letta dai lettori di schermo.
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="label">Categoria</label>
              <select
                className="input"
                value={form.category}
                onChange={e => {
                  const newCat = e.target.value as GalleryItem['category'];
                  // If switching from video to image or vice versa, clear src
                  if ((form.category === 'video' && newCat !== 'video') || (form.category !== 'video' && newCat === 'video')) {
                    set('src', '');
                  }
                  set('category', newCat);
                }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div style={{ color: '#f87171', fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: 'rgba(248,113,113,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(248,113,113,0.2)' }}>
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--neutral-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--neutral-950)', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)' }}>
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', padding: '0.55rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'var(--font-body)' }}
            >
              <Trash2 size={15} /> Elimina foto
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} style={{ color: 'var(--neutral-400)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>
              Annulla
            </button>
            <button
              type="submit" form="gallery-form"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {isEdit ? 'Salva modifiche' : 'Aggiungi'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
