'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Plus, Loader2, Tag, Trash2, Edit2
} from 'lucide-react';

interface Discount {
  id: string;
  code: string;
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  max_uses: number;
  current_uses: number;
  expiry_date?: string;
  active: boolean;
  created_at: string;
}

export default function DiscountManager() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [form, setForm] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: 0,
    max_uses: 0,
    expiry_date: '',
    active: true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchDiscounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/discounts');
      const data = await res.json();
      setDiscounts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleOpenModal = (discount?: Discount) => {
    setError('');
    if (discount) {
      setEditingDiscount(discount);
      setForm({
        code: discount.code,
        type: discount.type,
        value: discount.value,
        max_uses: discount.max_uses,
        expiry_date: discount.expiry_date ? new Date(discount.expiry_date).toISOString().slice(0, 16) : '',
        active: discount.active
      });
    } else {
      setEditingDiscount(null);
      setForm({
        code: '',
        type: 'PERCENTAGE',
        value: 0,
        max_uses: 0,
        expiry_date: '',
        active: true
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(editingDiscount ? `/api/admin/discounts/${editingDiscount.id}` : '/api/admin/discounts', {
        method: editingDiscount ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore salvataggio');
      setShowModal(false);
      fetchDiscounts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo codice sconto?')) return;
    try {
      await fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' });
      fetchDiscounts();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione');
    }
  };

  const filteredDiscounts = discounts.filter(d => 
    d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px', maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-500)' }} />
          <input 
            className="input" 
            placeholder="Cerca codice sconto..." 
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Nuovo Codice Sconto
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--blue-500)' }} />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Codice</th>
                <th>Valore</th>
                <th>Utilizzi</th>
                <th>Scadenza</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-500)' }}>
                    Nessun codice sconto trovato.
                  </td>
                </tr>
              ) : filteredDiscounts.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Tag size={16} style={{ color: 'var(--blue-400)' }} />
                      <span style={{ color: 'var(--white)', fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem' }}>{d.code}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '1rem', color: 'var(--white)', fontWeight: 500 }}>
                      {d.type === 'PERCENTAGE' ? `${d.value}%` : `€${d.value.toFixed(2)}`}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: 'var(--neutral-400)' }}>
                      <span style={{ color: 'var(--white)', fontWeight: 500 }}>{d.current_uses}</span>
                      {d.max_uses > 0 ? ` / ${d.max_uses}` : ' (illimitati)'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: 'var(--neutral-400)' }}>
                      {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : 'Nessuna scadenza'}
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                      background: d.active ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                      color: d.active ? '#4ade80' : '#f87171'
                    }}>
                      {d.active ? 'Attivo' : 'Inattivo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => handleOpenModal(d)} style={{ color: 'var(--blue-400)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(d.id)} style={{ color: 'var(--neutral-600)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              {editingDiscount ? 'Modifica Sconto' : 'Nuovo Sconto'}
            </h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Codice (es. SUMMER26)</label>
                <input required type="text" className="input" style={{ textTransform: 'uppercase', fontFamily: 'monospace' }} value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Tipo</label>
                  <select className="input" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                    <option value="PERCENTAGE">Percentuale (%)</option>
                    <option value="FIXED">Fisso (€)</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Valore ({form.type === 'PERCENTAGE' ? '%' : '€'})</label>
                  <input required type="number" min="0" step="0.01" className="input" value={form.value} onChange={e => setForm({...form, value: parseFloat(e.target.value) || 0})} />
                  {form.type === 'PERCENTAGE' && form.value === 100 && <div style={{ fontSize: '0.75rem', color: 'var(--blue-400)', marginTop: '0.25rem' }}>Codice Gratuito</div>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Utilizzi Massimi (0 = illimitati)</label>
                  <input required type="number" min="0" className="input" value={form.max_uses} onChange={e => setForm({...form, max_uses: parseInt(e.target.value) || 0})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Scadenza (opzionale)</label>
                  <input type="datetime-local" className="input" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input type="checkbox" id="active" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} />
                <label htmlFor="active" style={{ cursor: 'pointer', color: 'var(--white)' }}>Codice Attivo</label>
              </div>
              
              {error && (
                <div style={{ color: 'var(--red-400)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Annulla</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
