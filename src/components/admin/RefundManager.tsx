'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  RotateCcw, Search, CheckCircle2, XCircle, Clock, 
  Trash2, Edit, AlertCircle, Phone, Mail, Ticket, 
  CreditCard, ExternalLink, RefreshCw, Loader2, Filter, Copy, Check
} from 'lucide-react';

interface RefundRequest {
  id: string;
  event_slug: string;
  full_name: string;
  email: string;
  phone?: string;
  booking_numbers: string;
  account_holder?: string;
  iban?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'refunded' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export default function RefundManager() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'refunded' | 'rejected'>('all');
  const [editingRefund, setEditingRefund] = useState<RefundRequest | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<RefundRequest['status']>('pending');
  const [savingEdit, setSavingEdit] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/refunds');
      const json = await res.json();
      if (json.success && Array.isArray(json.refunds)) {
        setRefunds(json.refunds);
      } else {
        setRefunds([]);
      }
    } catch (err) {
      console.error('Error fetching refunds:', err);
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: RefundRequest['status'], currentNotes?: string) => {
    const statusLabels: Record<string, string> = {
      pending: 'In Attesa',
      refunded: 'Rimborsato',
      rejected: 'Rifiutato'
    };
    if (!confirm(`Confermi di voler modificare lo stato di questa pratica a "${statusLabels[newStatus]}"?`)) return;

    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, adminNotes: currentNotes }),
      });
      const json = await res.json();
      if (json.success) {
        setRefunds(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      } else {
        alert(json.error || 'Errore durante l\'aggiornamento');
      }
    } catch (err) {
      console.error(err);
      alert('Errore di connessione');
    }
  };

  const handleSaveModal = async () => {
    if (!editingRefund) return;
    setSavingEdit(true);
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRefund.id,
          status: editStatus,
          adminNotes: editNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setRefunds(prev => prev.map(r => r.id === editingRefund.id ? { ...r, status: editStatus, admin_notes: editNotes } : r));
        setEditingRefund(null);
      } else {
        alert(json.error || 'Errore salvataggio note');
      }
    } catch (err) {
      console.error(err);
      alert('Errore di rete');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ATTENZIONE: Sei sicuro di voler eliminare definitivamente questa richiesta di rimborso?')) return;
    try {
      const res = await fetch(`/api/admin/refunds?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        setRefunds(prev => prev.filter(r => r.id !== id));
      } else {
        alert(json.error || 'Errore durante l\'eliminazione');
      }
    } catch (err) {
      console.error(err);
      alert('Errore di rete');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = refunds.length;
    const pending = refunds.filter(r => r.status === 'pending').length;
    const refunded = refunds.filter(r => r.status === 'refunded').length;
    const rejected = refunds.filter(r => r.status === 'rejected').length;
    return { total, pending, refunded, rejected };
  }, [refunds]);

  // Filtered list
  const filteredRefunds = useMemo(() => {
    return refunds.filter(r => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = r.full_name?.toLowerCase().includes(q);
        const matchesAccountHolder = r.account_holder?.toLowerCase().includes(q);
        const matchesEmail = r.email?.toLowerCase().includes(q);
        const matchesPhone = r.phone?.toLowerCase().includes(q);
        const matchesBookings = r.booking_numbers?.toLowerCase().includes(q);
        const matchesIban = r.iban?.toLowerCase().includes(q);
        const matchesId = r.id?.toLowerCase().includes(q);
        if (!matchesName && !matchesAccountHolder && !matchesEmail && !matchesPhone && !matchesBookings && !matchesIban && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [refunds, statusFilter, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ── Statistiche Rapide ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        
        {/* Totale */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: 'rgba(27,75,170,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-500)' }}>
            <RotateCcw size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Totale Richieste
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-heading)' }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* In Attesa */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: 'rgba(234,88,12,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              In Attesa (Pending)
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f97316' }}>
              {stats.pending}
            </div>
          </div>
        </div>

        {/* Rimborsati */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Rimborsati
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22c55e' }}>
              {stats.refunded}
            </div>
          </div>
        </div>

        {/* Rifiutati */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: '0.75rem', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Rifiutati
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>
              {stats.rejected}
            </div>
          </div>
        </div>

      </div>

      {/* ── Barra Ricerca & Filtri ── */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Input ricerca */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '450px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cerca per intestatario, email, codice prenotazione, tel..."
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.4rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--neutral-900)',
                border: '1px solid var(--neutral-700)',
                color: 'var(--color-heading)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filtri stato e Refresh */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { key: 'all' as const, label: 'Tutti' },
              { key: 'pending' as const, label: `In Attesa (${stats.pending})` },
              { key: 'refunded' as const, label: `Rimborsati (${stats.refunded})` },
              { key: 'rejected' as const, label: `Rifiutati (${stats.rejected})` },
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '999px',
                  border: statusFilter === f.key ? '1px solid var(--blue-500)' : '1px solid var(--neutral-700)',
                  background: statusFilter === f.key ? 'rgba(27,75,170,0.25)' : 'transparent',
                  color: statusFilter === f.key ? 'var(--blue-400)' : 'var(--neutral-400)',
                  fontSize: '0.82rem',
                  fontWeight: statusFilter === f.key ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f.label}
              </button>
            ))}

            <button
              type="button"
              onClick={fetchRefunds}
              title="Aggiorna lista"
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '999px',
                border: '1px solid var(--neutral-700)',
                background: 'transparent',
                color: 'var(--neutral-300)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.82rem'
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

        </div>
      </div>

      {/* ── Tabella Richieste ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'var(--blue-500)' }} />
            <p style={{ fontSize: '0.92rem' }}>Caricamento richieste di rimborso...</p>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--neutral-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--neutral-500)' }}>
              <RotateCcw size={28} />
            </div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-heading)', marginBottom: '0.35rem', fontWeight: 600 }}>
              Nessuna richiesta di rimborso trovata
            </h3>
            <p style={{ fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto' }}>
              {searchTerm || statusFilter !== 'all' 
                ? 'Nessun risultato corrisponde ai filtri di ricerca applicati.' 
                : 'Al momento non è pervenuta alcuna richiesta di rimborso.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--neutral-800)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem', color: 'var(--neutral-400)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase' }}>Data</th>
                  <th style={{ padding: '1rem', color: 'var(--neutral-400)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase' }}>Intestatario</th>
                  <th style={{ padding: '1rem', color: 'var(--neutral-400)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase' }}>Prenotazione</th>
                  <th style={{ padding: '1rem', color: 'var(--neutral-400)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase' }}>Dati Bonifico (IBAN & Conto)</th>
                  <th style={{ padding: '1rem', color: 'var(--neutral-400)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase' }}>Stato</th>
                  <th style={{ padding: '1rem', color: 'var(--neutral-400)', fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.map((r, idx) => {
                  const dateFormatted = new Date(r.created_at).toLocaleDateString('it-IT', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <tr 
                      key={r.id}
                      style={{
                        borderBottom: '1px solid var(--neutral-800)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        transition: 'background 0.15s'
                      }}
                    >
                      {/* Data & ID */}
                      <td style={{ padding: '1rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <div style={{ color: 'var(--color-heading)', fontWeight: 600 }}>{dateFormatted}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                          {r.id}
                        </div>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          background: 'rgba(234,88,12,0.15)',
                          color: '#f97316',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '999px',
                          fontWeight: 700,
                          marginTop: '0.35rem',
                          textTransform: 'uppercase'
                        }}>
                          {r.event_slug}
                        </span>
                      </td>

                      {/* Intestatario */}
                      <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                        <div style={{ color: 'var(--color-heading)', fontWeight: 700, fontSize: '0.95rem' }}>
                          {r.full_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--neutral-300)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                          <Mail size={13} style={{ color: 'var(--neutral-500)' }} />
                          <a href={`mailto:${r.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {r.email}
                          </a>
                        </div>
                        {r.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--neutral-400)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                            <Phone size={13} style={{ color: 'var(--neutral-500)' }} />
                            <a href={`tel:${r.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {r.phone}
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Booking numbers */}
                      <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                        <div style={{
                          background: 'var(--neutral-900)',
                          border: '1px solid var(--neutral-700)',
                          borderRadius: '0.5rem',
                          padding: '0.45rem 0.65rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          color: '#fdba74'
                        }}>
                          <Ticket size={14} color="#ea580c" />
                          <span>{r.booking_numbers}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(r.booking_numbers, r.id)}
                            title="Copia codice"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: 0, display: 'flex' }}
                          >
                            {copiedId === r.id ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* IBAN / Dati Bonifico */}
                      <td style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '340px' }}>
                        {r.account_holder && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--neutral-200)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--neutral-400)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Beneficiario:</span>
                            <span style={{ fontWeight: 700, color: 'var(--color-heading)' }}>{r.account_holder}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(r.account_holder || '', `holder_${r.id}`)}
                              title="Copia intestatario conto"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: 0, display: 'inline-flex' }}
                            >
                              {copiedId === `holder_${r.id}` ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}
                        {r.iban && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '0.82rem',
                              background: 'var(--neutral-900)',
                              border: '1px solid var(--neutral-700)',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '0.35rem',
                              color: '#38bdf8'
                            }}>
                              {r.iban}
                            </span>
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '999px',
                              background: r.iban.length === 27 && r.iban.startsWith('IT') ? 'rgba(34,197,94,0.15)' : 'rgba(234,88,12,0.15)',
                              color: r.iban.length === 27 && r.iban.startsWith('IT') ? '#22c55e' : '#f97316',
                              fontWeight: 700
                            }}>
                              {r.iban.length} car.
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(r.iban || '', `iban_${r.id}`)}
                              title="Copia IBAN"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--neutral-400)', padding: 0, display: 'inline-flex' }}
                            >
                              {copiedId === `iban_${r.id}` ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                            </button>
                          </div>
                        )}
                        {r.reason && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--neutral-300)', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.6rem', borderRadius: '0.4rem', borderLeft: '2px solid var(--neutral-600)', marginTop: '0.35rem' }}>
                            "{r.reason}"
                          </div>
                        )}
                        {r.admin_notes && (
                          <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '0.35rem', background: 'rgba(56,189,248,0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.35rem' }}>
                            <strong>Note interne:</strong> {r.admin_notes}
                          </div>
                        )}
                      </td>

                      {/* Stato */}
                      <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                        {r.status === 'pending' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(234,88,12,0.15)', color: '#f97316' }}>
                            <Clock size={12} /> In Attesa
                          </span>
                        )}
                        {r.status === 'refunded' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                            <CheckCircle2 size={12} /> Rimborsato
                          </span>
                        )}
                        {r.status === 'rejected' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                            <XCircle size={12} /> Rifiutato
                          </span>
                        )}
                      </td>

                      {/* Azioni */}
                      <td style={{ padding: '1rem', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                          
                          {/* Segna rimborsato */}
                          {r.status !== 'refunded' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(r.id, 'refunded', r.admin_notes)}
                              title="Segna come Rimborsato"
                              style={{
                                background: 'rgba(34,197,94,0.15)',
                                border: '1px solid rgba(34,197,94,0.3)',
                                color: '#22c55e',
                                padding: '0.35rem 0.55rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              <CheckCircle2 size={13} /> Rimborsa
                            </button>
                          )}

                          {/* Segna rifiutato */}
                          {r.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(r.id, 'rejected', r.admin_notes)}
                              title="Segna come Rifiutato"
                              style={{
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                color: '#ef4444',
                                padding: '0.35rem 0.55rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              <XCircle size={13} /> Rifiuta
                            </button>
                          )}

                          {/* Se già rimborsato/rifiutato, permetti di riportarlo in attesa */}
                          {r.status !== 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(r.id, 'pending', r.admin_notes)}
                              title="Riporta in attesa"
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--neutral-700)',
                                color: 'var(--neutral-300)',
                                padding: '0.35rem 0.55rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}
                            >
                              In Attesa
                            </button>
                          )}

                          {/* Modifica note / dettagli */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRefund(r);
                              setEditNotes(r.admin_notes || '');
                              setEditStatus(r.status);
                            }}
                            title="Modifica note interne"
                            style={{
                              background: 'var(--neutral-800)',
                              border: '1px solid var(--neutral-700)',
                              color: 'var(--neutral-300)',
                              padding: '0.35rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Edit size={13} />
                          </button>

                          {/* Elimina */}
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            title="Elimina pratica"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--neutral-500)',
                              padding: '0.35rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Modifica Note / Dettaglio ── */}
      {editingRefund && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          zIndex: 100
        }}>
          <div style={{
            background: 'var(--neutral-900)',
            border: '1px solid var(--neutral-700)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '0.5rem' }}>
              Gestione Pratica #{editingRefund.id}
            </h3>
            <p style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Intestatario: <strong>{editingRefund.full_name}</strong> ({editingRefund.email})
            </p>

            {/* Dati Bonifico nel Modal */}
            <div style={{
              background: 'var(--neutral-950)',
              border: '1px solid var(--neutral-700)',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.25rem',
              fontSize: '0.88rem'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--neutral-400)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Beneficiario Bonifico: </span>
                <strong style={{ color: 'var(--color-heading)' }}>{editingRefund.account_holder || 'Non indicato'}</strong>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--neutral-400)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>IBAN: </span>
                <span style={{ fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>{editingRefund.iban}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--neutral-400)', marginLeft: '0.5rem' }}>({editingRefund.iban?.length} car.)</span>
              </div>
              <div>
                <span style={{ color: 'var(--neutral-400)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Codici Prenotazione: </span>
                <span style={{ fontFamily: 'monospace', color: '#fdba74' }}>{editingRefund.booking_numbers}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Stato Pratica
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--neutral-950)',
                    border: '1px solid var(--neutral-700)',
                    color: 'var(--color-heading)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  <option value="pending">⏳ In Attesa (Pending)</option>
                  <option value="refunded">✅ Rimborsato (Completato)</option>
                  <option value="rejected">❌ Rifiutato</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-400)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.4rem' }}>
                  Note Interne Amministrazione (visibili solo agli admin)
                </label>
                <textarea
                  rows={4}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Es. Effettuato storno su Nexi il giorno xx/xx, o bonifico inviato con CRO..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--neutral-950)',
                    border: '1px solid var(--neutral-700)',
                    color: 'var(--color-heading)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setEditingRefund(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--neutral-700)',
                  color: 'var(--neutral-300)',
                  padding: '0.6rem 1.2rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveModal}
                style={{
                  background: 'var(--blue-600)',
                  border: 'none',
                  color: 'white',
                  padding: '0.6rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  cursor: savingEdit ? 'not-allowed' : 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {savingEdit && <Loader2 size={14} className="animate-spin" />}
                Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
