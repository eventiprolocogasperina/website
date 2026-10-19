'use client';

import { useState, useEffect } from 'react';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import GalleryForm from '@/components/admin/GalleryForm';
import type { GalleryItem } from '@/lib/data/gallery';

export default function AdminMediaPage() {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPhoto, setEditingPhoto] = useState<GalleryItem | null | 'new'>(null);

  const fetchGallery = () => {
    setLoading(true);
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setGallery(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchGallery(); }, []);

  const handleDeletePhoto = async (id: string) => {
    if (!confirm('Eliminare questa foto dalla galleria?')) return;
    await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
    setEditingPhoto(null);
    fetchGallery();
  };

  return (
    <div>
      <AdminHeader
        title="Galleria Media"
        actions={
          <button onClick={() => setEditingPhoto('new')} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={14} /> Aggiungi foto
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--neutral-500)' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : gallery.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--neutral-600)' }}>
          <ImageIcon size={32} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontSize: '0.9rem' }}>Nessuna foto ancora. Aggiungine una!</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', marginBottom: '1rem' }}>{gallery.length} foto in galleria</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {gallery.map(item => (
              <div
                key={item.id}
                className="card"
                style={{ overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.18s, box-shadow 0.18s' }}
                onClick={() => setEditingPhoto(item)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
              >
                <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.src} alt={item.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ padding: '0.75rem 0.9rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{item.category}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--neutral-200)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.alt}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editingPhoto && (
        <GalleryForm
          initialData={editingPhoto === 'new' ? undefined : editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSave={() => { setEditingPhoto(null); fetchGallery(); }}
          onDelete={handleDeletePhoto}
        />
      )}
    </div>
  );
}
