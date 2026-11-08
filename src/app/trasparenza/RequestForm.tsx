'use client';

import { useState } from 'react';
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
      <div role="status" className="vcard">
        <p>Richiesta ricevuta. Ti rispondiamo all&apos;email indicata entro 30 giorni.</p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="full">Cosa vuoi chiederci
        <select value={form.kind} onChange={(e) => set({ kind: e.target.value as PrivacyRequestKind })}>
          {PRIVACY_REQUEST_KINDS.map((k) => (
            <option key={k} value={k}>
              {PRIVACY_REQUEST_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <label>Nome e cognome<input autoComplete="name" required value={form.name} onChange={(e) => set({ name: e.target.value })} /></label>
      <label>Email<input type="email" autoComplete="email" required value={form.email} onChange={(e) => set({ email: e.target.value })} /></label>
      <label className="full">Dettagli (facoltativo)
        <textarea maxLength={2000} value={form.message} onChange={(e) => set({ message: e.target.value })} placeholder="Es. il codice dell'ordine o l'evento a cui hai partecipato" />
      </label>
      {/* Campo trappola per i bot: nascosto alle persone e ai lettori di schermo. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden value={form.website} onChange={(e) => set({ website: e.target.value })} style={{ position: 'absolute', left: '-9999px', width: 1 }} />
      <label className="check full">
        <input type="checkbox" checked={form.consent} onChange={(e) => set({ consent: e.target.checked })} />
        <span>Acconsento all&apos;uso di questi dati solo per gestire la mia richiesta.</span>
      </label>
      {state.error && <p role="alert" className="err full" style={{ margin: 0 }}>{state.error}</p>}
      <div className="full">
        <button type="submit" className="vbtn vbtn-gold" disabled={state.status === 'sending'} style={{ cursor: 'pointer' }}>
          {state.status === 'sending' ? 'Invio in corso…' : 'Invia la richiesta'}
        </button>
      </div>
    </form>
  );
}
