'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import MemberForm from '@/components/admin/MemberForm';
import type { Member } from '@/lib/data/members';

const statusColors: Record<string, string> = {
  attivo: '#4ade80',
  'in attesa': '#fbbf24',
  scaduto: '#f87171',
};

export default function AdminSociPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Member | null | 'new'>(null);

  const fetchMembers = () => {
    setLoading(true);
    fetch('/api/members')
      .then(res => res.json())
      .then(data => { setMembers(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo socio?')) return;
    await fetch(`/api/members/${id}`, { method: 'DELETE' });
    setEditingMember(null);
    fetchMembers();
  };

  return (
    <div>
      <AdminHeader
        title="Soci"
        actions={
          <button onClick={() => setEditingMember('new')} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem' }}>
            + Aggiungi socio
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--neutral-500)' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', marginBottom: '1rem' }}>{members.length} soci registrati</p>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Socio</th>
                  <th>Email</th>
                  <th>Tipo</th>
                  <th>Iscrizione</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(27,75,170,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 600, color: 'var(--blue-500)', flexShrink: 0 }}>
                          {m.nome[0]}{m.cognome[0]}
                        </div>
                        <span style={{ color: 'var(--color-heading)', fontWeight: 500 }}>{m.nome} {m.cognome}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--neutral-400)' }}>{m.email}</td>
                    <td><span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{m.tipo}</span></td>
                    <td>{new Date(m.dataIscrizione).toLocaleDateString('it-IT')}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: statusColors[m.stato] }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColors[m.stato], flexShrink: 0 }} />
                        {m.stato.charAt(0).toUpperCase() + m.stato.slice(1)}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => setEditingMember(m)} style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Modifica
                      </button>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--neutral-500)', padding: '2rem' }}>Nessun socio registrato.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingMember && (
        <MemberForm
          initialData={editingMember === 'new' ? undefined : editingMember}
          onClose={() => setEditingMember(null)}
          onSave={() => { setEditingMember(null); fetchMembers(); }}
          onDelete={handleDeleteMember}
        />
      )}
    </div>
  );
}
