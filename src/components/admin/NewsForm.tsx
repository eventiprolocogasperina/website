'use client';

import { useState, useRef } from 'react';
import type { NewsArticle } from '@/lib/data/news';
import { Loader2, X, UploadCloud, Save, ImageIcon } from 'lucide-react';

import ImageUpload from '@/components/admin/ImageUpload';

// ─── Image compression ────────────────────────────────────────────────────────
const compressImage = (file: File, type: string = 'image/jpeg'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(type, 0.8));
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

interface NewsFormProps {
  initialData?: NewsArticle;
  onClose: () => void;
  onSave: () => void;
  onDelete?: (id: string) => void;
}

const emptyNews: NewsArticle = {
  id: '',
  slug: '',
  title: '',
  content: '',
  publishedAt: new Date().toISOString().split('T')[0],
  featured: false,
};

export default function NewsForm({ initialData, onClose, onSave, onDelete }: NewsFormProps) {
  const isEdit = !!initialData;
  const [formData, setFormData] = useState<NewsArticle>(
    initialData ? { ...initialData, publishedAt: new Date(initialData.publishedAt).toISOString().split('T')[0] } : { ...emptyNews, id: Date.now().toString() }
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingImage, setPendingImage] = useState(false);
  
  const [carouselPhotos, setCarouselPhotos] = useState<{src: string; alt?: string}[]>(initialData?.config?.carouselPhotos ?? []);
  const carouselInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof NewsArticle) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));
    };

  const generateSlug = () => {
    if (isEdit) return;
    const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    const skipped = files.filter(f => f.size > MAX_BYTES);
    const valid   = files.filter(f => f.size <= MAX_BYTES);
    if (skipped.length) {
      setError(`${skipped.length} foto ignorat${skipped.length > 1 ? 'e' : 'a'} (oltre 10 MB).`);
    }
    if (!valid.length) return;
    try {
      setLoading(true);
      const newPhotos: { src: string; alt: string }[] = [];
      for (const file of valid) {
        const base64 = await compressImage(file);
        newPhotos.push({ src: base64, alt: '' });
      }
      setCarouselPhotos(p => [...p, ...newPhotos]);
      if (!skipped.length) setError('');
    } catch { setError('Errore durante il caricamento delle foto.'); }
    finally { setLoading(false); }
  };

  const removeCarouselPhoto = (idx: number) => {
    setCarouselPhotos(p => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingImage) {
      setError("Attenzione: un'immagine è in sospeso. Conferma il ritaglio cliccando su 'Taglia & Carica' o annulla prima di salvare.");
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/news/${formData.id}` : '/api/news';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        publishedAt: new Date(formData.publishedAt).toISOString(), // ensure valid timestamp
        config: carouselPhotos.length ? { ...formData.config, carouselPhotos } : formData.config,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Errore nel salvataggio');
      }
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Qualcosa è andato storto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem',
    }}>
      <div style={{
        background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '800px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
      }}>
        {/* ── Header ── */}
        <div style={{
          padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--neutral-800)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--neutral-950)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--white)' }}>
            {isEdit ? `Modifica: ${initialData.title}` : 'Nuova Notizia'}
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: 'auto', padding: '1.5rem' }}>
          <form id="news-form" onSubmit={handleSubmit}>
            <div className="admin-grid-2" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="label">Titolo *</label>
                  <input required className="input" value={formData.title} onChange={handleChange('title')} onBlur={generateSlug} />
                </div>
                <div>
                  <label className="label">Slug (URL) *</label>
                  <input required className="input" value={formData.slug} onChange={handleChange('slug')} />
                </div>
                <div>
                  <label className="label">Data di Pubblicazione *</label>
                  <input type="date" required className="input" value={formData.publishedAt} onChange={handleChange('publishedAt')} />
                </div>
              </div>

              <div style={{ minWidth: '0' }}>
                <ImageUpload
                  label="Immagine di Copertina"
                  value={formData.coverImage}
                  onChange={(url) => setFormData(prev => ({ ...prev, coverImage: url }))}
                  onPendingChange={setPendingImage}
                  folder="pro-loco-gasperina/notizie"
                  previewHeight={140}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: formData.featured ? '#4ade80' : 'var(--neutral-400)', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.featured} onChange={handleChange('featured')} style={{ width: 16, height: 16 }} />
                Metti in evidenza
              </label>
            </div>

            {/* ════════════════════════════════════════════════════
                BLOCCO — Foto Carosello (Galleria Notizia)
            ════════════════════════════════════════════════════ */}
            <div style={{
              background: 'var(--neutral-950)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--neutral-800)', padding: '1.25rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'rgba(192,132,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={15} style={{ color: '#c084fc' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--neutral-200)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Foto Galleria</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--neutral-600)' }}>{carouselPhotos.length} {carouselPhotos.length === 1 ? 'elemento' : 'elementi'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                {carouselPhotos.map((photo, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', aspectRatio: '1' }}>
                    <img src={photo.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removeCarouselPhoto(i)}
                      style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                
                {/* Upload button for multiple images */}
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', border: '2px dashed var(--neutral-700)', borderRadius: 'var(--radius-md)', cursor: 'pointer', aspectRatio: '1' }}>
                  <UploadCloud size={24} style={{ color: 'var(--neutral-500)', marginBottom: '0.5rem' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>Aggiungi Foto</span>
                  <input ref={carouselInputRef} type="file" multiple accept="image/*" onChange={handleCarouselUpload} style={{ display: 'none' }} />
                </label>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', margin: 0 }}>Queste foto appariranno in una galleria alla fine della notizia.</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="label">Contenuto (Markdown o Testo) *</label>
              <textarea required className="input" rows={10} value={formData.content} onChange={handleChange('content')} placeholder="Scrivi qui il contenuto della notizia..." />
            </div>

            {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}
          </form>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--neutral-800)', display: 'flex', justifyContent: 'space-between', background: 'var(--neutral-950)', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)' }}>
          {isEdit ? (
            <button type="button" onClick={() => onDelete?.(formData.id)} className="btn btn-outline" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>
              Elimina
            </button>
          ) : <div />}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Annulla</button>
            <button type="submit" form="news-form" disabled={loading || pendingImage} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
