'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  /** Current image URL (shown as preview) */
  value?: string;
  /** Called with the new Cloudinary URL after upload */
  onChange: (url: string) => void;
  /** Cloudinary folder to upload into */
  folder?: string;
  label?: string;
  /** Max preview height in px */
  previewHeight?: number;
}

export default function ImageUpload({
  value,
  onChange,
  folder = 'pro-loco-gasperina',
  label = 'Immagine',
  previewHeight = 200,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Solo immagini sono accettate');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Il file non può superare 10 MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        onChange(data.url);
      } else {
        setError(data.error || 'Upload fallito');
      }
    } catch (e: any) {
      setError(e.message || 'Errore di rete');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.5rem', fontWeight: 500 }}>
          {label}
        </label>
      )}

      {/* Preview */}
      {value && !uploading && (
        <div style={{ position: 'relative', marginBottom: '0.75rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: previewHeight }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button
            onClick={() => onChange('')}
            style={{
              position: 'absolute', top: '0.5rem', right: '0.5rem',
              background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
              width: 28, height: 28, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white',
            }}
            title="Rimuovi immagine"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? 'var(--blue-500)' : 'var(--neutral-700)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragOver ? 'rgba(27,75,170,0.08)' : 'transparent',
          transition: 'all 0.2s',
        }}
      >
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--neutral-400)' }}>
            <Loader2 size={24} className="animate-spin" />
            <span style={{ fontSize: '0.85rem' }}>Caricamento in corso...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            {value ? <ImageIcon size={20} style={{ color: 'var(--blue-500)' }} /> : <Upload size={20} style={{ color: 'var(--neutral-500)' }} />}
            <span style={{ fontSize: '0.85rem', color: 'var(--neutral-400)' }}>
              {value ? 'Clicca per cambiare immagine' : 'Clicca o trascina un file qui'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-600)' }}>PNG, JPG, WEBP · max 10 MB</span>
          </div>
        )}
      </div>

      {/* URL manuale come alternativa */}
      <div style={{ marginTop: '0.5rem' }}>
        <input
          type="url"
          placeholder="...oppure incolla un URL immagine"
          value={value?.startsWith('http') ? value : ''}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            background: 'var(--neutral-800)',
            border: '1px solid var(--neutral-700)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-body)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <p style={{ fontSize: '0.75rem', color: 'rgba(239,68,68,0.9)', marginTop: '0.35rem' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
