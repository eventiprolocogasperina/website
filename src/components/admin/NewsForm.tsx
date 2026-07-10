'use client';

import { useState } from 'react';
import type { NewsArticle } from '@/lib/data/news';
import { Loader2, X, UploadCloud, Save } from 'lucide-react';

import ImageUpload from '@/components/admin/ImageUpload';

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

  // handleImageUpload is now handled by ImageUpload component

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/news/${formData.id}` : '/api/news';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          publishedAt: new Date(formData.publishedAt).toISOString(), // ensure valid timestamp
        }),
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
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
            <button type="submit" form="news-form" disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
