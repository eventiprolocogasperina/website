'use client';

import { useState } from 'react';
import type { Member } from '@/lib/data/members';
import { Loader2, X, Trash2, Save } from 'lucide-react';

interface MemberFormProps {
  initialData?: Member;
  onClose: () => void;
  onSave: (member: Member) => void;
  onDelete?: (id: string) => void;
}

const emptyMember: Member = {
  id: '',
  nome: '',
  cognome: '',
  email: '',
  tipo: 'ordinario',
  dataIscrizione: new Date().toISOString().split('T')[0],
  stato: 'attivo',
};

export default function MemberForm({ initialData, onClose, onSave, onDelete }: MemberFormProps) {
  const [formData, setFormData] = useState<Member>(initialData || emptyMember);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialData;

  const handleChange = (field: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/members/${formData.id}` : '/api/members';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Errore nel salvataggio');
      }

      const savedMember = await res.json();
      onSave(savedMember);
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
        borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '600px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--neutral-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--white)' }}>
            {isEdit ? 'Modifica Socio' : 'Nuovo Socio'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
          <form id="member-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Nome *</label>
                <input required className="input" value={formData.nome} onChange={handleChange('nome')} />
              </div>
              <div>
                <label className="label">Cognome *</label>
                <input required className="input" value={formData.cognome} onChange={handleChange('cognome')} />
              </div>
            </div>

            <div>
              <label className="label">Email *</label>
              <input type="email" required className="input" value={formData.email} onChange={handleChange('email')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Tipo Socio</label>
                <select className="input" value={formData.tipo} onChange={handleChange('tipo')}>
                  <option value="ordinario">Ordinario</option>
                  <option value="sostenitore">Sostenitore</option>
                  <option value="onorario">Onorario</option>
                </select>
              </div>
              <div>
                <label className="label">Stato</label>
                <select className="input" value={formData.stato} onChange={handleChange('stato')}>
                  <option value="attivo">Attivo</option>
                  <option value="in attesa">In Attesa</option>
                  <option value="scaduto">Scaduto</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Data Iscrizione (YYYY-MM-DD) *</label>
              <input type="date" required className="input" value={formData.dataIscrizione} onChange={handleChange('dataIscrizione')} />
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
              <Trash2 size={16} /> Elimina Socio
            </button>
          ) : <div/>}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="button" onClick={onClose} style={{ color: 'var(--neutral-400)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
              Annulla
            </button>
            <button type="submit" form="member-form" disabled={loading} className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isEdit ? 'Salva Modifiche' : 'Crea Socio'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
