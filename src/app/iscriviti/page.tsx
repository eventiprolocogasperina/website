'use client';

import { useState } from 'react';
import { Download, CheckCircle, Send } from 'lucide-react';

export default function IscrivitiPage() {
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', tipoSocio: 'ordinario', gdpr: false, statuto: false });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Richiesto';
    if (!form.cognome.trim()) e.cognome = 'Richiesto';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email non valida';
    if (!form.gdpr) e.gdpr = 'Consenso richiesto';
    if (!form.statuto) e.statuto = 'Accettazione richiesta';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => { ev.preventDefault(); if (validate()) setSubmitted(true); };

  const downloadCard = () => {
    const content = `TESSERA ASSOCIATIVA\n============================\nPro Loco Gasperina APS\n============================\nSocio: ${form.nome} ${form.cognome}\nTipo: ${form.tipoSocio}\nAnno: ${new Date().getFullYear()}\nID: PLG-${Date.now().toString(36).toUpperCase()}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tessera-${form.cognome.toLowerCase()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const tipi = [
    { id: 'ordinario', label: 'Socio Ordinario', price: '€ 10/anno' },
    { id: 'sostenitore', label: 'Socio Sostenitore', price: '€ 25/anno' },
    { id: 'onorario', label: 'Socio Onorario', price: 'Su nomina' },
  ];

  return (
    <div style={{ paddingTop: '7rem', background: 'var(--neutral-950)', minHeight: '100vh', padding: '7rem 1.5rem 5rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p className="label">Unisciti a noi</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          <h1 style={{ fontWeight: 300, marginBottom: '0.75rem' }}>
            Diventa <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>socio</em>
          </h1>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)' }}>
            <CheckCircle size={48} style={{ color: '#4ade80', margin: '0 auto 1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-heading)', marginBottom: '0.5rem' }}>Richiesta inviata!</h3>
            <p style={{ color: 'var(--neutral-400)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Grazie <strong style={{ color: 'var(--color-heading)' }}>{form.nome} {form.cognome}</strong>! Ti contatteremo a breve.
            </p>
            <button onClick={downloadCard} className="btn btn-gold">
              <Download size={15} /> Scarica la tessera provvisoria
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              {tipi.map(tipo => (
                <button key={tipo.id} type="button" onClick={() => setForm(f => ({ ...f, tipoSocio: tipo.id }))}
                  style={{
                    flex: '1 1 160px', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: form.tipoSocio === tipo.id ? '2px solid var(--blue-700)' : '2px solid var(--neutral-700)',
                    background: form.tipoSocio === tipo.id ? 'rgba(27,75,170,0.15)' : 'var(--neutral-800)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-heading)', fontSize: '0.9rem' }}>{tipo.label}</div>
                  <div style={{ color: 'var(--gold-500)', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem' }}>{tipo.price}</div>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" htmlFor="iscr-nome">Nome *</label>
                  <input id="iscr-nome" className="form-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Mario" />
                  {errors.nome && <p style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.2rem' }}>{errors.nome}</p>}
                </div>
                <div>
                  <label className="form-label" htmlFor="iscr-cognome">Cognome *</label>
                  <input id="iscr-cognome" className="form-input" value={form.cognome} onChange={e => setForm(f => ({ ...f, cognome: e.target.value }))} placeholder="Rossi" />
                  {errors.cognome && <p style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.2rem' }}>{errors.cognome}</p>}
                </div>
              </div>
              <div>
                <label className="form-label" htmlFor="iscr-email">Email *</label>
                <input id="iscr-email" type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="mario@example.com" />
                {errors.email && <p style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.2rem' }}>{errors.email}</p>}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', paddingTop: '0.5rem', borderTop: '1px solid var(--neutral-700)' }}>
                <input id="iscr-statuto" type="checkbox" checked={form.statuto} onChange={e => setForm(f => ({ ...f, statuto: e.target.checked }))} style={{ marginTop: '2px', accentColor: 'var(--blue-700)' }} />
                <label htmlFor="iscr-statuto" style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', lineHeight: 1.5 }}>
                  Accetto lo Statuto della Pro Loco Gasperina APS *
                </label>
              </div>
              {errors.statuto && <p style={{ fontSize: '0.72rem', color: '#f87171' }}>{errors.statuto}</p>}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <input id="iscr-gdpr" type="checkbox" checked={form.gdpr} onChange={e => setForm(f => ({ ...f, gdpr: e.target.checked }))} style={{ marginTop: '2px', accentColor: 'var(--blue-700)' }} />
                <label htmlFor="iscr-gdpr" style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', lineHeight: 1.5 }}>
                  Acconsento al trattamento dei dati personali (GDPR UE 2016/679) *
                </label>
              </div>
              {errors.gdpr && <p style={{ fontSize: '0.72rem', color: '#f87171' }}>{errors.gdpr}</p>}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} id="membership-submit">
                <Send size={15} /> Invia richiesta di iscrizione
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
