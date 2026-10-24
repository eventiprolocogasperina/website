'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import EventForm from '@/components/admin/EventForm';
import type { Event } from '@/lib/data/events';

export default function AdminEventiPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null | 'new'>(null);

  const fetchEvents = () => {
    setLoading(true);
    fetch('/api/events')
      .then(res => res.json())
      .then(data => { setEvents(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo evento?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    setEditingEvent(null);
    fetchEvents();
  };

  return (
    <div>
      <AdminHeader
        title="Eventi"
        actions={
          <button onClick={() => setEditingEvent('new')} className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem' }}>
            + Nuovo evento
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--neutral-500)' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <>
          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', marginBottom: '1rem' }}>{events.length} eventi totali</p>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Titolo</th>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Iscritti</th>
                  <th>Gratuito</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ color: 'var(--color-heading)', fontWeight: 500 }}>{ev.title}</td>
                    <td>{new Date(ev.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td><span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{ev.category}</span></td>
                    <td>{ev.bookable ? `${ev.registeredCount} / ${ev.maxParticipants}` : <span style={{ color: 'var(--neutral-600)', fontStyle: 'italic' }}>—</span>}</td>
                    <td><span style={{ color: ev.isFree ? '#4ade80' : 'var(--gold-400)', fontSize: '0.82rem' }}>{ev.isFree ? 'Sì' : `€${ev.price}`}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/eventi/${ev.slug}`} target="_blank" style={{ fontSize: '0.78rem', color: 'var(--blue-500)', textDecoration: 'underline' }}>Vedi</Link>
                        <button onClick={() => setEditingEvent(ev)} style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', background: 'none', border: 'none', cursor: 'pointer' }}>Modifica</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--neutral-500)', padding: '2rem' }}>Nessun evento presente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingEvent && (
        <EventForm
          initialData={editingEvent === 'new' ? undefined : editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={() => { setEditingEvent(null); fetchEvents(); }}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}
