'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, CheckCircle2, Loader2, RefreshCw,
  ArrowRight, FlipHorizontal, Image as ImageIcon, AlertCircle
} from 'lucide-react';

// ─── Config cornici ────────────────────────────────────────────────────────────
const FRAMES: { id: string | null; label: string; emoji: string }[] = [
  { id: null, label: 'Nessuna', emoji: '✕' },
  { id: 'Canvas-27', label: 'Autunnale', emoji: '🍂' },
  { id: 'Canvas-28', label: 'Stregata', emoji: '🎃' },
  { id: 'Frame_34', label: 'PumpKing', emoji: '👑' },
];

// ─── Formato foto: portrait 1080×1350 (4:5) ───────────────────────────────────
const PHOTO_ASPECT = 1080 / 1350; // ≈ 0.8
const OUTPUT_W = 1080;
const OUTPUT_H = 1350;

// ─── Helper: cattura frame video → Blob ───────────────────────────────────────
function captureVideoFrame(
  video: HTMLVideoElement,
  facingMode: 'user' | 'environment'
): { dataUrl: string; blob: Blob } | null {
  const canvas = document.createElement('canvas');
  const videoAspect = video.videoWidth / video.videoHeight;
  let srcW: number, srcH: number, xOffset: number, yOffset: number;

  if (videoAspect > PHOTO_ASPECT) {
    srcH = video.videoHeight;
    srcW = srcH * PHOTO_ASPECT;
    xOffset = (video.videoWidth - srcW) / 2;
    yOffset = 0;
  } else {
    srcW = video.videoWidth;
    srcH = srcW / PHOTO_ASPECT;
    xOffset = 0;
    yOffset = (video.videoHeight - srcH) / 2;
  }

  canvas.width = OUTPUT_W;
  canvas.height = OUTPUT_H;
  const ctx = canvas.getContext('2d')!;

  if (facingMode === 'user') {
    ctx.translate(OUTPUT_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, xOffset, yOffset, srcW, srcH, 0, 0, OUTPUT_W, OUTPUT_H);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  // Converti sincrono dataUrl → Blob
  const byteString = atob(dataUrl.split(',')[1]);
  const arr = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i);
  const blob = new Blob([arr], { type: 'image/jpeg' });

  return { dataUrl, blob };
}

// ─── Helper: File galleria → { dataUrl, blob } ────────────────────────────────
async function fileToPreview(file: File): Promise<{ dataUrl: string; blob: Blob }> {
  // Ridimensiona al volo rispettando il formato portrait
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const imgAspect = img.width / img.height;
        let srcW: number, srcH: number, xOffset: number, yOffset: number;
        if (imgAspect > PHOTO_ASPECT) {
          srcH = img.height;
          srcW = srcH * PHOTO_ASPECT;
          xOffset = (img.width - srcW) / 2;
          yOffset = 0;
        } else {
          srcW = img.width;
          srcH = srcW / PHOTO_ASPECT;
          xOffset = 0;
          yOffset = (img.height - srcH) / 2;
        }
        canvas.width = OUTPUT_W;
        canvas.height = OUTPUT_H;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, xOffset, yOffset, srcW, srcH, 0, 0, OUTPUT_W, OUTPUT_H);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const byteString = atob(dataUrl.split(',')[1]);
        const arr = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) arr[i] = byteString.charCodeAt(i);
        resolve({ dataUrl, blob: new Blob([arr], { type: 'image/jpeg' }) });
      };
      img.onerror = reject;
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Tipi per le fasi ─────────────────────────────────────────────────────────
type Phase = 'camera' | 'preview' | 'uploading' | 'success';

