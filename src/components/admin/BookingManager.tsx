'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, CheckCircle2, XCircle, 
  Clock, Phone, Mail, User, Hash, FileText, Loader2, Trash2
} from 'lucide-react';
import type { Booking } from '@/lib/data/bookings';

export default function BookingManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('all');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleStatusUpdate = async (id: string, stato: string) => {
    try {
      await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato }),
      });
      fetchBookings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckIn = async (id: string, checkedIn: boolean) => {
    try {
      await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedIn }),
      });
      fetchBookings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler annullare questa prenotazione? Il conteggio partecipanti dell\'evento verrà aggiornato.')) return;
    try {
      await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
      fetchBookings();
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Evento', 'Nome', 'Cognome', 'Email', 'Telefono', 'Partecipanti', 'Stato', 'Data'];
    const rows = filteredBookings.map(b => [
      b.id, b.eventTitle || 'Unknown', b.nome, b.cognome, b.email, b.telefono || '', b.partecipanti, b.stato, new Date(b.createdAt).toLocaleString()
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prenotazioni_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.cognome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.eventTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEvent = filterEvent === 'all' || b.event_id === filterEvent;
    return matchesSearch && matchesEvent;
  });

  const uniqueEvents = Array.from(new Set(bookings.map(b => b.event_id))).map(id => ({
    id,
    title: bookings.find(b => b.event_id === id)?.eventTitle || 'Evento sconosciuto'
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Filters bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-500)' }} />
            <input 
              className="input" 
              placeholder="Cerca per nome, email o evento..." 
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input" 
            style={{ width: 'auto', minWidth: '180px' }}
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
          >
            <option value="all">Tutti gli eventi</option>
            {uniqueEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
        </div>
        
        <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={exportCSV}>
          <Download size={16} /> Esporta CSV
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--blue-500)' }} />
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Partecipante</th>
                <th>Evento</th>
                <th>Quantità</th>
                <th>Stato</th>
                <th>Check-in</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-500)' }}>
                    Nessuna prenotazione trovata.
                  </td>
                </tr>
              ) : filteredBookings.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--white)', fontWeight: 500 }}>{b.nome} {b.cognome}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Mail size={12} /> {b.email}
                      </span>
                      {b.telefono && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Phone size={12} /> {b.telefono}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem', color: 'var(--blue-400)', fontWeight: 500 }}>{b.eventTitle}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)' }}>{new Date(b.createdAt).toLocaleDateString()}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Hash size={14} style={{ color: 'var(--neutral-500)' }} />
                      <span style={{ fontSize: '1rem', color: 'var(--white)', fontWeight: 600 }}>{b.partecipanti}</span>
                    </div>
                  </td>
                  <td>
                    <select 
                      value={b.stato} 
                      onChange={(e) => handleStatusUpdate(b.id, e.target.value)}
                      style={{ 
                        background: b.stato === 'confermato' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
                        color: b.stato === 'confermato' ? '#4ade80' : '#f87171',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textTransform: 'capitalize'
                      }}
                    >
                      <option value="confermato">Confermato</option>
                      <option value="in attesa">In attesa</option>
                      <option value="annullato">Annullato</option>
                    </select>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleCheckIn(b.id, !b.checkedIn)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: b.checkedIn ? 'var(--blue-700)' : 'transparent',
                        border: '1px solid var(--blue-700)',
                        color: b.checkedIn ? 'white' : 'var(--blue-500)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {b.checkedIn ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                      {b.checkedIn ? 'Presente' : 'Check-in'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {b.note && (
                        <button title={b.note} style={{ color: 'var(--gold-400)', background: 'none', border: 'none', cursor: 'help' }}>
                          <FileText size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(b.id)}
                        style={{ color: 'var(--neutral-600)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
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

      {/* Stats summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
         <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginBottom: '0.25rem' }}>Totale Persone Prenotate</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--white)' }}>
              {filteredBookings.reduce((acc, b) => acc + b.partecipanti, 0)}
            </div>
         </div>
         <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginBottom: '0.25rem' }}>Già Presenti (Check-in)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--blue-500)' }}>
              {filteredBookings.filter(b => b.checkedIn).reduce((acc, b) => acc + b.partecipanti, 0)}
            </div>
         </div>
         <div className="card" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginBottom: '0.25rem' }}>Tasso di Presenza</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--gold-500)' }}>
              {filteredBookings.length > 0 ? Math.round((filteredBookings.filter(b => b.checkedIn).length / filteredBookings.length) * 100) : 0}%
            </div>
         </div>
      </div>
    </div>
  );
}
