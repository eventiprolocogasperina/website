'use client';

import { useState, useRef } from 'react';
import type { Event, EventAttachment, EventVideo, EventLink } from '@/lib/data/events';
import {
  Loader2, X, Trash2, Save, UploadCloud, Info, Plus,
  FileText, PlayCircle, Link2, ChevronDown, ChevronUp,
  ExternalLink, MapPin, Phone, Mail, AtSign, Share2,
  Ticket, AlertCircle, Eye, Image as ImageIcon,
} from 'lucide-react';
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

// ─── YouTube helpers ──────────────────────────────────────────────────────────
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function getYoutubeThumbnail(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_OPTIONS: { value: EventLink['icon']; label: string; Icon: React.FC<{ size?: number; style?: React.CSSProperties }> }[] = [
  { value: 'external', label: 'Link esterno', Icon: ExternalLink },
  { value: 'map', label: 'Mappa / luogo', Icon: MapPin },
  { value: 'phone', label: 'Telefono', Icon: Phone },
  { value: 'mail', label: 'Email', Icon: Mail },
  { value: 'instagram', label: 'Instagram', Icon: AtSign },
  { value: 'facebook', label: 'Facebook', Icon: Share2 },
  { value: 'ticket', label: 'Biglietti', Icon: Ticket },
  { value: 'info', label: 'Informazioni', Icon: Info },
];

// ─── Shared sub-components ────────────────────────────────────────────────────
function SectionHeader({ icon, label, count, color = 'var(--blue-500)' }: { icon: React.ReactNode; label: string; count: number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--neutral-200)', fontFamily: 'var(--font-body)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--neutral-600)' }}>{count} {count === 1 ? 'elemento' : 'elementi'}</div>
      </div>
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.45rem',
        padding: '0.5rem 1rem', border: '1.5px dashed var(--neutral-700)',
        borderRadius: 'var(--radius-md)', background: 'transparent',
        color: 'var(--neutral-500)', fontSize: '0.8rem', cursor: 'pointer',
        transition: 'all 0.2s', width: '100%', justifyContent: 'center',
        fontFamily: 'var(--font-body)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue-700)';
        (e.currentTarget as HTMLElement).style.color = 'var(--blue-500)';
        (e.currentTarget as HTMLElement).style.background = 'rgba(27,75,170,0.06)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--neutral-700)';
        (e.currentTarget as HTMLElement).style.color = 'var(--neutral-500)';
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <Plus size={14} /> {label}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Rimuovi"
      style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: 'var(--radius-md)',
        background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
        color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.25)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)'; }}
    >
      <Trash2 size={12} />
    </button>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface EventFormProps {
  initialData?: Event;
  onClose: () => void;
  onSave: (event: Event) => void;
  onDelete?: (id: string) => void;
}

