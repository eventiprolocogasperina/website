'use client';

import { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Users, CalendarCheck } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import type { Event } from '@/lib/data/events';
import type { Member } from '@/lib/data/members';

export default function AdminAnalyticsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [ticketStats, setTicketStats] = useState({ totalTickets: 0, totalRevenue: 0, checkedIn: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/events').then(r => r.json()),
      fetch('/api/members').then(r => r.json()),
      fetch('/api/tickets/stats?eventId=assaggia-passeggia').then(r => r.json()),
    ]).then(([evs, mems, stats]) => {
      setEvents(evs);
      setMembers(mems);
      if (stats.success) setTicketStats(stats.stats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <AdminHeader title="Analytics" />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--neutral-500)' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    </div>
  );

  const kpis = [
    { label: 'Tasso riempimento eventi', value: events.length ? `${Math.round(events.reduce((a, e) => a + e.registeredCount / e.maxParticipants, 0) / events.length * 100)}%` : '—', icon: TrendingUp, color: 'var(--blue-700)' },
    { label: 'Soci attivi', value: members.filter(m => m.stato === 'attivo').length, icon: Users, color: 'var(--gold-500)' },
    { label: 'Prenotazioni totali', value: events.reduce((a, e) => a + e.registeredCount, 0), icon: CalendarCheck, color: '#4ade80' },
    { label: 'Biglietti A&P venduti', value: ticketStats.totalTickets, icon: TrendingUp, color: 'var(--blue-500)' },
    { label: 'Incasso A&P', value: `€${ticketStats.totalRevenue}`, icon: TrendingUp, color: 'var(--gold-400)' },
    { label: 'Check-in A&P', value: ticketStats.checkedIn, icon: CalendarCheck, color: '#4ade80' },
  ];

  return (
    <div>
      <AdminHeader title="Analytics" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <Icon size={24} style={{ color: kpi.color, marginBottom: '0.75rem' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--color-heading)' }}>{kpi.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', marginTop: '0.3rem' }}>{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {events.length > 0 && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-heading)', marginBottom: '1.25rem' }}>Partecipazione per evento</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {events.map(ev => {
              const pct = ev.maxParticipants > 0 ? Math.round(ev.registeredCount / ev.maxParticipants * 100) : 0;
              return (
                <div key={ev.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--neutral-200)', fontWeight: 500 }}>{ev.title}</span>
                    <span style={{ color: pct > 80 ? 'var(--gold-400)' : 'var(--neutral-400)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--neutral-700)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: pct > 80 ? 'linear-gradient(90deg, var(--gold-500), var(--gold-400))' : 'linear-gradient(90deg, var(--blue-700), var(--blue-500))',
                      borderRadius: '4px', transition: 'width 0.8s ease',
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
      )}
    </div>
  );
}
