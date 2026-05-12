'use client';

import { useState } from 'react';
import type { Event } from '@/lib/data/events';
import { Loader2, X, Trash2, Save, UploadCloud, Info } from 'lucide-react';

const compressImage = (file: File): Promise<string> => {
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
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // 80% quality JPEG
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

interface EventFormProps {
  initialData?: Event;
  onClose: () => void;
  onSave: (event: Event) => void;
  onDelete?: (id: string) => void;
}

const emptyEvent: Omit<Event, 'config'> & { config: string } = {
  id: '',
  slug: '',
  title: '',
  date: '',
  dateLabel: '',
  time: 'TBD',
  location: '',
  category: 'cultura',
  description: '',
  fullDescription: '',
  image: '/img/Event_1.jpeg',
  maxParticipants: 100,
  registeredCount: 0,
  price: 0,
  isFree: false,
  featured: false,
  bookable: false,
  config: '{}',
};

export default function EventForm({ initialData, onClose, onSave, onDelete }: EventFormProps) {
  // Normalise config to a pretty-printed JSON string for the textarea
  const toConfigStr = (ev?: Event) =>
    ev?.config ? JSON.stringify(ev.config, null, 2) : '{}';

  const [formData, setFormData] = useState<typeof emptyEvent>(
    initialData
      ? { ...initialData, config: toConfigStr(initialData) }
      : emptyEvent
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configError, setConfigError] = useState('');

  const isEdit = !!initialData;

  const handleChange = (field: keyof Event) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'immagine è troppo grande. Massimo 5MB ammessi.');
      return;
    }

    try {
      setLoading(true);
      const base64Image = await compressImage(file);
      setFormData(prev => ({ ...prev, image: base64Image }));
      setError('');
    } catch (err) {
      setError('Errore durante il caricamento dell\'immagine.');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData(prev => ({ ...prev, slug, id: prev.id || Date.now().toString() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setConfigError('');

    // Parse config JSON before sending
    let parsedConfig: object | null = null;
    try {
      const trimmed = (formData.config as unknown as string).trim();
      parsedConfig = trimmed && trimmed !== '{}' ? JSON.parse(trimmed) : null;
    } catch {
      setConfigError('Il JSON di configurazione non è valido. Correggilo prima di salvare.');
      setLoading(false);
      return;
    }

    try {
      const url = isEdit ? `/api/events/${formData.id}` : '/api/events';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, config: parsedConfig }),
      });

      if (!res.ok) {
        throw new Error('Errore nel salvataggio');
      }

      const savedEvent = await res.json();
      onSave(savedEvent);
    } catch (err: any) {
      setError(err.message || 'Qualcosa è andato storto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '1rem'
    }}>
      <div style={{
        background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '900px',
        maxHeight: '95vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
      }}>
        
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--neutral-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--neutral-950)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '100%', height: '10px', borderRadius: '50%', background: isEdit ? 'var(--blue-500)' : 'var(--gold-500)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--white)' }}>
              {isEdit ? 'Modifica Evento' : 'Nuovo Evento'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'var(--neutral-800)', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1, scrollbarWidth: 'thin' }}>
          <form id="event-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* ── SEZIONE 1: INFO BASE ────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="label">Titolo dell'evento *</label>
                  <input required className="input" value={formData.title} onChange={handleChange('title')} onBlur={!isEdit ? generateSlug : undefined} placeholder="Es. Festival della Birra" />
                </div>
                <div>
                  <label className="label">Slug (URL personalizzata) *</label>
                  <input required className="input" value={formData.slug} onChange={handleChange('slug')} placeholder="es-festival-birra" />
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label className="label">Immagine di Copertina *</label>
                <div style={{ 
                  border: '2px dashed var(--neutral-800)', borderRadius: 'var(--radius-lg)', 
                  padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', 
                  gap: '1rem', background: 'var(--neutral-950)', minHeight: '160px', justifyContent: 'center'
                }}>
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                  ) : (
                    <UploadCloud size={40} style={{ color: 'var(--neutral-700)' }} />
                  )}
                  <label style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                    padding: '0.5rem 1rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
                    borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--white)', transition: 'all 0.2s'
                  }}>
                    <UploadCloud size={14} /> {formData.image ? 'Cambia Immagine' : 'Carica Immagine'}
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </div>

            {/* ── SEZIONE 2: LOGISTICA ────────────────────────────────── */}
            <div style={{ background: 'var(--neutral-950)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Data *</label>
                    <input type="date" required className="input" value={formData.date} onChange={handleChange('date')} />
                  </div>
                  <div>
                    <label className="label">Ora *</label>
                    <input required className="input" value={formData.time} onChange={handleChange('time')} placeholder="19:00" />
                  </div>
                </div>
                <div>
                  <label className="label">Luogo *</label>
                  <input required className="input" value={formData.location} onChange={handleChange('location')} placeholder="Piazza Municipio" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="label">Etichetta data (opzionale)</label>
                  <input className="input" value={formData.dateLabel ?? ''} onChange={handleChange('dateLabel')} placeholder="Es. Estate 2026" />
                  <p style={{ fontSize: '0.65rem', color: 'var(--neutral-600)', marginTop: '0.4rem' }}>Verrà mostrata al posto della data precisa</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Prezzo (€)</label>
                    <input type="number" required className="input" value={formData.price} onChange={handleChange('price')} />
                  </div>
                  <div>
                    <label className="label">Posti Max</label>
                    <input type="number" required className="input" value={formData.maxParticipants} onChange={handleChange('maxParticipants')} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── SEZIONE 3: VISIBILITÀ & PRENOTAZIONI ──────────────────── */}
            <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--neutral-950)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--neutral-800)' }}>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--neutral-300)', fontSize: '0.8rem', padding: '0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-md)', transition: 'background 0.2s' }}>
                <input type="checkbox" checked={formData.featured} onChange={handleChange('featured')} style={{ width: '16px', height: '16px', accentColor: 'var(--gold-500)' }} />
                <span>In evidenza (Home)</span>
              </label>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--neutral-300)', fontSize: '0.8rem', padding: '0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-md)', transition: 'background 0.2s' }}>
                <input type="checkbox" checked={formData.bookable} onChange={handleChange('bookable')} style={{ width: '16px', height: '16px', accentColor: 'var(--blue-500)' }} />
                <span>Abilita Prenotazioni</span>
              </label>
              <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#4ade80', fontSize: '0.8rem', fontWeight: 500, padding: '0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-md)', transition: 'background 0.2s' }}>
                <input type="checkbox" checked={formData.isFree} onChange={handleChange('isFree')} style={{ width: '16px', height: '16px', accentColor: '#4ade80' }} />
                <span>Evento Gratuito</span>
              </label>
            </div>

            {/* ── SEZIONE 4: DESCRIZIONI ───────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label">Descrizione Breve *</label>
                <textarea required className="input" rows={2} value={formData.description} onChange={handleChange('description')} placeholder="Un riassunto rapido per le card..." />
              </div>
              <div>
                <label className="label">Descrizione Completa *</label>
                <textarea required className="input" rows={4} value={formData.fullDescription} onChange={handleChange('fullDescription')} placeholder="Tutti i dettagli dell'evento..." />
              </div>
            </div>

            {/* ── SEZIONE 5: PERSONALIZZAZIONE (RCM) ────────────────────── */}
            <div style={{ borderTop: '1px solid var(--neutral-800)', paddingTop: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="label" style={{ margin: 0 }}>Design Avanzato (JSON)</label>
                  <Info size={14} style={{ color: 'var(--neutral-600)' }} />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--neutral-500)' }}>accentColor, tagline, extraSections</span>
              </div>
              <textarea
                className="input"
                rows={6}
                style={{ fontFamily: 'monospace', fontSize: '0.75rem', resize: 'vertical', background: '#0a0a0a' }}
                value={formData.config as unknown as string}
                onChange={e => setFormData(prev => ({ ...prev, config: e.target.value as any }))}
                placeholder='{ "accentColor": "#d97706", "tagline": "...", "extraSections": [] }'
                spellCheck={false}
              />
              {configError && (
                <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                   <X size={12} /> {configError}
                </div>
              )}
            </div>

            {error && <div style={{ color: '#f87171', fontSize: '0.8rem', padding: '0.75rem', background: 'rgba(248,113,113,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(248,113,113,0.2)' }}>{error}</div>}
          </form>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--neutral-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--neutral-950)', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)' }}>
          {isEdit ? (
            <button 
              type="button" 
              onClick={() => onDelete && onDelete(formData.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neutral-400)', background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', transition: 'color 0.2s' }}
              onMouseOver={e => e.currentTarget.style.color = '#f87171'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--neutral-400)'}
            >
              <Trash2 size={14} /> Elimina
            </button>
          ) : <div/>}

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button type="button" onClick={onClose} style={{ color: 'var(--neutral-400)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              Annulla
            </button>
            <button type="submit" form="event-form" disabled={loading} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', minWidth: '140px' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? 'Salva Modifiche' : 'Crea Evento'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
