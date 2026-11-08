'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { PageHero, V3Page } from '@/components/site/ui';
import { CONTACT_INBOX, CONTACT_SUBJECTS } from '@/lib/public/contact';

const EMAIL = CONTACT_INBOX;

export default function ContattiPage() {
  const [form, setForm] = useState({ nome: '', email: '', oggetto: CONTACT_SUBJECTS[0] as string, messaggio: '', website: '' });
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'sent'; error?: string }>({ status: 'idle' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: 'sending' });
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      setState(res.ok ? { status: 'sent' } : { status: 'idle', error: data.error ?? 'Qualcosa è andato storto. Riprova più tardi.' });
    } catch {
      setState({ status: 'idle', error: `Connessione assente. Riprova o scrivici a ${EMAIL}.` });
    }
  }

  return (
    <V3Page>
      <PageHero eyebrow="Scrivici" title="Contatta" accent="ci." lede="Siamo a tua disposizione per informazioni su eventi, iscrizioni, collaborazioni e sponsorizzazioni." />

      <section className="panel p-white">
        <div className="split" style={{ gridTemplateColumns: '1fr 1.4fr', alignItems: 'start' }}>
          <div className="rows">
            <div className="row" style={{ gridTemplateColumns: '1fr' }}>
              <div><h3 className="h3">Sede</h3><p>Via Raffaele Milano SNC<br />88060 Gasperina (CZ), Calabria</p></div>
            </div>
            <div className="row" style={{ gridTemplateColumns: '1fr' }}>
              <div><h3 className="h3">Email</h3><p><a href={`mailto:${EMAIL}`}>{EMAIL}</a></p></div>
            </div>
            <div className="row" style={{ gridTemplateColumns: '1fr' }}>
              <div><h3 className="h3">Telefono</h3><p><a href="tel:+393505757501">+39 350 575 7501</a></p></div>
            </div>
            <div className="roundpic" style={{ aspectRatio: '16/10', borderRadius: 22, position: 'relative' }}>
              <Image src="/img/IMG1.jpg" alt="Centro storico di Gasperina" fill sizes="(max-width: 960px) 100vw, 440px" style={{ objectFit: 'cover' }} />
            </div>
            <div className="actions">
              <a className="vbtn vbtn-blue vbtn-sm" href="https://www.instagram.com/prolocogasperina_aps/" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a className="vbtn vbtn-blue vbtn-sm" href="https://www.facebook.com/prolocogasperina/" target="_blank" rel="noopener noreferrer">Facebook</a>
            </div>
          </div>

          {state.status === 'sent' ? (
            <div className="vcard" role="status" style={{ padding: 34 }}>
              <h2 className="h2" style={{ fontSize: 'clamp(34px,3.4vw,48px)' }}>Messaggio inviato.</h2>
              <p style={{ marginTop: 16 }}>Grazie {form.nome}! Ti rispondiamo all&apos;indirizzo {form.email} il prima possibile.</p>
            </div>
          ) : (
            <form className="form vcard" onSubmit={handleSubmit} style={{ padding: 34 }}>
              <h2 className="h2 full" style={{ fontSize: 'clamp(34px,3.4vw,48px)' }}>Invia un messaggio.</h2>
              <label>Nome<input value={form.nome} onChange={set('nome')} required maxLength={80} autoComplete="name" /></label>
              <label>Email<input type="email" value={form.email} onChange={set('email')} required maxLength={120} autoComplete="email" /></label>
              <label className="full">Oggetto
                <select value={form.oggetto} onChange={set('oggetto')}>
                  {CONTACT_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label className="full">Messaggio<textarea value={form.messaggio} onChange={set('messaggio')} required maxLength={4000} /></label>
              {/* Campo trappola per i bot: nascosto alle persone e ai lettori di schermo. */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden value={form.website} onChange={set('website')} style={{ position: 'absolute', left: '-9999px', width: 1 }} />
              <p className="muted full" style={{ fontSize: 14, margin: 0 }}>
                Usiamo nome e email solo per risponderti. <Link href="/privacy" style={{ textDecoration: 'underline' }}>Informativa privacy</Link>
              </p>
              {state.error && <p role="alert" className="err full" style={{ margin: 0 }}>{state.error}</p>}
              <div className="full">
                <button className="vbtn vbtn-gold" type="submit" disabled={state.status === 'sending'} style={{ cursor: 'pointer', opacity: state.status === 'sending' ? 0.7 : 1 }}>
                  {state.status === 'sending' ? 'Invio in corso…' : 'Invia messaggio'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </V3Page>
  );
}
