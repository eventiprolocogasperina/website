'use client';

import { useState } from 'react';
import type { Event } from '@/lib/data/events';
import { Loader2, X, Trash2, Save, UploadCloud } from 'lucide-react';

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

const emptyEvent: Event = {
  id: '',
  slug: '',
  title: '',
  date: '',
  time: 'TBD',
  location: '',
  category: 'cultura',
  description: '',
  fullDescription: '',
  image: '/img/Event_1.jpeg',
  maxParticipants: 100,
  registeredCount: 0,
  price: 0,
  featured: false,
  bookable: false,
};

export default function EventForm({ initialData, onClose, onSave, onDelete }: EventFormProps) {
  const [formData, setFormData] = useState<Event>(initialData || emptyEvent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    try {
      const url = isEdit ? `/api/events/${formData.id}` : '/api/events';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '2rem'
    }}>
      <div style={{
        background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)',
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '800px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--neutral-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--white)' }}>
            {isEdit ? 'Modifica Evento' : 'Nuovo Evento'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
          <form id="event-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Title & Slug */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Titolo *</label>
                <input required className="input" value={formData.title} onChange={handleChange('title')} onBlur={!isEdit ? generateSlug : undefined} />
              </div>
              <div>
                <label className="label">Slug (URL) *</label>
                <input required className="input" value={formData.slug} onChange={handleChange('slug')} />
              </div>
            </div>

            {/* Date, Time, Location */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Data (YYYY-MM-DD) *</label>
                <input type="date" required className="input" value={formData.date} onChange={handleChange('date')} />
              </div>
              <div>
                <label className="label">Ora *</label>
                <input required className="input" value={formData.time} onChange={handleChange('time')} placeholder="19:00" />
              </div>
              <div>
                <label className="label">Luogo *</label>
                <input required className="input" value={formData.location} onChange={handleChange('location')} placeholder="Piazza Roma" />
              </div>
            </div>

            {/* Category & Numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={formData.category} onChange={handleChange('category')}>
                  <option value="cultura">Cultura</option>
                  <option value="musica">Musica</option>
                  <option value="gastronomia">Gastronomia</option>
                  <option value="sport">Sport</option>
                  <option value="comunità">Comunità</option>
                </select>
              </div>
              <div>
                <label className="label">Max Partecipanti</label>
                <input type="number" required className="input" value={formData.maxParticipants} onChange={handleChange('maxParticipants')} />
              </div>
              <div>
                <label className="label">Prezzo (€)</label>
                <input type="number" required className="input" value={formData.price} onChange={handleChange('price')} />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="label">Immagine di Copertina *</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                {formData.image && formData.image.startsWith('data:image') ? (
                  <img src={formData.image} alt="Preview" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                ) : formData.image ? (
                  <img src={formData.image} alt="Preview" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                ) : null}
                <label style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                  padding: '0.5rem 1rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
                  borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--white)'
                }}>
                  <UploadCloud size={16} /> Carica Immagine
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* Descriptions */}
            <div>
              <label className="label">Descrizione Breve * (Mostrata nelle card)</label>
              <textarea required className="input" rows={2} value={formData.description} onChange={handleChange('description')} />
            </div>
            <div>
              <label className="label">Descrizione Completa * (Supporta HTML/Markdown)</label>
              <textarea required className="input" rows={5} value={formData.fullDescription} onChange={handleChange('fullDescription')} />
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', gap: '2rem', padding: '1rem', background: 'var(--neutral-950)', borderRadius: 'var(--radius-md)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neutral-300)', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={formData.featured} onChange={handleChange('featured')} style={{ accentColor: 'var(--gold-500)' }} />
                In evidenza (Home)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neutral-300)', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={formData.bookable} onChange={handleChange('bookable')} style={{ accentColor: 'var(--gold-500)' }} />
                Prenotabile
              </label>
            </div>

            {error && <div style={{ color: '#f87171', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(248,113,113,0.1)', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
          </form>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--neutral-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--neutral-950)', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)' }}>
          {isEdit ? (
            <button 
              type="button" 
              onClick={() => onDelete && onDelete(formData.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', background: 'rgba(248,113,113,0.1)', border: 'none', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
            >
              <Trash2 size={16} /> Elimina Evento
            </button>
          ) : <div/>}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" onClick={onClose} style={{ color: 'var(--neutral-400)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
              Annulla
            </button>
            <button type="submit" form="event-form" disabled={loading} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? 'Salva Modifiche' : 'Crea Evento'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
