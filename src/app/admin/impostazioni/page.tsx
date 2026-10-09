'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Check, X, ToggleLeft, ToggleRight, Plus, Trash2, MessageCircle, Mail, AlertCircle } from 'lucide-react';
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
              { id: 'tickets', label: 'Richiesta Informazioni Eventi', phone: '393505757501' },
              { id: 'iscrizione', label: 'Iscrizione alla Pro Loco', phone: '393505757501' },
              { id: 'pagamenti', label: 'Pagamenti', phone: '393505757501' },
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
          <div className="card" style={{ padding: '1.5rem' }}>
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
                        placeholder="Es. 393505757501"
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

          {/* Meta WhatsApp Cloud API Integration & Broadcast Settings */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(37,211,102,0.3)' }}>
            <h3 style={{ color: 'var(--color-heading)', fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageCircle size={20} style={{ color: '#25D366' }} /> Meta WhatsApp Cloud API (Invio Broadcast & Rinvio)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Configura qui le credenziali <strong>Meta Developer / WhatsApp Business Cloud API</strong> per consentire all&apos;associazione di inviare comunicazioni tempestive WhatsApp agli acquirenti in caso di rinvio o comunicazioni organizzative.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Phone Number ID (Meta App)
                </label>
                <input
                  type="text"
                  placeholder="Es. 105938475928374"
                  value={settings.wa_phone_number_id || ''}
                  onChange={e => setSettings({ ...settings, wa_phone_number_id: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Permanent Access Token (Meta Bearer Token)
                </label>
                <input
                  type="password"
                  placeholder="EAA..."
                  value={settings.wa_access_token || ''}
                  onChange={e => setSettings({ ...settings, wa_access_token: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>
                    Nome Template Meta (opzionale)
                  </label>
                  <input
                    type="text"
                    placeholder="Es. avviso_rinvio_evento"
                    value={settings.wa_template_name || ''}
                    onChange={e => setSettings({ ...settings, wa_template_name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>
                    Codice Lingua Template
                  </label>
                  <input
                    type="text"
                    placeholder="it"
                    value={settings.wa_language_code || 'it'}
                    onChange={e => setSettings({ ...settings, wa_language_code: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Webhook Configuration Details Box */}
              <div style={{ background: 'var(--neutral-900)', border: '1px solid rgba(37,211,102,0.3)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 700, color: '#4ade80', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  🔗 Dati per Configurazione Webhook (Meta Developers)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--neutral-400)', marginBottom: '0.25rem' }}>
                      URL di Callback (incolla su Meta Developer)
                    </label>
                    <code style={{ display: 'block', width: '100%', padding: '0.5rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-sm)', color: '#4ade80', fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      https://prolocogasperina.it/api/webhooks/whatsapp
                    </code>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--neutral-400)', marginBottom: '0.25rem' }}>
                      Verifica il Token (incolla su Meta Developer)
                    </label>
                    <input
                      type="text"
                      value={settings.wa_webhook_verify_token || 'proloco_whatsapp_webhook_secret_2026'}
                      onChange={e => setSettings({ ...settings, wa_webhook_verify_token: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-sm)', color: '#4ade80', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Editable Message Template with Placeholders */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Messaggio Predefinito per Rinvio / Avviso WhatsApp
                </label>
                <textarea
                  rows={4}
                  value={settings.wa_postponement_message || `Ciao {{nome}}, ti informiamo che l'evento {{evento}} è stato rinviato alla nuova data di {{nuova_data}}. I tuoi biglietti rimangono 100% validi per la nuova data. Consulta il regolamento completo: {{regolamento}}`}
                  onChange={e => setSettings({ ...settings, wa_postponement_message: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.88rem', outline: 'none', fontFamily: 'monospace', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
                <div style={{ marginTop: '0.5rem', background: 'var(--neutral-900)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neutral-800)', fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                  <strong>Placeholder disponibili:</strong>
                  <span style={{ color: '#25D366', marginLeft: '0.5rem', fontFamily: 'monospace' }}>{'{{nome}}'}</span>,
                  <span style={{ color: '#25D366', marginLeft: '0.5rem', fontFamily: 'monospace' }}>{'{{nuova_data}}'}</span>,
                  <span style={{ color: '#25D366', marginLeft: '0.5rem', fontFamily: 'monospace' }}>{'{{evento}}'}</span>,
                  <span style={{ color: '#25D366', marginLeft: '0.5rem', fontFamily: 'monospace' }}>{'{{regolamento}}'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email Broadcast & Postponement Communication Template */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(234,88,12,0.4)' }}>
            <h3 style={{ color: 'var(--color-heading)', fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={18} style={{ color: '#ea580c' }} /> Email Broadcast Rinvio Evento (Testo Personalizzabile)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Configura qui il modello di testo predefinito per le **email di comunicazione rinvio**. Il layout grafico e il pulsante per avviare la chat WhatsApp con l&apos;assistenza verranno generati automaticamente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Oggetto Email Predefinito
                </label>
                <input
                  type="text"
                  placeholder="📢 Comunicazione Ufficiale Meteo: Rinvio Zuccaland 2026"
                  value={settings.email_postponement_subject || '📢 Comunicazione Ufficiale Meteo: Rinvio Zuccaland 2026'}
                  onChange={e => setSettings({ ...settings, email_postponement_subject: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Corpo Testo Email (personalizzabile)
                </label>
                <textarea
                  rows={5}
                  value={settings.email_postponement_body || `Causa avverse condizioni meteorologiche accertate, l'evento {{evento}} è rinviato alla nuova data di {{nuova_data}}.\n\nTi rassicuriamo che tutti i biglietti e le attività già prenotate per il tuo ordine {{ordine_id}} rimangono 100% validi per la nuova data di recupero.\n\nPer qualsiasi necessità o chiarimento, il nostro team è a tua completa disposizione via WhatsApp.`}
                  onChange={e => setSettings({ ...settings, email_postponement_body: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.88rem', outline: 'none', fontFamily: 'monospace', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
                <div style={{ marginTop: '0.5rem', background: 'var(--neutral-900)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neutral-800)', fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>
                    <strong>Formatting Markdown:</strong> Puoi usare <code style={{ color: '#ea580c' }}>**grassetto**</code>, <code style={{ color: '#ea580c' }}>*corsivo*</code>, <code style={{ color: '#ea580c' }}>[Testo Link](https://...)</code> ed elenchi puntati <code style={{ color: '#ea580c' }}>- elemento</code>.
                  </div>
                  <div>
                    <strong>Segnaposto:</strong>
                    <span style={{ color: '#ea580c', marginLeft: '0.4rem', fontFamily: 'monospace' }}>{'{{nome}}'}</span>,
                    <span style={{ color: '#ea580c', marginLeft: '0.4rem', fontFamily: 'monospace' }}>{'{{ordine_id}}'}</span>,
                    <span style={{ color: '#ea580c', marginLeft: '0.4rem', fontFamily: 'monospace' }}>{'{{nuova_data}}'}</span>,
                    <span style={{ color: '#ea580c', marginLeft: '0.4rem', fontFamily: 'monospace' }}>{'{{evento}}'}</span>,
                    <span style={{ color: '#ea580c', marginLeft: '0.4rem', fontFamily: 'monospace' }}>{'{{regolamento}}'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Zuccaland Postponement Banner & Popup CMS Settings */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(245,158,11,0.4)' }}>
            <h3 style={{ color: 'var(--color-heading)', fontWeight: 600, marginBottom: '1.25rem', fontSize: '1rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} style={{ color: '#f59e0b' }} /> Banner & Popup Rinvio Zuccaland sul Sito
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Modifica e attiva il banner adesivo in cima al sito e il popup di avviso per il rinvio di Zuccaland.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--neutral-900)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-800)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-heading)' }}>Stato Banner Rinvio sul Sito</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--neutral-400)' }}>Mostra il banner in evidenza su /zuccaland</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, zuccaland_postponed_enabled: settings.zuccaland_postponed_enabled === 'true' ? 'false' : 'true' })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: settings.zuccaland_postponed_enabled === 'true' ? '#f59e0b' : 'var(--neutral-600)' }}
                >
                  {settings.zuccaland_postponed_enabled === 'true' ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Titolo Avviso Rinvio
                </label>
                <input
                  type="text"
                  placeholder="AVVISO IMPORTANTE: RINVIO PER METEO AVVERSO"
                  value={settings.zuccaland_postponed_title || 'AVVISO IMPORTANTE: RINVIO PER METEO AVVERSO'}
                  onChange={e => setSettings({ ...settings, zuccaland_postponed_title: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Nuova Data dell&apos;Evento (Mostrata nel Banner)
                </label>
                <input
                  type="text"
                  placeholder="Sabato 17 Ottobre 2026"
                  value={settings.zuccaland_postponed_new_date || 'Sabato 17 Ottobre 2026'}
                  onChange={e => setSettings({ ...settings, zuccaland_postponed_new_date: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 500 }}>
                  Messaggio Dettagliato nel Popup
                </label>
                <textarea
                  rows={3}
                  value={settings.zuccaland_postponed_message || "Causa condizioni meteo avverse accertate, l'evento Zuccaland è rinviato alla nuova data di Sabato 17 Ottobre 2026. I biglietti già acquistati rimangono 100% validi per la nuova data di recupero."}
                  onChange={e => setSettings({ ...settings, zuccaland_postponed_message: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', fontSize: '0.88rem', outline: 'none', fontFamily: 'monospace', lineHeight: 1.5, boxSizing: 'border-box' }}
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
