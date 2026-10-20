'use client';

import { useState } from 'react';
import { CheckCircle, Send } from 'lucide-react';
import { PRIVACY_REQUEST_KINDS, PRIVACY_REQUEST_LABELS, type PrivacyRequestKind } from '@/lib/public/transparency';
import { sendPrivacyRequest } from './actions';

// Modulo per esercitare i diritti (§13.6.5): crea una richiesta da gestire in /admin/sito/trasparenza.

export function RequestForm() {
  const [form, setForm] = useState({ kind: 'access' as PrivacyRequestKind, name: '', email: '', message: '', consent: false, website: '' });
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'sent' } & { error?: string }>({ status: 'idle' });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consent) return setState({ status: 'idle', error: 'Serve il consenso per gestire la richiesta.' });
    setState({ status: 'sending' });
    const res = await sendPrivacyRequest({ ...form, consent: true, message: form.message || undefined, website: form.website || undefined });
    setState(res.ok ? { status: 'sent' } : { status: 'idle', error: res.error });
  }

  if (state.status === 'sent') {
    return (
      <div role="status" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.75rem', padding: '1.25rem' }}>
        <CheckCircle size={20} aria-hidden style={{ color: '#4ade80', flexShrink: 0, marginTop: 2 }} />
        <p style={{ margin: 0 }}>Richiesta ricevuta. Ti rispondiamo all’email indicata entro 30 giorni.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: '1rem' }}>
      <div>
        <label className="form-label" htmlFor="pr-kind">
          Cosa vuoi chiederci
        </label>
        <select id="pr-kind" className="form-input" value={form.kind} onChange={(e) => set({ kind: e.target.value as PrivacyRequestKind })}>
          {PRIVACY_REQUEST_KINDS.map((k) => (
            <option key={k} value={k}>
              {PRIVACY_REQUEST_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))' }}>
        <div>
          <label className="form-label" htmlFor="pr-name">
            Nome e cognome
          </label>
          <input id="pr-name" className="form-input" autoComplete="name" required value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div>
          <label className="form-label" htmlFor="pr-email">
            Email
          </label>
          <input id="pr-email" className="form-input" type="email" autoComplete="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="form-label" htmlFor="pr-message">
          Dettagli (facoltativo)
        </label>
        <textarea
          id="pr-message"
          className="form-input"
          rows={4}
          maxLength={2000}
          value={form.message}
          onChange={(e) => set({ message: e.target.value })}
          placeholder="Es. il codice dell’ordine o l’evento a cui hai partecipato"
        />
      </div>
      {/* Campo trappola per i bot: nascosto alle persone e ai lettori di schermo. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden value={form.website} onChange={(e) => set({ website: e.target.value })} style={{ position: 'absolute', left: '-9999px' }} />
      <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.88rem', color: 'var(--neutral-300)' }}>
        <input type="checkbox" checked={form.consent} onChange={(e) => set({ consent: e.target.checked })} style={{ marginTop: 4, width: 18, height: 18 }} />
        <span>Acconsento all’uso di questi dati solo per gestire la mia richiesta.</span>
      </label>
      {state.error && (
        <p role="alert" style={{ margin: 0, color: '#f87171', fontSize: '0.9rem' }}>
          {state.error}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-gold" disabled={state.status === 'sending'} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Send size={16} aria-hidden /> {state.status === 'sending' ? 'Invio in corso…' : 'Invia la richiesta'}
        </button>
      </div>
    </form>
  );
}
