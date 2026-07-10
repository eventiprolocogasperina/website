'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';

interface Settings {
  ticket_sales_enabled: string;
  event_date: string;
  contact_email: string;
  social_instagram: string;
  social_facebook: string;
  [key: string]: string;
}

export default function AdminImpostazioniPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { if (d.success) setSettings(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', msg: 'Impostazioni salvate con successo!' });
        setTimeout(() => setStatus(null), 4000);
      } else {
        setStatus({ type: 'error', msg: data.error || 'Errore' });
      }
    } finally {
      setSaving(false);
    }
  };

  const ticketsEnabled = settings?.ticket_sales_enabled === 'true';

  return (
    <div>
      <AdminHeader
        title="Impostazioni Sito"
        subtitle="Configurazioni globali del sito web"
        actions={
          <button onClick={handleSave} disabled={saving || loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvataggio...</> : <><Save size={14} /> Salva</>}
          </button>
        }
      />

      {status && (
        <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: status.type === 'success' ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)', color: status.type === 'success' ? '#4ade80' : '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {status.type === 'success' ? <Check size={16} /> : <X size={16} />} {status.msg}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={32} style={{ color: 'var(--neutral-500)' }} /></div>
      ) : settings ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px' }}>
          
          {/* Evento */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--color-heading)', fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem' }}>
              🎉 Evento Principale
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Ticket toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--neutral-800)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-heading)', fontSize: '0.9rem' }}>Vendita Biglietti Attiva</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', marginTop: '0.2rem' }}>
                    {ticketsEnabled ? '✅ I clienti possono acquistare biglietti' : '🔴 La vendita è sospesa'}
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, ticket_sales_enabled: ticketsEnabled ? 'false' : 'true' })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: ticketsEnabled ? '#4ade80' : 'var(--neutral-500)' }}
                >
                  {ticketsEnabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Data dell&apos;evento</label>
                <input
                  type="date"
                  value={settings.event_date || ''}
                  onChange={e => setSettings({ ...settings, event_date: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Contatti */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--color-heading)', fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem' }}>
              📬 Contatti e Social
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Email di contatto</label>
                <input
                  type="email"
                  value={settings.contact_email || ''}
                  onChange={e => setSettings({ ...settings, contact_email: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Instagram URL</label>
                <input
                  type="url"
                  value={settings.social_instagram || ''}
                  onChange={e => setSettings({ ...settings, social_instagram: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>Facebook URL</label>
                <input
                  type="url"
                  value={settings.social_facebook || ''}
                  onChange={e => setSettings({ ...settings, social_facebook: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div style={{ color: 'var(--neutral-500)', textAlign: 'center', padding: '2rem' }}>
          Errore nel caricamento. Assicurati di aver eseguito /api/setup.
        </div>
      )}
    </div>
  );
}
