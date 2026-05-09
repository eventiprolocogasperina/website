'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircle, Send, Loader2 } from 'lucide-react';

interface FormData {
  nome: string;
  cognome: string;
  luogoNascita: string;
  provNascita: string;
  dataNascita: string;
  residenza: string;
  provResidenza: string;
  cap: string;
  indirizzo: string;
  civico: string;
  codiceFiscale: string;
  cellulare: string;
  email: string;
  tipoSocio: 'ordinario' | 'sostenitore';
  quotaSostenitore: string;
  statuto: boolean;
  privacy: boolean;
}

const initialForm: FormData = {
  nome: '', cognome: '', luogoNascita: '', provNascita: '', dataNascita: '',
  residenza: '', provResidenza: '', cap: '', indirizzo: '', civico: '',
  codiceFiscale: '', cellulare: '', email: '',
  tipoSocio: 'ordinario', quotaSostenitore: '',
  statuto: false, privacy: false,
};

export default function IscrivitiPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Richiesto';
    if (!form.cognome.trim()) e.cognome = 'Richiesto';
    if (!form.luogoNascita.trim()) e.luogoNascita = 'Richiesto';
    if (!form.dataNascita) e.dataNascita = 'Richiesto';
    if (!form.residenza.trim()) e.residenza = 'Richiesto';
    if (!form.indirizzo.trim()) e.indirizzo = 'Richiesto';
    if (!form.codiceFiscale.trim()) e.codiceFiscale = 'Richiesto';
    else if (!/^[A-Za-z]{6}\d{2}[A-Za-z]\d{2}[A-Za-z]\d{3}[A-Za-z]$/.test(form.codiceFiscale.trim()))
      e.codiceFiscale = 'Codice fiscale non valido';
    if (!form.cellulare.trim()) e.cellulare = 'Richiesto';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email non valida';
    if (!form.statuto) e.statuto = 'Accettazione richiesta';
    if (!form.privacy) e.privacy = 'Consenso richiesto';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setApiError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Errore durante l'invio della richiesta.");
      setSubmitted(true);
    } catch (err: any) {
      setApiError(err.message || 'Qualcosa è andato storto. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.85rem',
    background: 'var(--neutral-900)', border: '1px solid var(--neutral-700)',
    borderRadius: 'var(--radius-md)', color: 'var(--color-text)',
    fontFamily: 'var(--font-body)', fontSize: '0.88rem',
    outline: 'none', transition: 'border-color 0.2s',
  };

  const labelStyle = {
    fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600 as const,
    color: 'var(--neutral-400)', marginBottom: '0.3rem', display: 'block' as const,
    letterSpacing: '0.02em',
  };

  const errStyle = { fontSize: '0.72rem', color: '#f87171', marginTop: '0.2rem' };

  const Field = ({ label, field, placeholder, type = 'text', required = true, style = {} }: {
    label: string; field: keyof FormData; placeholder?: string; type?: string; required?: boolean; style?: React.CSSProperties;
  }) => (
    <div style={style}>
      <label style={labelStyle}>{label}{required && ' *'}</label>
      <input
        type={type}
        value={form[field] as string}
        onChange={set(field)}
        placeholder={placeholder}
        style={inputStyle}
      />
      {errors[field] && <p style={errStyle}>{errors[field]}</p>}
    </div>
  );

  return (
    <div style={{ paddingTop: '7rem', background: 'var(--neutral-950)', minHeight: '100vh', padding: '7rem 1.5rem 5rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Image src="/img/Logo_color_sm.png" alt="Pro Loco Gasperina" width={80} height={80} style={{ margin: '0 auto 1rem', objectFit: 'contain' }} />
          <p className="label">Anno {new Date().getFullYear()}</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          <h1 style={{ fontWeight: 300, marginBottom: '0.5rem', color: 'var(--color-heading)' }}>
            Richiesta di <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>Iscrizione</em>
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--neutral-400)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>
            Modulo di Richiesta di Iscrizione all&apos;Associazione<br />
            <strong style={{ color: 'var(--color-heading)' }}>Pro Loco di Gasperina APS</strong>
          </p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)' }}>
            <CheckCircle size={48} style={{ color: '#4ade80', margin: '0 auto 1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-heading)', marginBottom: '0.75rem' }}>
              Richiesta inviata con successo!
            </h3>
            <p style={{ color: 'var(--neutral-400)', lineHeight: 1.8, maxWidth: '440px', margin: '0 auto' }}>
              Grazie <strong style={{ color: 'var(--color-heading)' }}>{form.nome} {form.cognome}</strong>!<br />
              Riceverai una email di conferma all&apos;indirizzo <strong style={{ color: 'var(--gold-400)' }}>{form.email}</strong>.<br /><br />
              L&apos;iscrizione si intende effettiva al momento della comunicazione dell&apos;accettazione da parte del Consiglio Direttivo, che ti contatterà quanto prima con i dettagli per il pagamento della quota associativa e il numero tessera.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            display: 'flex', flexDirection: 'column', gap: '1.5rem',
            background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
            borderRadius: 'var(--radius-xl)', padding: '2rem',
          }}>

            {/* === SEZIONE 1: Dati Anagrafici === */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-heading)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-700)' }}>
                Dati Anagrafici
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Nome" field="nome" placeholder="Mario" />
                <Field label="Cognome" field="cognome" placeholder="Rossi" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <Field label="Luogo di nascita" field="luogoNascita" placeholder="Catanzaro" />
                <Field label="Prov." field="provNascita" placeholder="CZ" required={false} />
                <Field label="Data di nascita" field="dataNascita" type="date" />
              </div>
            </div>

            {/* === SEZIONE 2: Residenza === */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-heading)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-700)' }}>
                Residenza
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '0.75rem' }}>
                <Field label="Comune" field="residenza" placeholder="Gasperina" />
                <Field label="Prov." field="provResidenza" placeholder="CZ" required={false} />
                <Field label="CAP" field="cap" placeholder="88060" required={false} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '0.75rem', marginTop: '0.75rem' }}>
                <Field label="Via / Indirizzo" field="indirizzo" placeholder="Via Raffaele Milano" />
                <Field label="N." field="civico" placeholder="SNC" required={false} />
              </div>
            </div>

            {/* === SEZIONE 3: Contatti === */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-heading)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-700)' }}>
                Contatti
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <Field label="Codice Fiscale" field="codiceFiscale" placeholder="RSSMRA80A01C352E" />
                <Field label="Cellulare" field="cellulare" placeholder="+39 333 1234567" />
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <Field label="Email" field="email" placeholder="mario.rossi@email.com" type="email" />
              </div>
            </div>

            {/* === SEZIONE 4: Tipo Socio === */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-heading)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-700)' }}>
                Tipo di Adesione
              </h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {/* Ordinario */}
                <button type="button" onClick={() => setForm(f => ({ ...f, tipoSocio: 'ordinario' }))}
                  style={{
                    flex: '1 1 260px', padding: '1.25rem', borderRadius: 'var(--radius-lg)',
                    border: form.tipoSocio === 'ordinario' ? '2px solid var(--gold-500)' : '2px solid var(--neutral-700)',
                    background: form.tipoSocio === 'ordinario' ? 'rgba(232,169,26,0.08)' : 'var(--neutral-900)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: form.tipoSocio === 'ordinario' ? '2px solid var(--gold-500)' : '2px solid var(--neutral-600)',
                      background: form.tipoSocio === 'ordinario' ? 'var(--gold-500)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {form.tipoSocio === 'ordinario' && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--color-heading)', fontSize: '0.95rem' }}>SOCIO ORDINARIO</span>
                  </div>
                  <div style={{ color: 'var(--gold-500)', fontSize: '0.88rem', fontWeight: 600, paddingLeft: '1.6rem' }}>
                    Quota annuale €20
                  </div>
                </button>

                {/* Sostenitore */}
                <button type="button" onClick={() => setForm(f => ({ ...f, tipoSocio: 'sostenitore' }))}
                  style={{
                    flex: '1 1 260px', padding: '1.25rem', borderRadius: 'var(--radius-lg)',
                    border: form.tipoSocio === 'sostenitore' ? '2px solid var(--gold-500)' : '2px solid var(--neutral-700)',
                    background: form.tipoSocio === 'sostenitore' ? 'rgba(232,169,26,0.08)' : 'var(--neutral-900)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: form.tipoSocio === 'sostenitore' ? '2px solid var(--gold-500)' : '2px solid var(--neutral-600)',
                      background: form.tipoSocio === 'sostenitore' ? 'var(--gold-500)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {form.tipoSocio === 'sostenitore' && <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--color-heading)', fontSize: '0.95rem' }}>SOCIO SOSTENITORE</span>
                  </div>
                  <div style={{ color: 'var(--gold-500)', fontSize: '0.88rem', fontWeight: 600, paddingLeft: '1.6rem' }}>
                    Quota annuale €20 + contributo volontario
                  </div>
                  {form.tipoSocio === 'sostenitore' && (
                    <div style={{ marginTop: '0.75rem', paddingLeft: '1.6rem' }}>
                      <label style={{ ...labelStyle, marginBottom: '0.25rem' }}>Contributo aggiuntivo (€)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.quotaSostenitore}
                        onChange={e => setForm(f => ({ ...f, quotaSostenitore: e.target.value }))}
                        placeholder="es. 10"
                        style={{ ...inputStyle, width: '120px' }}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* === SEZIONE 5: Dichiarazioni e Consensi === */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-heading)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-700)' }}>
                Dichiarazioni e Consensi
              </h3>

              <div style={{
                background: 'var(--neutral-900)', borderRadius: 'var(--radius-md)',
                padding: '1rem', marginBottom: '1rem',
                fontSize: '0.8rem', color: 'var(--neutral-400)', lineHeight: 1.7,
              }}>
                Presa visione dello Statuto dell&apos;Associazione Pro Loco di Gasperina APS, accettato integralmente in ogni sua parte e tenuto conto, in particolare, delle finalità dell&apos;Associazione (art. 2) nella volontà di voler contribuire attivamente alla loro realizzazione, chiede di aderire all&apos;Associazione.
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <input
                  id="iscr-statuto" type="checkbox" checked={form.statuto}
                  onChange={set('statuto')}
                  style={{ marginTop: '3px', accentColor: 'var(--gold-500)', flexShrink: 0 }}
                />
                <label htmlFor="iscr-statuto" style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', lineHeight: 1.6 }}>
                  Dichiaro di aver preso visione e di accettare integralmente lo Statuto dell&apos;Associazione Pro Loco di Gasperina APS *
                </label>
              </div>
              {errors.statuto && <p style={errStyle}>{errors.statuto}</p>}

              <div style={{
                background: 'var(--neutral-900)', borderRadius: 'var(--radius-md)',
                padding: '1rem', marginTop: '1rem', marginBottom: '1rem',
                fontSize: '0.72rem', color: 'var(--neutral-600)', lineHeight: 1.7,
              }}>
                <strong style={{ color: 'var(--neutral-400)' }}>Informativa ex art. 13 D. Lgs 30.06.2003 n. 196</strong><br />
                I dati personali raccolti con il presente modulo verranno trattati per esclusive finalità associative, gestionali e statistiche.
                L&apos;acquisizione dei dati personali è presupposto per lo svolgimento dei rapporti cui l&apos;acquisizione è finalizzata.
                I dati potranno essere comunicati esclusivamente per motivi associativi alle altre Pro Loco aderenti UNPLI, ed alle strutture organizzative UNPLI.
                Il trattamento sarà svolto manualmente e mediante strumenti elettronici e previa adozione delle misure minime e idonee di sicurezza.
                Titolare del trattamento dei dati e responsabile è il Presidente della Pro Loco di Gasperina APS.
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <input
                  id="iscr-privacy" type="checkbox" checked={form.privacy}
                  onChange={set('privacy')}
                  style={{ marginTop: '3px', accentColor: 'var(--gold-500)', flexShrink: 0 }}
                />
                <label htmlFor="iscr-privacy" style={{ fontSize: '0.82rem', color: 'var(--neutral-400)', lineHeight: 1.6 }}>
                  Acconsento al trattamento dei dati personali raccolti per le attività statutarie della Pro Loco di Gasperina e dell&apos;UNPLI (D. Lgs 196/2003 e GDPR UE 2016/679) *
                </label>
              </div>
              {errors.privacy && <p style={errStyle}>{errors.privacy}</p>}
            </div>

            {/* Note validità */}
            <div style={{
              background: 'rgba(232,169,26,0.08)', border: '1px solid rgba(232,169,26,0.2)',
              borderRadius: 'var(--radius-md)', padding: '1rem',
              fontSize: '0.8rem', color: 'var(--gold-400)', lineHeight: 1.7,
            }}>
              L&apos;iscrizione si intende effettiva al momento della comunicazione dell&apos;accettazione da parte del Consiglio Direttivo.
              L&apos;iscrizione, nonché la tessera UNPLI, è valida fino al 31 dicembre {new Date().getFullYear()}: il rinnovo per l&apos;anno successivo avverrà senza ulteriori formalità mediante la corresponsione della quota annuale stabilita dall&apos;Associazione.
            </div>

            {/* Error */}
            {apiError && (
              <div style={{ padding: '0.75rem', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid #f87171', borderRadius: 'var(--radius-md)', color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>
                {apiError}
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1, padding: '0.85rem', fontSize: '0.95rem' }}
              id="membership-submit"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
              {loading ? 'Invio in corso...' : 'Invia Richiesta di Iscrizione'}
            </button>

            <p style={{ fontSize: '0.72rem', color: 'var(--neutral-600)', textAlign: 'center', lineHeight: 1.5 }}>
              Associazione Pro Loco di Gasperina APS — Sede legale in Gasperina (CZ), via Raffaele Milano, SNC<br />
              C.F. 99330790793 · Contatti: 3279783232 oppure prolocogasperina@gmail.com
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