export default function ZuccalandPhotoClient() {
  const [phase, setPhase] = useState<Phase>('camera');
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);

  // Preview (post-scatto, nessun crop)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const frameOverlayUrl = selectedFrame
    ? `https://res.cloudinary.com/${cloudName}/image/upload/w_800/${selectedFrame}.png`
    : null;

  // ── Precarica overlay cornice ──
  useEffect(() => {
    if (!selectedFrame) { setFrameLoaded(true); return; }
    setFrameLoaded(false);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setFrameLoaded(true);
    img.onerror = () => setFrameLoaded(false);
    img.src = `https://res.cloudinary.com/${cloudName}/image/upload/w_800/${selectedFrame}.png`;
  }, [selectedFrame, cloudName]);

  // ── Avvia fotocamera ──
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setCameraReady(false);
    setError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Permesso fotocamera negato. Abilitalo nelle impostazioni del browser.');
      } else if (err.name === 'NotFoundError') {
        setError('Fotocamera non trovata. Usa "Galleria" per caricare una foto.');
      } else {
        setError('Impossibile accedere alla fotocamera. Usa "Galleria".');
      }
    }
  }, []);

  useEffect(() => {
    if (phase === 'camera') {
      startCamera(facingMode);
    } else {
      // Ferma lo stream quando si esce dalla fase camera
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlipCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    startCamera(next);
  };

  // ── Scatta → vai direttamente in preview ──
  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const result = captureVideoFrame(video, facingMode);
    if (!result) return;
    setPreviewDataUrl(result.dataUrl);
    setPreviewBlob(result.blob);
    setPhase('preview');
  }, [cameraReady, facingMode]);

  // ── Galleria → vai direttamente in preview ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) { setError('Solo immagini accettate.'); return; }
    if (file.size > 25 * 1024 * 1024) { setError('Il file non può superare 25 MB.'); return; }
    setError(null);
    try {
      const { dataUrl, blob } = await fileToPreview(file);
      setPreviewDataUrl(dataUrl);
      setPreviewBlob(blob);
      setPhase('preview');
    } catch {
      setError('Errore durante la lettura del file. Riprova.');
    }
  };

  // ── Upload al backend ──
  const handleSubmit = async () => {
    if (!previewBlob) return;
    setPhase('uploading');
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', previewBlob, 'photo.jpg');
      formData.append('frameName', selectedFrame ?? '');
      const res = await fetch('/api/zuccaland/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore upload.');
      setPhase('success');
    } catch (err: any) {
      setError(err.message || 'Errore di rete. Riprova.');
      setPhase('preview');
    }
  };

  // ── Reset ──
  const handleReset = () => {
    setPreviewDataUrl(null);
    setPreviewBlob(null);
    setError(null);
    setPhase('camera');
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdf7f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '1.5rem 1rem 4rem',
    }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '460px', marginBottom: '1.25rem', textAlign: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/zuccaland/Logo.png" alt="Zuccaland" style={{ height: 52, objectFit: 'contain' }} />
      </div>

      <div style={{ maxWidth: '460px', width: '100%' }}>

        {/* Errore */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '1rem',
                padding: '0.85rem 1rem', marginBottom: '1rem',
                display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                color: '#991b1b', fontSize: '0.85rem', lineHeight: 1.5,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ═══ FASE: FOTOCAMERA ═══ */}
          {phase === 'camera' && (
            <motion.div key="camera" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                  color: '#431407', margin: '0 0 0.4rem',
                }}>
                  📸 La tua foto magica
                </h1>
                <p style={{ color: '#9a3412', fontSize: '0.88rem', margin: 0 }}>
                  Scegli la cornice, scatta e condividi!
                </p>
              </div>

              {/* Selettore cornice — griglia */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FRAMES.length}, 1fr)`, gap: '0.45rem', marginBottom: '1rem' }}>
                {FRAMES.map(f => (
                  <button key={String(f.id)} onClick={() => setSelectedFrame(f.id)} style={{
                    padding: '0.65rem 0.25rem', borderRadius: '0.85rem',
                    border: `2px solid ${selectedFrame === f.id ? '#ea580c' : '#eaddd0'}`,
                    background: selectedFrame === f.id ? '#fff7ed' : 'white',
                    color: selectedFrame === f.id ? '#ea580c' : '#78350f',
                    fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', textAlign: 'center',
                    boxShadow: selectedFrame === f.id ? '0 4px 12px rgba(234,88,12,0.15)' : '0 2px 6px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: f.id === null ? '1rem' : '1.2rem', marginBottom: '0.2rem' }}>{f.emoji}</div>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Viewfinder portrait 4:5 */}
              <div style={{
                position: 'relative', width: '100%', aspectRatio: '1080/1350',
                borderRadius: '1.25rem', overflow: 'hidden',
                background: '#1c1c1c', border: '1.5px solid #eaddd0',
                boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                marginBottom: '1rem',
              }}>
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%', objectFit: 'cover',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  }}
                />

                {/* Overlay cornice live — solo se frame selezionata */}
                {frameLoaded && frameOverlayUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={frameOverlayUrl} alt="Cornice" style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover', pointerEvents: 'none', zIndex: 10,
                  }} />
                )}

                {/* Spinner camera */}
                {!cameraReady && !error && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.5)', zIndex: 20,
                  }}>
                    <Loader2 size={32} color="white" className="animate-spin" />
                  </div>
                )}

                {/* Flip camera */}
                <button onClick={handleFlipCamera} style={{
                  position: 'absolute', top: '0.75rem', right: '0.75rem',
                  background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
                  width: 40, height: 40, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 20, backdropFilter: 'blur(4px)',
                }} title="Inverti fotocamera">
                  <FlipHorizontal size={20} color="white" />
                </button>
              </div>

              {/* Azioni */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    padding: '0.9rem 1.1rem', borderRadius: '999px',
                    border: '1.5px solid #eaddd0', background: 'white',
                    color: '#78350f', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', whiteSpace: 'nowrap',
                  }}
                >
                  <ImageIcon size={16} /> Galleria
                </button>
                <button
                  onClick={handleCapture}
                  disabled={!cameraReady}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    background: cameraReady ? 'linear-gradient(135deg, #e07848, #c85a0e)' : '#fed7aa',
                    color: 'white', padding: '1rem 1.5rem',
                    borderRadius: '999px', border: 'none',
                    fontWeight: 800, fontSize: '1rem',
                    cursor: cameraReady ? 'pointer' : 'not-allowed',
                    boxShadow: cameraReady ? '0 4px 16px rgba(200,90,14,0.35)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <Camera size={20} /> Scatta
                </button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*"
                style={{ display: 'none' }} onChange={handleGalleryFile} />

              <div style={{
                marginTop: '1.25rem', background: '#fff7ed', border: '1.5px solid #fed7aa',
                borderRadius: '1rem', padding: '0.85rem 1rem',
                display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
              }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🎃</span>
                <p style={{ color: '#7c2d12', fontSize: '0.78rem', margin: 0, lineHeight: 1.6 }}>
                  La cornice si applica <strong>in tempo reale</strong>! Scegli quella che preferisci e poi scatta. Le foto vengono <strong>revisionate</strong> prima di apparire nell'album.
                </p>
              </div>
            </motion.div>
          )}

          {/* ═══ FASE: ANTEPRIMA ═══ */}
          {phase === 'preview' && previewDataUrl && (
            <motion.div key="preview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  background: '#ea580c', color: 'white',
                  padding: '0.35rem 1rem', borderRadius: '999px',
                  fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase',
                  letterSpacing: '0.08em', boxShadow: '0 4px 14px rgba(234,88,12,0.4)',
                }}>
                  <ImageIcon size={14} /> Anteprima
                </span>
              </div>

              {/* Foto + cornice sovrapposta */}
              <div style={{
                position: 'relative', width: '100%', aspectRatio: '1080/1350',
                borderRadius: '1.25rem', overflow: 'hidden',
                border: '1.5px solid #eaddd0', boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
                marginBottom: '1.25rem',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewDataUrl} alt="Anteprima"
                  style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
                {/* Cornice sovrapposta — solo se selezionata */}
                {frameOverlayUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={frameOverlayUrl} alt="Cornice" style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover', pointerEvents: 'none',
                  }} />
                )}
              </div>

              {/* Selettore cornice in anteprima */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${FRAMES.length}, 1fr)`, gap: '0.45rem', marginBottom: '1.25rem' }}>
                {FRAMES.map(f => (
                  <button key={String(f.id)} onClick={() => setSelectedFrame(f.id)} style={{
                    padding: '0.55rem 0.25rem', borderRadius: '0.75rem',
                    border: `2px solid ${selectedFrame === f.id ? '#ea580c' : '#eaddd0'}`,
                    background: selectedFrame === f.id ? '#fff7ed' : 'white',
                    color: selectedFrame === f.id ? '#ea580c' : '#78350f',
                    fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', textAlign: 'center',
                    boxShadow: selectedFrame === f.id ? '0 4px 12px rgba(234,88,12,0.15)' : '0 2px 6px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: f.id === null ? '0.95rem' : '1.15rem', marginBottom: '0.15rem' }}>{f.emoji}</div>
                    {f.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleReset} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  padding: '0.9rem 1.1rem', borderRadius: '999px',
                  border: '1.5px solid #eaddd0', background: 'white',
                  color: '#78350f', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                }}>
                  <RefreshCw size={16} /> Ricomincia
                </button>
                <button onClick={handleSubmit} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: 'linear-gradient(135deg, #e07848, #c85a0e)',
                  color: 'white', padding: '0.9rem 1.5rem', borderRadius: '999px', border: 'none',
                  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(200,90,14,0.3)',
                }}>
                  Pubblica la foto <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ FASE: CARICAMENTO ═══ */}
          {phase === 'uploading' && (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                background: 'white', borderRadius: '1.5rem', border: '1.5px solid #eaddd0',
                padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}>
              <Loader2 size={40} color="#ea580c" className="animate-spin" style={{ margin: '0 auto 1.25rem' }} />
              <p style={{ color: '#7a4820', fontWeight: 600, fontSize: '1rem', margin: 0 }}>
                Caricamento in corso...
              </p>
              <p style={{ color: '#9a3412', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                La tua foto viene caricata in sicurezza.
              </p>
            </motion.div>
          )}

          {/* ═══ FASE: SUCCESSO ═══ */}
          {phase === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{
                background: 'white', borderRadius: '1.5rem', border: '1.5px solid #eaddd0',
                padding: '2.5rem 2rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: '#f0fdf4', border: '2px solid #86efac',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem', boxShadow: '0 4px 16px rgba(22,163,74,0.12)',
              }}>
                <CheckCircle2 size={36} color="#16a34a" />
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: '#2d1200', margin: '0 0 0.75rem' }}>
                Foto inviata! 🎉
              </h1>
              <p style={{ color: '#7a4820', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1.75rem' }}>
                Grazie! La tua foto è in attesa di approvazione.<br />A breve apparirà nell&apos;album magico di Zuccaland!
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* CTA principale: scatta un'altra */}
                <button onClick={handleReset} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: 'linear-gradient(135deg, #e07848, #c85a0e)',
                  color: 'white', padding: '0.9rem 1.75rem',
                  borderRadius: '999px', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(200,90,14,0.3)',
                }}>
                  <Camera size={18} /> Scatta un&apos;altra foto
                </button>

                {/* Link alla galleria */}
                <a href="/zuccaland/galleria" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.9rem 1.75rem', borderRadius: '999px',
                  border: '1.5px solid #eaddd0', background: '#fff7ed',
                  color: '#7c2d12', fontWeight: 600, fontSize: '0.9rem',
                  textDecoration: 'none',
                }}>
                  🖼️ Vedi la galleria di Zuccaland
                </a>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
