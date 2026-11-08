'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHero, V3Page } from '@/components/site/ui';

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

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
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

  const year = new Date().getFullYear();
  const err = (k: string) => (errors[k] ? <span className="err" role="alert">{errors[k]}</span> : null);
  const tipo = (value: FormData['tipoSocio'], title: string, price: string) => (
    <label className={form.tipoSocio === value ? 'sel' : undefined}>
      <span>
        <input type="radio" name="tipoSocio" checked={form.tipoSocio === value} onChange={() => setForm(f => ({ ...f, tipoSocio: value }))} />
        <b>{title}</b>
      </span>
      <span className="muted" style={{ marginTop: 6 }}>{price}</span>
    </label>
  );

  return (
    <V3Page>
      <PageHero
        eyebrow={`Anno ${year}`}
        title="Richiesta di"
        accent="iscrizione."
        lede="Modulo di richiesta di iscrizione all'Associazione Pro Loco di Gasperina APS. L'iscrizione è effettiva al momento dell'accettazione da parte del Consiglio Direttivo."
      />

      <section className="panel p-white">
        <div className="split" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'start' }}>
          {submitted ? (
            <div className="vcard" role="status">
              <h2 className="h2" style={{ fontSize: 'clamp(34px,3.4vw,48px)' }}>Richiesta inviata.</h2>
              <p style={{ marginTop: 16 }}>
                Grazie <strong>{form.nome} {form.cognome}</strong>! Riceverai una email di conferma all&apos;indirizzo <strong>{form.email}</strong>.
              </p>
              <p>L&apos;iscrizione si intende effettiva al momento della comunicazione dell&apos;accettazione da parte del Consiglio Direttivo, che ti contatterà quanto prima con i dettagli per il pagamento della quota associativa e il numero tessera.</p>
            </div>
          ) : (
            <form className="form" onSubmit={handleSubmit} noValidate>
              <fieldset>
                <legend>Dati anagrafici</legend>
                <label>Nome *<input value={form.nome} onChange={handleChange('nome')} autoComplete="given-name" />{err("nome")}</label>
                <label>Cognome *<input value={form.cognome} onChange={handleChange('cognome')} autoComplete="family-name" />{err("cognome")}</label>
                <label>Luogo di nascita *<input value={form.luogoNascita} onChange={handleChange('luogoNascita')} />{err("luogoNascita")}</label>
                <label>Provincia<input value={form.provNascita} onChange={handleChange('provNascita')} placeholder="CZ" /></label>
                <label>Data di nascita *<input type="date" value={form.dataNascita} onChange={handleChange('dataNascita')} autoComplete="bday" />{err("dataNascita")}</label>
              </fieldset>

              <fieldset>
                <legend>Residenza</legend>
                <label>Comune *<input value={form.residenza} onChange={handleChange('residenza')} autoComplete="address-level2" />{err("residenza")}</label>
                <label>Provincia<input value={form.provResidenza} onChange={handleChange('provResidenza')} placeholder="CZ" /></label>
                <label>Via / indirizzo *<input value={form.indirizzo} onChange={handleChange('indirizzo')} autoComplete="address-line1" />{err("indirizzo")}</label>
                <label>N. civico<input value={form.civico} onChange={handleChange('civico')} /></label>
                <label>CAP<input value={form.cap} onChange={handleChange('cap')} autoComplete="postal-code" inputMode="numeric" /></label>
              </fieldset>

              <fieldset>
                <legend>Contatti</legend>
                <label>Codice fiscale *<input value={form.codiceFiscale} onChange={handleChange('codiceFiscale')} />{err("codiceFiscale")}</label>
                <label>Cellulare *<input type="tel" value={form.cellulare} onChange={handleChange('cellulare')} autoComplete="tel" />{err("cellulare")}</label>
                <label className="full">Email *<input type="email" value={form.email} onChange={handleChange('email')} autoComplete="email" />{err("email")}</label>
              </fieldset>

              <fieldset>
                <legend>Tipo di adesione</legend>
                <div className="choice full">
                  {tipo('ordinario', 'Socio ordinario', 'Quota annuale 20 €')}
                  {tipo('sostenitore', 'Socio sostenitore', 'Quota annuale 20 € + contributo volontario')}
                </div>
                {form.tipoSocio === 'sostenitore' && (
                  <label className="full" style={{ maxWidth: 240 }}>Contributo aggiuntivo (€)
                    <input type="number" min="1" value={form.quotaSostenitore} onChange={e => setForm(f => ({ ...f, quotaSostenitore: e.target.value }))} placeholder="es. 10" />
                  </label>
                )}
              </fieldset>

              <fieldset>
                <legend>Dichiarazioni e consensi</legend>
                <p className="muted full" style={{ fontSize: 14.5, margin: 0 }}>
                  Presa visione dello Statuto dell&apos;Associazione Pro Loco di Gasperina APS, accettato integralmente in ogni sua parte e tenuto conto, in particolare, delle finalità dell&apos;Associazione (art. 2) nella volontà di voler contribuire attivamente alla loro realizzazione, chiede di aderire all&apos;Associazione.
                </p>
                <label className="check full">
                  <input type="checkbox" checked={form.statuto} onChange={handleChange('statuto')} />
                  <span>Dichiaro di aver preso visione e di accettare integralmente lo Statuto dell&apos;Associazione Pro Loco di Gasperina APS *</span>
                </label>
                <span className="err full" role="alert" hidden={!errors.statuto}>{errors.statuto}</span>
                <p className="muted full" style={{ fontSize: 13.5, margin: 0 }}>
                  <strong>Informativa ex art. 13 D. Lgs 30.06.2003 n. 196.</strong> I dati personali raccolti con il presente modulo verranno trattati per esclusive finalità associative, gestionali e statistiche. L&apos;acquisizione dei dati personali è presupposto per lo svolgimento dei rapporti cui l&apos;acquisizione è finalizzata. I dati potranno essere comunicati esclusivamente per motivi associativi alle altre Pro Loco aderenti UNPLI, ed alle strutture organizzative UNPLI. Il trattamento sarà svolto manualmente e mediante strumenti elettronici e previa adozione delle misure minime e idonee di sicurezza. Titolare del trattamento dei dati e responsabile è il Presidente della Pro Loco di Gasperina APS.
                </p>
                <label className="check full">
                  <input type="checkbox" checked={form.privacy} onChange={handleChange('privacy')} />
                  <span>Acconsento al trattamento dei dati personali raccolti per le attività statutarie della Pro Loco di Gasperina e dell&apos;UNPLI (D. Lgs 196/2003 e GDPR UE 2016/679) *</span>
                </label>
                <span className="err full" role="alert" hidden={!errors.privacy}>{errors.privacy}</span>
              </fieldset>

              {apiError && <p className="err full" role="alert">{apiError}</p>}
              <div className="full actions" style={{ marginTop: 8 }}>
                <button className="vbtn vbtn-gold" type="submit" disabled={loading} style={{ cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Invio in corso…' : 'Invia richiesta di iscrizione'}
                </button>
              </div>
              <p className="muted full" style={{ fontSize: 13.5, margin: 0 }}>
                Associazione Pro Loco di Gasperina APS · Sede legale in Gasperina (CZ), via Raffaele Milano, SNC · C.F. 99330790793 · Contatti: 3505757501 oppure prolocogasperina@gmail.com
              </p>
            </form>
          )}

          <aside style={{ display: 'grid', gap: 18, position: 'sticky', top: 24 }}>
            <div className="vcard" style={{ background: 'var(--blue-xl)', borderColor: 'var(--blue-xl)' }}>
              <h3 className="h3">Come funziona</h3>
              <ol style={{ paddingLeft: 20, margin: '12px 0 0', lineHeight: 1.8 }}>
                <li>Compili e invii il modulo.</li>
                <li>Il Consiglio Direttivo valuta la richiesta.</li>
                <li>Ricevi la conferma e la tessera UNPLI.</li>
              </ol>
            </div>
            <div className="vcard">
              <h3 className="h3">Validità</h3>
              <p>L&apos;iscrizione, nonché la tessera UNPLI, è valida fino al 31 dicembre {year}: il rinnovo per l&apos;anno successivo avviene senza ulteriori formalità con la quota annuale stabilita dall&apos;Associazione.</p>
            </div>
            <div className="vcard">
              <h3 className="h3">Informativa</h3>
              <p style={{ fontSize: 14.5 }}>I dati sono trattati per finalità associative e possono essere comunicati solo alle Pro Loco aderenti UNPLI e alle sue strutture.</p>
              <Link href="/privacy" style={{ fontWeight: 700, color: 'var(--blue)' }}>Informativa completa →</Link>
            </div>
          </aside>
        </div>
      </section>
    </V3Page>
  );
}
