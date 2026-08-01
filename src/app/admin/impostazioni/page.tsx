'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Check, X, ToggleLeft, ToggleRight, Plus, Trash2, MessageCircle } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';

interface Settings {
  ticket_sales_enabled: string;
  event_date: string;
  contact_email: string;
  social_instagram: string;
  social_facebook: string;
  whatsapp_topics?: string;
  [key: string]: string | undefined;
}

interface SupportTopic {
  id: string;
  label: string;
  phone: string;
}

export default function AdminImpostazioniPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [topics, setTopics] = useState<SupportTopic[]>([]);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { 
        if (d.success) {
          setSettings(d.data);
          if (d.data.whatsapp_topics) {
            try {
              setTopics(JSON.parse(d.data.whatsapp_topics));
            } catch (e) {
              console.error('Error parsing whatsapp_topics', e);
            }
          } else {
            // Default topics if not found
            setTopics([
              { id: 'tickets', label: 'Problemi con i biglietti di A&P', phone: '393888693529' },
              { id: 'iscrizione', label: 'Iscrizione alla Pro Loco', phone: '393279783232' },
              { id: 'pagamenti', label: 'Pagamenti', phone: '393888693529' },
            ]);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        ...settings,
        whatsapp_topics: JSON.stringify(topics),
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

          {/* Argomenti Assistenza WhatsApp */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem' }}>
              <h3 style={{ color: 'var(--color-heading)', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageCircle size={18} style={{ color: '#25D366' }} /> Argomenti Assistenza WhatsApp
              </h3>
              <button 
                onClick={() => setTopics([...topics, { id: Date.now().toString(), label: '', phone: '' }])}
                className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                <Plus size={14} /> Aggiungi
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {topics.map((topic, idx) => (
                <div key={topic.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'var(--neutral-900)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-800)' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--neutral-400)', marginBottom: '0.2rem' }}>Testo Argomento</label>
                      <input
                        type="text"
                        value={topic.label}
                        onChange={(e) => {
                          const newTopics = [...topics];
                          newTopics[idx].label = e.target.value;
                          setTopics(newTopics);
                        }}
                        placeholder="Es. Problemi con l'acquisto"
                        style={{ width: '100%', padding: '0.6rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--neutral-400)', marginBottom: '0.2rem' }}>Numero WhatsApp (Prefisso senza +)</label>
                      <input
                        type="text"
                        value={topic.phone}
                        onChange={(e) => {
                          const newTopics = [...topics];
                          newTopics[idx].phone = e.target.value;
                          setTopics(newTopics);
                        }}
                        placeholder="Es. 393888693529"
                        style={{ width: '100%', padding: '0.6rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const newTopics = topics.filter((_, i) => i !== idx);
                      setTopics(newTopics);
                    }}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: 'var(--radius-sm)', padding: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Rimuovi"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {topics.length === 0 && (
                <div style={{ color: 'var(--neutral-500)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  Nessun argomento impostato. Gli utenti non potranno usare l'assistenza WhatsApp.
                </div>
              )}
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
