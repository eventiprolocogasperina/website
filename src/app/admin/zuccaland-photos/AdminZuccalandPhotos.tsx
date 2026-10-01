'use client';

import { useState, useEffect } from 'react';
import { CldImage } from 'next-cloudinary';
import { Loader2, Check, X, Maximize2 } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';

type Photo = {
  id: number;
  cloudinary_public_id: string;
  frame_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const FILTER_CONFIG: { key: FilterStatus; label: string; color: string; bg: string }[] = [
  { key: 'pending', label: 'In Attesa', color: '#b45309', bg: '#fef3c7' },
  { key: 'approved', label: 'Approvate', color: '#15803d', bg: '#f0fdf4' },
  { key: 'rejected', label: 'Rifiutate', color: '#b91c1c', bg: '#fef2f2' },
  { key: 'all', label: 'Tutte', color: '#431407', bg: '#fff7ed' },
];

// ─── Lightbox modal ───────────────────────────────────────────────────────────
function PhotoLightbox({
  photo,
  onClose,
  onApprove,
  onReject,
  updating,
}: {
  photo: Photo;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  updating: boolean;
}) {
  // Chiudi con ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      {/* Foto full size */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          maxHeight: 'calc(100vh - 140px)',
          maxWidth: '500px', width: '100%',
          borderRadius: '1rem', overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        <CldImage
          src={photo.cloudinary_public_id}
          width={1080}
          height={1350}
          crop="fill"
          alt={`Foto #${photo.id}`}
          sizes="500px"
          style={{ display: 'block', width: '100%', height: 'auto' }}
          overlays={[{
            publicId: photo.frame_name,
            flags: ['relative'],
            width: '1.0',
            height: '1.0',
          }]}
        />
      </div>

      {/* Barra azioni */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          marginTop: '1.25rem',
          display: 'flex', gap: '0.75rem', alignItems: 'center',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          padding: '0.75rem 1.25rem',
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginRight: '0.25rem' }}>
          #{photo.id} · {new Date(photo.created_at).toLocaleDateString('it-IT')}
        </span>

        <button onClick={onClose} style={{
          padding: '0.55rem 1.1rem', borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
          color: 'white', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
        }}>
          Chiudi
        </button>

        {photo.status !== 'rejected' && (
          <button onClick={onReject} disabled={updating} style={{
            padding: '0.55rem 1.1rem', borderRadius: '999px',
            border: 'none', background: 'rgba(239,68,68,0.85)',
            color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}>
            {updating ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Rifiuta
          </button>
        )}

        {photo.status !== 'approved' && (
          <button onClick={onApprove} disabled={updating} style={{
            padding: '0.55rem 1.25rem', borderRadius: '999px',
            border: 'none', background: 'rgba(22,163,74,0.9)',
            color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.35rem',
          }}>
            {updating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Approva
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function AdminZuccalandPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [updating, setUpdating] = useState<number | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    fetch('/api/admin/zuccaland-photos')
      .then(r => r.json())
      .then(data => setPhotos(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, newStatus: 'approved' | 'rejected' | 'pending') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/zuccaland-photos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        // Aggiorna anche il lightbox se è aperto sulla stessa foto
        setLightboxPhoto(prev => prev?.id === id ? { ...prev, status: newStatus } : prev);
      } else {
        alert('Errore aggiornamento. Riprova.');
      }
    } catch {
      alert('Errore di rete.');
    } finally {
      setUpdating(null);
    }
  };

  const counts = {
    all: photos.length,
    pending: photos.filter(p => p.status === 'pending').length,
    approved: photos.filter(p => p.status === 'approved').length,
    rejected: photos.filter(p => p.status === 'rejected').length,
  };

  const filtered = filter === 'all' ? photos : photos.filter(p => p.status === filter);

  return (
    <>
      {/* Lightbox */}
      {lightboxPhoto && (
        <PhotoLightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onApprove={() => updateStatus(lightboxPhoto.id, 'approved')}
          onReject={() => updateStatus(lightboxPhoto.id, 'rejected')}
          updating={updating === lightboxPhoto.id}
        />
      )}

      <div>
        <AdminHeader
          title="Moderazione Foto Zuccaland"
          subtitle="Approva o rifiuta le foto caricate dai partecipanti"
        />

        {/* Filtri */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {FILTER_CONFIG.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '0.45rem 1rem', borderRadius: '999px',
                border: `1.5px solid ${filter === f.key ? f.color : 'var(--neutral-700)'}`,
                background: filter === f.key ? f.bg : 'transparent',
                color: filter === f.key ? f.color : 'var(--neutral-400)',
                fontWeight: 700, fontSize: '0.82rem',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
              }}
            >
              {f.label}
              <span style={{
                background: filter === f.key ? f.color : 'var(--neutral-700)',
                color: filter === f.key ? 'white' : 'var(--neutral-400)',
                borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800,
                padding: '0 0.4rem', minWidth: '1.2rem', textAlign: 'center',
              }}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--neutral-500)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3rem 1.5rem',
            color: 'var(--neutral-500)', fontSize: '0.9rem',
            background: 'var(--neutral-900)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--neutral-800)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎃</div>
            Nessuna foto in questa categoria.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.25rem',
          }}>
            {filtered.map(photo => (
              <div key={photo.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
                {/* Thumbnail cliccabile per aprire il lightbox */}
                <div
                  onClick={() => setLightboxPhoto(photo)}
                  style={{ position: 'relative', aspectRatio: '1080/1350', background: 'var(--neutral-800)', cursor: 'pointer', overflow: 'hidden' }}
                >
                  <CldImage
                    src={photo.cloudinary_public_id}
                    width={400}
                    height={500}
                    crop="fill"
                    alt={`Foto #${photo.id}`}
                    sizes="250px"
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                    overlays={[{
                      publicId: photo.frame_name,
                      flags: ['relative'],
                      width: '1.0',
                      height: '1.0',
                    }]}
                  />
                  {/* Hover overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                  >
                    <Maximize2 size={28} color="white" style={{ opacity: 0, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                    />
                  </div>
                  {/* Badge status */}
                  <span style={{
                    position: 'absolute', top: '0.5rem', right: '0.5rem',
                    padding: '0.2rem 0.55rem', borderRadius: '999px',
                    fontSize: '0.65rem', fontWeight: 800,
                    background: photo.status === 'approved' ? '#f0fdf4' : photo.status === 'rejected' ? '#fef2f2' : '#fef3c7',
                    color: photo.status === 'approved' ? '#15803d' : photo.status === 'rejected' ? '#b91c1c' : '#b45309',
                    border: `1px solid ${photo.status === 'approved' ? '#86efac' : photo.status === 'rejected' ? '#fca5a5' : '#fcd34d'}`,
                  }}>
                    {photo.status === 'approved' ? '✓ OK' : photo.status === 'rejected' ? '✗' : '⏳'}
                  </span>
                </div>

                {/* Azioni rapide */}
                <div style={{ padding: '0.75rem' }}>
                  <div style={{
                    fontSize: '0.7rem', color: 'var(--neutral-500)',
                    marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>#{photo.id}</span>
                    <span>{new Date(photo.created_at).toLocaleDateString('it-IT')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => setLightboxPhoto(photo)}
                      style={{
                        flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)',
                        background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
                        color: 'var(--neutral-300)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                      }}
                    >
                      <Maximize2 size={13} /> Apri
                    </button>
                    {photo.status !== 'approved' && (
                      <button
                        onClick={() => updateStatus(photo.id, 'approved')}
                        disabled={updating === photo.id}
                        style={{
                          flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)',
                          background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)',
                          color: '#15803d', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                        }}
                      >
                        {updating === photo.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Approva
                      </button>
                    )}
                    {photo.status !== 'rejected' && (
                      <button
                        onClick={() => updateStatus(photo.id, 'rejected')}
                        disabled={updating === photo.id}
                        style={{
                          flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)',
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                          color: '#b91c1c', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                        }}
                      >
                        {updating === photo.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        Rifiuta
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