const emptyEvent = {
  id: '',
  slug: '',
  title: '',
  date: '',
  dateLabel: '',
  time: 'TBD',
  location: '',
  category: 'cultura' as Event['category'],
  description: '',
  fullDescription: '',
  image: '/img/Event_1.jpeg',
  maxParticipants: 100,
  registeredCount: 0,
  price: 0,
  isFree: false,
  featured: false,
  bookable: false,
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function EventForm({ initialData, onClose, onSave, onDelete }: EventFormProps) {
  const isEdit = !!initialData;

  // Core event fields
  const [formData, setFormData] = useState<typeof emptyEvent>(
    initialData ? { ...emptyEvent, ...initialData } : emptyEvent
  );

  // Config sub-fields (derived from initialData.config)
  const [accentColor, setAccentColor] = useState(initialData?.config?.accentColor ?? '');
  const [tagline, setTagline] = useState(initialData?.config?.tagline ?? '');
  const [hideCapacity, setHideCapacity] = useState(initialData?.config?.hideCapacity ?? false);
  const [hideFreeEntryPanel, setHideFreeEntryPanel] = useState(initialData?.config?.hideFreeEntryPanel ?? false);
  const [logoSrc, setLogoSrc] = useState(initialData?.config?.logoSrc ?? '');
  const [carouselPhotos, setCarouselPhotos] = useState<{src: string; alt?: string}[]>(initialData?.config?.carouselPhotos ?? []);

  // Structured arrays
  const [attachments, setAttachments] = useState<EventAttachment[]>(initialData?.config?.attachments ?? []);
  const [videos, setVideos] = useState<EventVideo[]>(initialData?.config?.videos ?? []);
  const [links, setLinks] = useState<EventLink[]>(initialData?.config?.links ?? []);

  // Advanced JSON (for extraSections legacy)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const legacyConfig = initialData?.config
    ? (() => {
        const { accentColor: _, tagline: __, hideCapacity: ___, hideFreeEntryPanel: _____, attachments: ____, videos: ______, links: _______, logoSrc: ________, carouselPhotos: _________, ...rest } = initialData.config;
        return Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '';
      })()
    : '';
  const [advancedJson, setAdvancedJson] = useState(legacyConfig);
  const [jsonError, setJsonError] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingImage, setPendingImage] = useState(false);
  const [pendingLogo, setPendingLogo] = useState(false);

  // ── Attachment helpers ────────────────────────────────────────────────────
  const addAttachment = () => setAttachments(p => [...p, { label: '', url: '' }]);
  const updateAttachment = (i: number, field: keyof EventAttachment, val: string) =>
    setAttachments(p => p.map((a, idx) => idx === i ? { ...a, [field]: val } : a));
  const removeAttachment = (i: number) => setAttachments(p => p.filter((_, idx) => idx !== i));

  // ── Video helpers ─────────────────────────────────────────────────────────
  const addVideo = () => setVideos(p => [...p, { title: '', youtubeUrl: '' }]);
  const updateVideo = (i: number, field: keyof EventVideo, val: string) =>
    setVideos(p => p.map((v, idx) => idx === i ? { ...v, [field]: val } : v));
  const removeVideo = (i: number) => setVideos(p => p.filter((_, idx) => idx !== i));

  // ── Link helpers ──────────────────────────────────────────────────────────
  const addLink = () => setLinks(p => [...p, { label: '', url: '', icon: 'external' }]);
  const updateLink = (i: number, field: keyof EventLink, val: string) =>
    setLinks(p => p.map((l, idx) => idx === i ? { ...l, [field]: val as EventLink['icon'] } : l));
  const removeLink = (i: number) => setLinks(p => p.filter((_, idx) => idx !== i));

  // ── Generic field handler ─────────────────────────────────────────────────
  const handleChange = (field: keyof typeof emptyEvent) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));
    };

  const generateSlug = () => {
    const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData(prev => ({ ...prev, slug, id: prev.id || Date.now().toString() }));
  };

  // Image and Logo uploads are now handled by ImageUpload component

  const carouselInputRef = useRef<HTMLInputElement>(null);

  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Reset immediately so the same files can be picked again later
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

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingImage || pendingLogo) {
      setError("Attenzione: un'immagine è in sospeso. Conferma il ritaglio cliccando su 'Taglia & Carica' o annulla prima di salvare.");
      return;
    }
    setLoading(true);
    setError('');
    setJsonError('');

    // Parse advanced JSON
    let extraConfig: object = {};
    if (advancedJson.trim() && advancedJson.trim() !== '{}') {
      try { extraConfig = JSON.parse(advancedJson); }
      catch {
        setJsonError('Il JSON avanzato non è valido. Correggilo prima di salvare.');
        setLoading(false);
        return;
      }
    }

    const config = {
      ...(accentColor ? { accentColor } : {}),
      ...(tagline ? { tagline } : {}),
      ...(hideCapacity ? { hideCapacity } : {}),
      ...(hideFreeEntryPanel ? { hideFreeEntryPanel } : {}),
      ...(logoSrc ? { logoSrc } : {}),
      ...(carouselPhotos.length ? { carouselPhotos } : {}),
      ...(attachments.filter(a => a.label && a.url).length ? { attachments: attachments.filter(a => a.label && a.url) } : {}),
      ...(videos.filter(v => v.title && v.youtubeUrl).length ? { videos: videos.filter(v => v.title && v.youtubeUrl) } : {}),
      ...(links.filter(l => l.label && l.url).length ? { links: links.filter(l => l.label && l.url) } : {}),
      ...extraConfig,
    };

    const payload = {
      ...formData,
      config: Object.keys(config).length ? config : null,
    };

    try {
      const url = isEdit ? `/api/events/${formData.id}` : '/api/events';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Errore nel salvataggio');
      const saved = await res.json();
      onSave(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Qualcosa è andato storto');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem',
    }}>
      <div style={{
        background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '960px',
        maxHeight: '94vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--neutral-800)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--neutral-950)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: isEdit ? 'var(--blue-500)' : 'var(--gold-500)',
              boxShadow: isEdit ? '0 0 8px rgba(58,109,232,0.6)' : '0 0 8px rgba(232,169,26,0.6)',
            }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-heading)', fontFamily: 'var(--font-body)' }}>
              {isEdit ? `Modifica: ${initialData?.title}` : 'Nuovo Evento'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
              color: 'var(--neutral-400)', cursor: 'pointer',
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--neutral-700)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-heading)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--neutral-800)'; (e.currentTarget as HTMLElement).style.color = 'var(--neutral-400)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem', scrollbarWidth: 'thin' }}>
          <form id="event-form" onSubmit={handleSubmit}>

            {/* ════════════════════════════════════════════════════
                BLOCCO 1 — Identità evento
            ════════════════════════════════════════════════════ */}
            <div className="admin-grid-2" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="label">Titolo dell'evento *</label>
                  <input
                    required className="input"
                    value={formData.title}
                    onChange={handleChange('title')}
                    onBlur={!isEdit ? generateSlug : undefined}
                    placeholder="Es. Festa di San Nicola 2026"
                  />
                </div>
                <div>
                  <label className="label">Slug (URL) *</label>
                  <input required className="input" value={formData.slug} onChange={handleChange('slug')} placeholder="festa-san-nicola-2026" />
                </div>
                <div>
                  <label className="label">Categoria</label>
                  <select className="input" value={formData.category} onChange={handleChange('category')}>
                    <option value="cultura">🏛 Cultura</option>
                    <option value="musica">🎵 Musica</option>
                    <option value="gastronomia">🍴 Gastronomia</option>
                    <option value="sport">⚽ Sport</option>
                    <option value="comunità">🤝 Comunità</option>
                  </select>
                </div>
              </div>

              {/* Image upload */}
              <div style={{ minWidth: '0' }}>
                <ImageUpload
                  label="Immagine di Copertina *"
                  value={formData.image}
                  onChange={(url) => setFormData(prev => ({ ...prev, image: url }))}
                  onPendingChange={setPendingImage}
                  folder="pro-loco-gasperina/eventi"
                  previewHeight={140}
                />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════
                BLOCCO 2 — Logistica
            ════════════════════════════════════════════════════ */}
            <div style={{
              background: 'var(--neutral-950)', padding: '1.25rem',
              borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem',
              border: '1px solid var(--neutral-800)',
            }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neutral-600)', fontFamily: 'var(--font-body)', marginBottom: '1rem' }}>
                Logistica
              </p>
              <div className="admin-grid-2">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div className="admin-grid-2" style={{ gap: '0.9rem' }}>
                    <div>
                      <label className="label">Data *</label>
                      <input type="date" required className="input" value={formData.date} onChange={handleChange('date')} />
                    </div>
                    <div>
                      <label className="label">Ora *</label>
                      <input required className="input" value={formData.time} onChange={handleChange('time')} placeholder="21:00" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Luogo *</label>
                    <input required className="input" value={formData.location} onChange={handleChange('location')} placeholder="Piazza Municipio, Gasperina" />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div>
                    <label className="label">Etichetta data (opzionale)</label>
                    <input className="input" value={formData.dateLabel ?? ''} onChange={handleChange('dateLabel')} placeholder="Es. 1–3 agosto 2026" />
                    <p style={{ fontSize: '0.65rem', color: 'var(--neutral-600)', marginTop: '0.35rem' }}>Sovrascrive la data precisa nelle card</p>
                  </div>
                  <div className="admin-grid-2" style={{ gap: '0.9rem' }}>
                    <div>
                      <label className="label">Prezzo (€)</label>
                      <input type="number" required className="input" value={formData.price} onChange={handleChange('price')} min={0} step={0.5} />
                    </div>
                    <div>
                      <label className="label">Posti Max</label>
                      <input type="number" required className="input" value={formData.maxParticipants} onChange={handleChange('maxParticipants')} min={0} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════
                BLOCCO 3 — Toggle flags
            ════════════════════════════════════════════════════ */}
            <div style={{
              display: 'flex', gap: '0.75rem', marginBottom: '1.5rem',
              padding: '0.75rem', background: 'var(--neutral-950)',
              borderRadius: 'var(--radius-lg)', border: '1px solid var(--neutral-800)',
            }}>
              {[
                { field: 'featured' as const, label: '⭐ In evidenza (Home)', color: 'var(--gold-500)' },
                { field: 'bookable' as const, label: '📋 Abilita Prenotazioni', color: 'var(--blue-500)' },
                { field: 'isFree' as const, label: '🎁 Evento Gratuito', color: '#4ade80' },
              ].map(({ field, label, color }) => (
                <label key={field} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem',
                  color: formData[field] ? color : 'var(--neutral-400)',
                  fontSize: '0.8rem', fontWeight: formData[field] ? 600 : 400,
                  padding: '0.6rem 0.75rem', cursor: 'pointer',
                  borderRadius: 'var(--radius-md)', transition: 'all 0.2s',
                  background: formData[field] ? `${color}12` : 'transparent',
                  border: formData[field] ? `1px solid ${color}30` : '1px solid transparent',
                }}>
                  <input
                    type="checkbox"
                    checked={formData[field] as boolean}
                    onChange={handleChange(field)}
                    style={{ width: 15, height: 15, accentColor: color, cursor: 'pointer' }}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* ════════════════════════════════════════════════════
                BLOCCO 4 — Descrizioni
            ════════════════════════════════════════════════════ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="label">Descrizione Breve * <span style={{ color: 'var(--neutral-600)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(mostrata nelle card)</span></label>
                <textarea required className="input" rows={2} value={formData.description} onChange={handleChange('description')} placeholder="Un riassunto rapido per le card della lista eventi..." />
              </div>
              <div>
                <label className="label">Descrizione Completa * <span style={{ color: 'var(--neutral-600)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(pagina evento)</span></label>
                <textarea required className="input" rows={5} value={formData.fullDescription} onChange={handleChange('fullDescription')} placeholder="Tutti i dettagli dell'evento, il programma, cosa aspettarsi..." />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════
                BLOCCO 5 — Allegati PDF
            ════════════════════════════════════════════════════ */}
            <div style={{
              background: 'var(--neutral-950)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--neutral-800)', padding: '1.25rem',
              marginBottom: '1.25rem',
            }}>
              <SectionHeader
                icon={<FileText size={15} style={{ color: '#f87171' }} />}
                label="Allegati PDF"
                count={attachments.length}
                color="#f87171"
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 2fr auto',
                      gap: '0.6rem', alignItems: 'center',
                      padding: '0.85rem', background: 'rgba(248,113,113,0.05)',
                      border: '1px solid rgba(248,113,113,0.15)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <label style={{ fontSize: '0.65rem', color: 'var(--neutral-600)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Etichetta</label>
                      <input
                        className="input"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                        value={att.label}
                        onChange={e => updateAttachment(i, 'label', e.target.value)}
                        placeholder="Locandina"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.65rem', color: 'var(--neutral-600)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>URL del PDF</label>
                      <input
                        className="input"
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                        value={att.url}
                        onChange={e => updateAttachment(i, 'url', e.target.value)}
                        placeholder="https://drive.google.com/..."
                        type="url"
                      />
                    </div>
                    <div style={{ paddingTop: '1.4rem' }}>
                      <RemoveButton onClick={() => removeAttachment(i)} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: attachments.length ? '0.75rem' : 0 }}>
                <AddButton onClick={addAttachment} label="Aggiungi allegato PDF" />
              </div>

              <p style={{ fontSize: '0.68rem', color: 'var(--neutral-600)', marginTop: '0.6rem' }}>
                💡 Carica il PDF su <strong style={{ color: 'var(--neutral-500)' }}>Google Drive</strong> o <strong style={{ color: 'var(--neutral-500)' }}>Cloudinary</strong> e incolla l'URL diretto qui.
              </p>
            </div>

            {/* ════════════════════════════════════════════════════
                BLOCCO 6 — Video YouTube
            ════════════════════════════════════════════════════ */}
            <div style={{
              background: 'var(--neutral-950)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--neutral-800)', padding: '1.25rem',
              marginBottom: '1.25rem',
            }}>
              <SectionHeader
                icon={<PlayCircle size={15} style={{ color: '#ff4444' }} />}
                label="Video YouTube"
                count={videos.length}
                color="#ff4444"
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {videos.map((vid, i) => {
                  const thumb = getYoutubeThumbnail(vid.youtubeUrl);
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'grid', gridTemplateColumns: thumb ? '100px 1fr auto' : '1fr auto',
                        gap: '0.75rem', alignItems: 'flex-start',
                        padding: '0.85rem', background: 'rgba(255,68,68,0.04)',
                        border: '1px solid rgba(255,68,68,0.12)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      {thumb && (
                        <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', aspectRatio: '16/9' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={thumb} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 0, height: 0, borderLeft: '7px solid white', borderTop: '4px solid transparent', borderBottom: '4px solid transparent', marginLeft: 2 }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          className="input"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                          value={vid.title}
                          onChange={e => updateVideo(i, 'title', e.target.value)}
                          placeholder="Titolo del video"
                        />
                        <input
                          className="input"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                          value={vid.youtubeUrl}
                          onChange={e => updateVideo(i, 'youtubeUrl', e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          type="url"
                        />
                        <input
                          className="input"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--neutral-400)' }}
                          value={vid.description ?? ''}
                          onChange={e => updateVideo(i, 'description', e.target.value)}
                          placeholder="Descrizione breve (opzionale)"
                        />
                      </div>
                      <div>
                        <RemoveButton onClick={() => removeVideo(i)} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: videos.length ? '0.75rem' : 0 }}>
                <AddButton onClick={addVideo} label="Aggiungi video YouTube" />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════
                BLOCCO 7 — Link Utili
            ════════════════════════════════════════════════════ */}
            <div style={{
              background: 'var(--neutral-950)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--neutral-800)', padding: '1.25rem',
              marginBottom: '1.25rem',
            }}>
              <SectionHeader
                icon={<Link2 size={15} style={{ color: 'var(--blue-500)' }} />}
                label="Link Utili"
                count={links.length}
                color="var(--blue-500)"
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {links.map((lnk, i) => {
                  const iconDef = ICON_OPTIONS.find(o => o.value === lnk.icon);
                  const IconComp = iconDef?.Icon;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'grid', gridTemplateColumns: '120px 1fr 1fr auto',
                        gap: '0.6rem', alignItems: 'center',
                        padding: '0.85rem', background: 'rgba(27,75,170,0.06)',
                        border: '1px solid rgba(27,75,170,0.15)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      {/* Icon picker */}
                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--neutral-600)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Icona</label>
                        <div style={{ position: 'relative' }}>
                          <select
                            className="input"
                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', paddingLeft: IconComp ? '2rem' : '0.75rem' }}
                            value={lnk.icon ?? 'external'}
                            onChange={e => updateLink(i, 'icon', e.target.value)}
                          >
                            {ICON_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          {IconComp && (
                            <div style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                              <IconComp size={12} style={{ color: 'var(--blue-500)' }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--neutral-600)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Testo</label>
                        <input
                          className="input"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                          value={lnk.label}
                          onChange={e => updateLink(i, 'label', e.target.value)}
                          placeholder="Acquista biglietti"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--neutral-600)', display: 'block', marginBottom: '0.3rem', fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>URL</label>
                        <input
                          className="input"
                          style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                          value={lnk.url}
                          onChange={e => updateLink(i, 'url', e.target.value)}
                          placeholder="https://..."
                          type="url"
                        />
                      </div>
                      <div style={{ paddingTop: '1.4rem' }}>
                        <RemoveButton onClick={() => removeLink(i)} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: links.length ? '0.75rem' : 0 }}>
                <AddButton onClick={addLink} label="Aggiungi link utile" />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════
                BLOCCO 7B — Foto Carosello
            ════════════════════════════════════════════════════ */}
            <div style={{
              background: 'var(--neutral-950)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--neutral-800)', padding: '1.25rem',
              marginBottom: '1.25rem',
            }}>
              <SectionHeader
                icon={<ImageIcon size={15} style={{ color: '#c084fc' }} />}
                label="Foto Carosello"
                count={carouselPhotos.length}
                color="#c084fc"
              />

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
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', margin: 0 }}>Queste foto appariranno in un carosello scorrevole nella pagina dell'evento.</p>
            </div>

            {/* ════════════════════════════════════════════════════
                BLOCCO 8 — Design avanzato
            ════════════════════════════════════════════════════ */}
            <div style={{
              background: 'var(--neutral-950)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--neutral-800)', marginBottom: '0.5rem', overflow: 'hidden',
            }}>
              {/* Compact row: accent color + tagline + hideCapacity */}
              <div className="admin-grid-auto" style={{ padding: '1rem 1.25rem' }}>
                <div>
                  <label className="label" style={{ marginBottom: '0.4rem' }}>Colore accento</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={accentColor || '#E8A91A'}
                      onChange={e => setAccentColor(e.target.value)}
                      style={{ width: 36, height: 36, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'transparent', padding: 0 }}
                    />
                    <input
                      className="input"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', flex: 1 }}
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      placeholder="#E8A91A"
                    />
                  </div>
                </div>
                <div>
                  <label className="label" style={{ marginBottom: '0.4rem' }}>Tagline</label>
                  <input
                    className="input"
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="Un breve motto sotto il titolo dell'evento..."
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1.4rem' }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: hideCapacity ? 'var(--gold-400)' : 'var(--neutral-500)',
                    fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-body)',
                  }}>
                    <input
                      type="checkbox"
                      checked={hideCapacity}
                      onChange={e => setHideCapacity(e.target.checked)}
                      style={{ accentColor: 'var(--gold-500)' }}
                    />
                    Nascondi capacità
                  </label>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: hideFreeEntryPanel ? 'var(--gold-400)' : 'var(--neutral-500)',
                    fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-body)',
                  }}>
                    <input
                      type="checkbox"
                      checked={hideFreeEntryPanel}
                      onChange={e => setHideFreeEntryPanel(e.target.checked)}
                      style={{ accentColor: 'var(--gold-500)' }}
                    />
                    Nascondi "Ingresso Libero"
                  </label>
                </div>
                <div style={{ paddingLeft: '1rem', borderLeft: '1px solid var(--neutral-800)', minWidth: '150px' }}>
                  <ImageUpload
                    label="Logo Evento (PNG)"
                    value={logoSrc}
                    onChange={(url) => setLogoSrc(url)}
                    onPendingChange={setPendingLogo}
                    folder="pro-loco-gasperina/eventi-loghi"
                    previewHeight={40}
                  />
                </div>
              </div>

              {/* Accordion JSON avanzato */}
              <button
                type="button"
                onClick={() => setShowAdvanced(p => !p)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.7rem 1.25rem', background: 'rgba(255,255,255,0.02)',
                  borderTop: '1px solid var(--neutral-800)', border: 'none',
                  color: 'var(--neutral-500)', fontSize: '0.75rem', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--neutral-300)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--neutral-500)'}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Info size={12} /> JSON avanzato (extraSections, legacy)
                </span>
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAdvanced && (
                <div style={{ padding: '0.75rem 1.25rem 1.25rem' }}>
                  <textarea
                    className="input"
                    rows={6}
                    style={{ fontFamily: 'monospace', fontSize: '0.72rem', resize: 'vertical', background: '#070709', color: '#a8b4c8' }}
                    value={advancedJson}
                    onChange={e => { setAdvancedJson(e.target.value); setJsonError(''); }}
                    placeholder='{ "extraSections": [] }'
                    spellCheck={false}
                  />
                  {jsonError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                      <AlertCircle size={12} /> {jsonError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Global error */}
            {error && (
              <div style={{
                color: '#f87171', fontSize: '0.8rem', padding: '0.75rem 1rem',
                background: 'rgba(248,113,113,0.08)', borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginTop: '0.75rem',
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

          </form>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid var(--neutral-800)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--neutral-950)', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
          flexShrink: 0,
        }}>
          {isEdit ? (
            <button
              type="button"
              onClick={() => onDelete && onDelete(formData.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                color: 'var(--neutral-500)', background: 'none', border: 'none',
                padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem',
                borderRadius: 'var(--radius-md)', transition: 'all 0.2s',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--neutral-500)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Trash2 size={13} /> Elimina evento
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {isEdit && (
              <a
                href={`/eventi/${formData.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  color: 'var(--neutral-400)', fontSize: '0.8rem',
                  padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--neutral-700)', transition: 'all 0.2s',
                  fontFamily: 'var(--font-body)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-heading)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--neutral-500)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--neutral-400)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--neutral-700)'; }}
              >
                <Eye size={13} /> Anteprima
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                color: 'var(--neutral-400)', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem 0.9rem',
                fontFamily: 'var(--font-body)',
              }}
            >
              Annulla
            </button>
            <button
              type="submit"
              form="event-form"
              disabled={loading || pendingImage || pendingLogo}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', minWidth: '140px' }}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {loading ? 'Salvataggio...' : isEdit ? 'Salva Modifiche' : 'Crea Evento'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
