'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Edit2, Check, X, Globe } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import ImageUpload from '@/components/admin/ImageUpload';

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url?: string;
  tier: 'gold' | 'silver' | 'bronze' | 'partner';
  active: boolean;
  sort_order: number;
}

const tierColors: Record<string, string> = {
  gold: '#F59E0B',
  silver: '#94A3B8',
  bronze: '#D97706',
  partner: 'var(--blue-500)',
};

const tierLabels: Record<string, string> = {
  gold: '🥇 Oro',
  silver: '🥈 Argento',
  bronze: '🥉 Bronzo',
  partner: '🤝 Partner',
};

const emptyForm: Omit<Sponsor, 'id'> = {
  name: '',
  logo_url: '',
  website_url: '',
  tier: 'bronze',
  active: true,
  sort_order: 0,
};

export default function AdminSponsorPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [form, setForm] = useState<Omit<Sponsor, 'id'>>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const fetchSponsors = () => {
    setLoading(true);
    fetch('/api/admin/sponsors')
      .then(r => r.json())
      .then(d => { if (d.success) setSponsors(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSponsors(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (s: Sponsor) => {
    setEditing(s);
    setForm({ name: s.name, logo_url: s.logo_url, website_url: s.website_url || '', tier: s.tier, active: s.active, sort_order: s.sort_order });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.logo_url) {
      setStatus({ type: 'error', msg: 'Nome e logo sono obbligatori' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch('/api/admin/sponsors', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', msg: editing ? 'Sponsor aggiornato!' : 'Sponsor aggiunto!' });
        setShowForm(false);
        fetchSponsors();
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus({ type: 'error', msg: data.error || 'Errore' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo sponsor?')) return;
    await fetch(`/api/admin/sponsors?id=${id}`, { method: 'DELETE' });
    fetchSponsors();
  };

  const toggleActive = async (s: Sponsor) => {
    await fetch('/api/admin/sponsors', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...s, active: !s.active }),
    });
    fetchSponsors();
  };

  return (
    <div>
      <AdminHeader
        title="Sponsor"
        subtitle="Gestione sponsor e partner dell'evento"
        actions={
          <button onClick={openNew} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={14} /> Aggiungi Sponsor
          </button>
        }
      />

      {status && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: status.type === 'success' ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)', color: status.type === 'success' ? '#4ade80' : '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {status.type === 'success' ? <Check size={16} /> : <X size={16} />} {status.msg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={32} style={{ color: 'var(--neutral-500)' }} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {sponsors.map(s => (
            <div key={s.id} className="card" style={{ padding: '1.25rem', opacity: s.active ? 1 : 0.5, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: tierColors[s.tier], background: `${tierColors[s.tier]}22`, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  {tierLabels[s.tier]}
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={() => toggleActive(s)} title={s.active ? 'Disattiva' : 'Attiva'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.active ? '#4ade80' : 'var(--neutral-600)', padding: '0.25rem' }}>
                    {s.active ? <Check size={14} /> : <X size={14} />}
                  </button>
                  <button onClick={() => openEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: '0.25rem' }}><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-400)', padding: '0.25rem' }}><Trash2 size={14} /></button>
                </div>
              </div>

              {s.logo_url && (
                <div style={{ height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', background: 'var(--neutral-800)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.logo_url} alt={s.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                </div>
              )}

              <div style={{ fontWeight: 600, color: 'var(--color-heading)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{s.name}</div>
              {s.website_url && (
                <a href={s.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--blue-400)', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                  <Globe size={11} /> {s.website_url.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          ))}

          {sponsors.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--neutral-600)' }}>
              <p>Nessuno sponsor aggiunto. Clicca su "Aggiungi Sponsor" per iniziare.</p>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: 'var(--neutral-900)', borderRadius: 'var(--radius-xl)', padding: '2rem', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--neutral-800)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--color-heading)', fontSize: '1.1rem', fontWeight: 600 }}>{editing ? 'Modifica Sponsor' : 'Nuovo Sponsor'}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Nome Sponsor *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="es. Comune di Gasperina" style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <ImageUpload
                label="Logo Sponsor *"
                value={form.logo_url}
                onChange={url => setForm({ ...form, logo_url: url })}
                folder="pro-loco-gasperina/sponsors"
                previewHeight={100}
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Sito Web</label>
                <input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="https://..." type="url" style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Categoria</label>
                  <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value as any })} style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none' }}>
                    <option value="gold">🥇 Oro</option>
                    <option value="silver">🥈 Argento</option>
                    <option value="bronze">🥉 Bronzo</option>
                    <option value="partner">🤝 Partner</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Ordine</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--neutral-300)' }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                Sponsor attivo (visibile nel sito)
              </label>

              {status && (
                <p style={{ fontSize: '0.8rem', color: status.type === 'error' ? '#ef4444' : '#4ade80' }}>{status.msg}</p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => setShowForm(false)} style={{ padding: '0.65rem 1.25rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--neutral-300)', cursor: 'pointer', fontSize: '0.88rem' }}>Annulla</button>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : <><Check size={14} /> Salva</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
