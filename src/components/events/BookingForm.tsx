'use client';

import { useState } from 'react';
import { Send, CheckCircle, Download } from 'lucide-react';

interface BookingFormProps {
  eventTitle: string;
  eventSlug: string;
}

interface FormData {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  partecipanti: string;
  note: string;
  gdpr: boolean;
}

export default function BookingForm({ eventTitle, eventSlug }: BookingFormProps) {
  const [form, setForm] = useState<FormData>({
    nome: '', cognome: '', email: '', telefono: '', partecipanti: '1', note: '', gdpr: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.nome.trim()) e.nome = 'Nome richiesto';
    if (!form.cognome.trim()) e.cognome = 'Cognome richiesto';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email non valida';
    if (!form.gdpr) e.gdpr = 'Consenso richiesto';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitted(true);
  };

  const downloadTicket = () => {
    // Simple text-based ticket download (PDF generation would use @react-pdf/renderer in a fuller implementation)
    const content = `BIGLIETTO DI PRENOTAZIONE
================================
Evento: ${eventTitle}
Nome: ${form.nome} ${form.cognome}
Email: ${form.email}
Partecipanti: ${form.partecipanti}
Data emissione: ${new Date().toLocaleDateString('it-IT')}
ID Prenotazione: PLG-${eventSlug.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}
================================
Pro Loco Gasperina APS
info@prolocogasperina.it`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prenotazione-${eventSlug}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: '50%',
          background: 'rgba(34,197,94,0.12)',
          border: '1px solid rgba(34,197,94,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <CheckCircle size={24} style={{ color: '#4ade80' }} />
        </div>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-heading)', marginBottom: '0.5rem' }}>Prenotazione confermata!</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Grazie <strong style={{ color: 'var(--color-heading)' }}>{form.nome}</strong>! La tua prenotazione per <em>{eventTitle}</em> è stata ricevuta.
        </p>
        <button onClick={downloadTicket} className="btn btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
          <Download size={15} /> Scarica il tuo biglietto
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label className="form-label" htmlFor="bf-nome">Nome *</label>
          <input id="bf-nome" className="form-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Mario" />
          {errors.nome && <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.2rem' }}>{errors.nome}</p>}
        </div>
        <div>
          <label className="form-label" htmlFor="bf-cognome">Cognome *</label>
          <input id="bf-cognome" className="form-input" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} placeholder="Rossi" />
          {errors.cognome && <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.2rem' }}>{errors.cognome}</p>}
        </div>
      </div>
      <div>
        <label className="form-label" htmlFor="bf-email">Email *</label>
        <input id="bf-email" type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="mario@example.com" />
        {errors.email && <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.2rem' }}>{errors.email}</p>}
      </div>
      <div>
        <label className="form-label" htmlFor="bf-telefono">Telefono</label>
        <input id="bf-telefono" type="tel" className="form-input" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+39 333 000 0000" />
      </div>
      <div>
        <label className="form-label" htmlFor="bf-partecipanti">N° partecipanti *</label>
        <select id="bf-partecipanti" className="form-input" value={form.partecipanti} onChange={e => setForm(f => ({ ...f, partecipanti: e.target.value }))}
          style={{ cursor: 'pointer' }}>
          {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'persone'}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label" htmlFor="bf-note">Note aggiuntive</label>
        <textarea id="bf-note" className="form-input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          placeholder="Es. esigenze alimentari, accessibilità..." rows={2} style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
        <input id="bf-gdpr" type="checkbox" checked={form.gdpr} onChange={e => setForm(f => ({ ...f, gdpr: e.target.checked }))}
          style={{ marginTop: '2px', accentColor: 'var(--blue-700)', flexShrink: 0 }} />
        <label htmlFor="bf-gdpr" style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', lineHeight: 1.5 }}>
          Acconsento al trattamento dei dati personali ai sensi del GDPR (Regolamento UE 2016/679) per la gestione della prenotazione. *
        </label>
      </div>
      {errors.gdpr && <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '-0.4rem' }}>{errors.gdpr}</p>}
      <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }} id="booking-submit">
        <Send size={15} /> Prenota ora
      </button>
    </form>
  );
}
