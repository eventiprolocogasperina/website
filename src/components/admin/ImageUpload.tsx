'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, ImageIcon, Crop as CropIcon, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';

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

  // Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('image');

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUploadCropped = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Get the cropped image as Blob
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      // 2. Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', croppedBlob, selectedFileName.replace(/\.[^/.]+$/, "") + ".jpg");
      formData.append('folder', folder);

      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        throw new Error('Errore del server (probabilmente file troppo grande o errore di connessione)');
      }
      
      const data = await res.json();

      if (data.success) {
        onChange(data.url);
        // Reset cropper state
        setImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
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
    if (file) readFile(file);
    // Reset input so the same file can be selected again if needed
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const readFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Solo immagini sono accettate');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Il file non può superare 20 MB');
      return;
    }
    setError(null);
    setSelectedFileName(file.name);
    
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result?.toString() || null);
    });
    reader.readAsDataURL(file);
  };

  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.5rem', fontWeight: 500 }}>
          {label}
        </label>
      )}

      {/* Preview */}
      {value && !uploading && !imageSrc && (
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
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Cropper UI Modal-like inline */}
      {imageSrc && (
        <div style={{ position: 'relative', width: '100%', height: '400px', background: '#333', marginBottom: '1rem', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={16 / 10}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div style={{
            position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '0.5rem', zIndex: 10, background: 'rgba(0,0,0,0.8)', padding: '0.5rem', borderRadius: '8px', width: '80%', maxWidth: '300px'
          }}>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
            <button
              onClick={() => setImageSrc(null)}
              disabled={uploading}
              type="button"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.5rem 0.75rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
                color: 'white', borderRadius: 'var(--radius-sm)', cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem'
              }}
            >
              <X size={16} /> Annulla
            </button>
            <button
              onClick={handleUploadCropped}
              disabled={uploading}
              type="button"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.5rem 0.75rem', background: 'var(--blue-600)', border: 'none',
                color: 'white', borderRadius: 'var(--radius-sm)', cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem', fontWeight: 500
              }}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {uploading ? 'Caricamento...' : 'Taglia & Carica'}
            </button>
          </div>
        </div>
      )}

      {/* Drop zone (hidden if cropping) */}
      {!imageSrc && (
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
              {value ? <CropIcon size={20} style={{ color: 'var(--blue-500)' }} /> : <Upload size={20} style={{ color: 'var(--neutral-500)' }} />}
              <span style={{ fontSize: '0.85rem', color: 'var(--neutral-400)' }}>
                {value ? 'Sostituisci / Ritaglia nuova' : 'Clicca o trascina un file qui'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--neutral-600)' }}>Il file verrà ritagliato automaticamente</span>
            </div>
          )}
        </div>
      )}

      {/* URL manuale come alternativa */}
      {!imageSrc && (
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
      )}

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
