'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard, Calendar, Users, ImageIcon,
  BarChart2, LogOut, Settings, Bell,
  TrendingUp, UserPlus, CalendarCheck, Eye, Loader2
} from 'lucide-react';
import type { Event } from '@/lib/data/events';
import type { Member } from '@/lib/data/members';
import type { GalleryItem } from '@/lib/data/gallery';
import EventForm from '@/components/admin/EventForm';
import MemberForm from '@/components/admin/MemberForm';
import GalleryForm from '@/components/admin/GalleryForm';

type AdminSection = 'dashboard' | 'eventi' | 'soci' | 'media' | 'analytics';

const navItems: { id: AdminSection; icon: typeof LayoutDashboard; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'eventi', icon: Calendar, label: 'Eventi' },
  { id: 'soci', icon: Users, label: 'Soci' },
  { id: 'media', icon: ImageIcon, label: 'Media' },
  { id: 'analytics', icon: BarChart2, label: 'Analytics' },
];

const statusColors: Record<string, string> = {
  attivo: '#4ade80',
  'in attesa': '#fbbf24',
  scaduto: '#f87171',
};

export default function AdminPage() {
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null | 'new'>(null);
  const [editingMember, setEditingMember] = useState<Member | null | 'new'>(null);
  const [editingPhoto, setEditingPhoto] = useState<GalleryItem | null | 'new'>(null);

  const fetchEvents = () => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const fetchMembers = () => {
    fetch('/api/members')
      .then(res => res.json())
      .then(data => { setMembers(data); })
      .catch(err => { console.error(err); });
  };

  const fetchGallery = () => {
    fetch('/api/gallery')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setGallery(data); })
      .catch(err => { console.error(err); });
  };

  useEffect(() => {
    fetchEvents();
    fetchMembers();
    fetchGallery();
  }, []);

  const handleSaveEvent = () => {
    setEditingEvent(null);
    fetchEvents(); // Refresh data
  };

  const handleSaveMember = () => {
    setEditingMember(null);
    fetchMembers(); // Refresh data
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo evento?')) return;
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' });
      setEditingEvent(null);
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo socio?')) return;
    try {
      await fetch(`/api/members/${id}`, { method: 'DELETE' });
      setEditingMember(null);
      fetchMembers();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione');
    }
  };

  const handleSavePhoto = () => {
    setEditingPhoto(null);
    fetchGallery();
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm('Eliminare questa foto dalla galleria?')) return;
    try {
      await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
      setEditingPhoto(null);
      fetchGallery();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--neutral-950)', paddingTop: '0' }}>

      {/* Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'var(--neutral-900)',
        borderRight: '1px solid var(--neutral-800)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--neutral-800)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Image src="/img/Logo_color_sm.png" alt="Logo" width={36} height={36} style={{ objectFit: 'contain' }} />
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontFamily: 'var(--font-label)', fontSize: '0.55rem', color: 'var(--gold-500)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Pro Loco</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--white)', fontWeight: 500 }}>Gasperina</div>
          </div>
        </div>

        {/* Label */}
        <div style={{ padding: '1rem 1.5rem 0.5rem', fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--neutral-600)', fontFamily: 'var(--font-body)' }}>
          Area Admin
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.88rem',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--white)' : 'var(--neutral-400)',
                  background: active ? 'rgba(27,75,170,0.2)' : 'transparent',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  width: '100%',
                  borderLeft: active ? '2px solid var(--blue-700)' : '2px solid transparent',
                }}
              >
                <Icon size={16} style={{ color: active ? 'var(--blue-500)' : 'var(--neutral-500)' }} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--neutral-800)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
            color: 'var(--neutral-400)', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
          }}>
            <Eye size={15} /> Visualizza sito
          </Link>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
            border: 'none', cursor: 'pointer', background: 'transparent',
            color: 'var(--neutral-400)', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
            width: '100%', textAlign: 'left',
          }}>
            <LogOut size={15} /> Esci
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: '240px', flex: 1, padding: '2rem', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 400, color: 'var(--white)' }}>
              {navItems.find(n => n.id === section)?.label}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)' }}>Pro Loco Gasperina APS · Area Amministrativa</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-full)', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--neutral-400)' }}>
              <Bell size={16} />
            </button>
            <button style={{ background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-full)', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--neutral-400)' }}>
              <Settings size={16} />
            </button>
            <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-full)', background: 'var(--blue-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--white)' }}>
              A
            </div>
          </div>
        </div>

        {/* ── DASHBOARD ── */}
        {section === 'dashboard' && (
          <div>
            {loading ? (
               <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--neutral-500)' }}>
                 <Loader2 className="animate-spin" size={32} />
               </div>
            ) : (
              <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { icon: Users, label: 'Soci Totali', value: members.length, delta: '+3 questo mese', color: 'var(--blue-700)' },
                { icon: Calendar, label: 'Eventi Totali', value: events.length, delta: '3 in arrivo', color: 'var(--gold-500)' },
                { icon: UserPlus, label: 'Prenotazioni', value: events.reduce((a, e) => a + e.registeredCount, 0), delta: 'questo mese', color: '#4ade80' },
              ].map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--neutral-400)' }}>{kpi.label}</div>
                      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `${kpi.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={15} style={{ color: kpi.color }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 500, color: 'var(--white)', lineHeight: 1 }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '0.4rem' }}>{kpi.delta}</div>
                  </div>
                );
              })}
            </div>

            {/* Recent events + members */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--white)', marginBottom: '1rem' }}>Prossimi eventi</h4>
                {events.slice(0, 4).map(ev => (
                  <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--white)', fontWeight: 500 }}>{ev.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{new Date(ev.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} · {ev.location}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {ev.bookable ? (
                        <>
                          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{ev.registeredCount}/{ev.maxParticipants}</div>
                          <div style={{ height: '3px', width: '60px', background: 'var(--neutral-700)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round(ev.registeredCount/ev.maxParticipants*100)}%`, background: 'var(--blue-700)' }} />
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)', fontStyle: 'italic' }}>No prenot.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--white)', marginBottom: '1rem' }}>Soci recenti</h4>
                {members.slice(0, 5).map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(27,75,170,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--blue-500)' }}>
                        {m.nome[0]}{m.cognome[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--white)', fontWeight: 500 }}>{m.nome} {m.cognome}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--neutral-400)', textTransform: 'capitalize' }}>{m.tipo}</div>
                      </div>
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: statusColors[m.stato],
                      boxShadow: `0 0 8px ${statusColors[m.stato]}66`,
                    }} />
                  </div>
                ))}
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* ── EVENTI ── */}
        {section === 'eventi' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)' }}>{events.length} eventi totali</p>
              <button 
                onClick={() => setEditingEvent('new')}
                className="btn btn-primary" 
                style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem' }}
              >
                + Nuovo evento
              </button>
            </div>
            {loading ? (
               <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--neutral-500)' }}>
                 <Loader2 className="animate-spin" size={32} />
               </div>
            ) : (
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
                      <td style={{ color: 'var(--white)', fontWeight: 500 }}>{ev.title}</td>
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
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* ── SOCI ── */}
        {section === 'soci' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)' }}>{members.length} soci registrati</p>
              <button 
                onClick={() => setEditingMember('new')}
                className="btn btn-primary" 
                style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem' }}
              >
                + Aggiungi socio
              </button>
            </div>
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
                          <span style={{ color: 'var(--white)', fontWeight: 500 }}>{m.nome} {m.cognome}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--neutral-400)' }}>{m.email}</td>
                      <td><span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{m.tipo}</span></td>
                      <td>{new Date(m.dataIscrizione).toLocaleDateString('it-IT')}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: statusColors[m.stato] }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColors[m.stato] }} />
                          {m.stato.charAt(0).toUpperCase() + m.stato.slice(1)}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => setEditingMember(m)}
                          style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Modifica
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* ── ANALYTICS ── */}
        {section === 'analytics' && (
          <div>
            {loading ? (
               <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--neutral-500)' }}>
                 <Loader2 className="animate-spin" size={32} />
               </div>
            ) : (
              <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[
                { label: 'Tasso di riempimento eventi', value: `${Math.round(events.reduce((a,e) => a + e.registeredCount/e.maxParticipants, 0) / events.length * 100)}%`, icon: TrendingUp, color: 'var(--blue-700)' },
                { label: 'Soci attivi', value: members.filter(m => m.stato === 'attivo').length, icon: Users, color: 'var(--gold-500)' },
                { label: 'Prenotazioni totali', value: events.reduce((a, e) => a + e.registeredCount, 0), icon: CalendarCheck, color: '#4ade80' },
              ].map(kpi => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <Icon size={24} style={{ color: kpi.color, marginBottom: '0.75rem' }} />
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--white)' }}>{kpi.value}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', marginTop: '0.3rem' }}>{kpi.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Events breakdown */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--white)', marginBottom: '1.25rem' }}>Partecipazione per evento</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {events.map(ev => {
                  const pct = Math.round(ev.registeredCount / ev.maxParticipants * 100);
                  return (
                    <div key={ev.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        <span style={{ color: 'var(--neutral-200)', fontWeight: 500 }}>{ev.title}</span>
                        <span style={{ color: pct > 80 ? 'var(--gold-400)' : 'var(--neutral-400)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--neutral-700)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: pct > 80
                            ? 'linear-gradient(90deg, var(--gold-500), var(--gold-400))'
                            : 'linear-gradient(90deg, var(--blue-700), var(--blue-500))',
                          borderRadius: '4px',
                          transition: 'width 0.8s ease',
                        }} />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.2rem' }}>
                        {ev.registeredCount} / {ev.maxParticipants} partecipanti
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* ── MEDIA ── */}
        {section === 'media' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)' }}>{gallery.length} foto in galleria</p>
              <button
                onClick={() => setEditingPhoto('new')}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.55rem 1.1rem' }}
              >
                + Aggiungi foto
              </button>
            </div>

            {gallery.length === 0 ? (
              <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--neutral-600)' }}>
                <ImageIcon size={32} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                <p style={{ fontSize: '0.9rem' }}>Nessuna foto ancora. Aggiungine una!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                {gallery.map(item => (
                  <div
                    key={item.id}
                    className="card"
                    style={{ overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.18s, box-shadow 0.18s' }}
                    onClick={() => setEditingPhoto(item)}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                  >
                    <div style={{ position: 'relative', aspectRatio: '16/10', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.src} alt={item.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                    <div style={{ padding: '0.75rem 0.9rem' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{item.category}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--neutral-200)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.alt}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Event Form Modal */}
      {editingEvent && (
        <EventForm 
          initialData={editingEvent === 'new' ? undefined : editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* Member Form Modal */}
      {editingMember && (
        <MemberForm 
          initialData={editingMember === 'new' ? undefined : editingMember}
          onClose={() => setEditingMember(null)}
          onSave={handleSaveMember}
          onDelete={handleDeleteMember}
        />
      )}

      {/* Gallery Form Modal */}
      {editingPhoto && (
        <GalleryForm
          initialData={editingPhoto === 'new' ? undefined : editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSave={handleSavePhoto}
          onDelete={handleDeletePhoto}
        />
      )}
    </div>
  );
}
