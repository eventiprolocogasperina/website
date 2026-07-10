'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar, Users, ImageIcon, FileText,
  ShoppingCart, Tag, CalendarCheck, BarChart2,
  Ticket, QrCode, TrendingUp, Globe, Wrench, Loader2, ArrowRight
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import type { Event } from '@/lib/data/events';
import type { Member } from '@/lib/data/members';

const statusColors: Record<string, string> = {
  attivo: '#4ade80',
  'in attesa': '#fbbf24',
  scaduto: '#f87171',
};

const quickLinks = [
  { href: '/admin/eventi', label: 'Gestisci eventi', icon: Calendar, desc: 'Crea e modifica gli eventi' },
  { href: '/admin/notizie', label: 'Notizie', icon: FileText, desc: 'Pubblica aggiornamenti' },
  { href: '/admin/media', label: 'Galleria', icon: ImageIcon, desc: 'Foto e immagini' },
  { href: '/admin/soci', label: 'Soci', icon: Users, desc: 'Gestione iscritti' },
  { href: '/admin/ordini', label: 'Ordini A&P', icon: ShoppingCart, desc: 'Biglietti venduti' },
  { href: '/admin/sconti', label: 'Sconti', icon: Tag, desc: 'Codici promozionali' },
  { href: '/admin/prenotazioni', label: 'Prenotazioni', icon: CalendarCheck, desc: 'Prenotazioni eventi' },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2, desc: 'Statistiche e dati' },
  { href: '/admin/pagine/assaggia', label: 'CMS: A&P', icon: Globe, desc: 'Contenuto pagina evento' },
  { href: '/admin/pagine/sponsor', label: 'Sponsor', icon: Globe, desc: 'Sponsor e partner' },
  { href: '/admin/impostazioni', label: 'Impostazioni', icon: Wrench, desc: 'Configurazioni globali' },
];

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [ticketStats, setTicketStats] = useState({ totalTickets: 0, totalRevenue: 0, checkedIn: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Run setup silently to ensure tables exist
    fetch('/api/setup').catch(() => {});

    Promise.all([
      fetch('/api/events').then(r => r.json()),
      fetch('/api/members').then(r => r.json()),
      fetch('/api/tickets/stats?eventId=assaggia-passeggia').then(r => r.json()),
    ]).then(([evs, mems, stats]) => {
      setEvents(Array.isArray(evs) ? evs : []);
      setMembers(Array.isArray(mems) ? mems : []);
      if (stats.success) setTicketStats(stats.stats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const kpis = [
    { icon: Users, label: 'Soci Totali', value: members.length, delta: `${members.filter(m => m.stato === 'attivo').length} attivi`, color: 'var(--blue-700)' },
    { icon: Ticket, label: 'Biglietti A&P', value: ticketStats.totalTickets, delta: `Incasso: €${ticketStats.totalRevenue}`, color: '#eab308' },
    { icon: QrCode, label: 'Check-in A&P', value: ticketStats.checkedIn, delta: `${ticketStats.totalTickets > 0 ? Math.round((ticketStats.checkedIn / ticketStats.totalTickets) * 100) : 0}% completati`, color: '#4ade80' },
    { icon: TrendingUp, label: 'Eventi Totali', value: events.length, delta: `${events.filter(e => new Date(e.date) >= new Date()).length} in programma`, color: 'var(--gold-500)' },
  ];

  return (
    <div>
      <AdminHeader title="Dashboard" subtitle="Benvenuto nel pannello di controllo" />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--neutral-500)' }}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {kpis.map(kpi => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--neutral-400)' }}>{kpi.label}</div>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `${kpi.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={15} style={{ color: kpi.color }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 500, color: 'var(--color-heading)', lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '0.4rem' }}>{kpi.delta}</div>
                </div>
              );
            })}
          </div>

          {/* Quick Links Grid */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', fontFamily: 'var(--font-body)' }}>
              Accesso Rapido
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {quickLinks.map(link => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                      padding: '1rem 1.1rem',
                      background: 'var(--neutral-900)',
                      border: '1px solid var(--neutral-800)',
                      borderRadius: 'var(--radius-lg)',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue-700)'; (e.currentTarget as HTMLElement).style.background = 'rgba(27,75,170,0.08)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--neutral-800)'; (e.currentTarget as HTMLElement).style.background = 'var(--neutral-900)'; }}
                  >
                    <Icon size={16} style={{ color: 'var(--blue-500)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.desc}</div>
                    </div>
                    <ArrowRight size={13} style={{ color: 'var(--neutral-600)', flexShrink: 0 }} />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '1rem' }}>Prossimi eventi</h4>
              {events.slice(0, 5).map(ev => (
                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-heading)', fontWeight: 500 }}>{ev.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{new Date(ev.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} · {ev.location}</div>
                  </div>
                  <Link href="/admin/eventi" style={{ fontSize: '0.72rem', color: 'var(--blue-400)', textDecoration: 'none' }}>Gestisci</Link>
                </div>
              ))}
              {events.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', textAlign: 'center', padding: '1rem 0' }}>Nessun evento.</p>}
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '1rem' }}>Soci recenti</h4>
              {members.slice(0, 5).map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(27,75,170,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 600, color: 'var(--blue-500)' }}>
                      {m.nome[0]}{m.cognome[0]}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-heading)', fontWeight: 500 }}>{m.nome} {m.cognome}</span>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[m.stato], boxShadow: `0 0 8px ${statusColors[m.stato]}66` }} />
                </div>
              ))}
              {members.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', textAlign: 'center', padding: '1rem 0' }}>Nessun socio.</p>}
            </div>
          </div>

          {/* Scanner CTA */}
          <div style={{ marginTop: '1.5rem', padding: '1.25rem 1.5rem', background: 'rgba(27,75,170,0.12)', border: '1px solid rgba(27,75,170,0.3)', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <QrCode size={22} style={{ color: 'var(--blue-400)' }} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-heading)', fontSize: '0.9rem' }}>Scanner biglietti A&P</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>Apri lo scanner per validare i biglietti all&apos;ingresso</div>
              </div>
            </div>
            <Link href="/admin/scanner" target="_blank" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem' }}>
              Apri Scanner
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
