import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, FileText, Mail, Phone, MapPin, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Informativa sulla Privacy | Pro Loco Gasperina APS',
  description: 'Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) da parte dell\'Associazione di Promozione Sociale Pro Loco Gasperina.',
};

export default function PrivacyPage() {
  return (
    <div style={{ paddingTop: '6rem', paddingBottom: '6rem', background: 'var(--neutral-950)', minHeight: '100vh', color: 'var(--neutral-300)' }}>
      <div style={{ maxWidth: '920px', margin: '0 auto', padding: '0 1.5rem' }}>
        
        {/* Back Link */}
        <Link 
          href="/" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            fontSize: '0.88rem', 
            color: 'var(--neutral-400)', 
            marginBottom: '2rem',
            textDecoration: 'none',
            transition: 'color 0.2s'
          }}
          className="hover-gold"
        >
          <ArrowLeft size={16} /> Torna alla Home
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.3)', padding: '0.35rem 1rem', borderRadius: '999px', color: 'var(--gold-400)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            <Shield size={14} /> Regolamento UE 2016/679 (GDPR)
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 600, color: '#ffffff', marginBottom: '1rem' }}>
            Informativa sul Trattamento dei <span style={{ color: 'var(--gold-400)', fontStyle: 'italic' }}>Dati Personali</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--neutral-400)', maxWidth: '680px', margin: '0 auto', lineHeight: 1.7 }}>
            La presente informativa descrive con trasparenza le finalità, le modalità e i diritti relativi al trattamento dei dati personali forniti dagli utenti attraverso questo sito web.
          </p>
          <div style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', marginTop: '0.75rem' }}>
            Ultimo aggiornamento: Ottobre 2026
          </div>
        </div>

        {/* Highlight Card: Finalità di Contatto Esclusiva */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.15) 0%, rgba(217, 119, 6, 0.12) 100%)', 
          border: '1px solid rgba(217, 119, 6, 0.25)', 
          borderRadius: '1.25rem', 
          padding: '1.75rem', 
          marginBottom: '3rem',
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'flex-start'
        }}>
          <div style={{ background: 'var(--gold-500)', color: '#000', padding: '0.6rem', borderRadius: '0.75rem', flexShrink: 0 }}>
            <Lock size={22} />
          </div>
          <div>
            <h3 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              Principio di Trasparenza e Scopo Esclusivo
            </h3>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.65, margin: 0, color: 'var(--neutral-300)' }}>
              I dati personali conferiti all&apos;<strong>Associazione Pro Loco Gasperina APS</strong> (es. nome, cognome, email, recapito telefonico) vengono utilizzati <strong>esclusivamente a scopo organizzativo e di contatto diretto relativamente agli eventi a cui ti sei prenotato o iscritto</strong> (es. invio biglietti con QR code, ricevute, variazioni di programma, spostamento data o allerte di servizio). <strong>Non cediamo mai i tuoi dati a terzi né li utilizziamo per profilazione pubblicitaria o marketing commerciale.</strong>
            </p>
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', lineHeight: 1.75, fontSize: '0.95rem' }}>
          
          {/* 1. Titolare del Trattamento */}
          <section style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--gold-400)' }}>1.</span> Titolare del Trattamento dei Dati
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Il Titolare del trattamento dei dati è:
            </p>
            <div style={{ background: 'var(--neutral-950)', border: '1px solid var(--neutral-800)', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.05rem' }}>
                Associazione di Promozione Sociale Pro Loco Gasperina APS
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neutral-400)', fontSize: '0.88rem' }}>
                <MapPin size={15} style={{ color: 'var(--gold-500)', flexShrink: 0 }} /> 
                <span>Via Raffaele Milano SNC, 88060 Gasperina (CZ), Italia</span>
              </div>
              <div style={{ color: 'var(--neutral-400)', fontSize: '0.88rem' }}>
                <strong>C.F.:</strong> 99330790793 · <strong>P.IVA:</strong> 03923590792
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neutral-400)', fontSize: '0.88rem' }}>
                <Mail size={15} style={{ color: 'var(--gold-500)', flexShrink: 0 }} />
                <span>Email di contatto per la privacy: <a href="mailto:prolocogasperina@gmail.com" style={{ color: 'var(--gold-400)', textDecoration: 'underline' }}>prolocogasperina@gmail.com</a></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neutral-400)', fontSize: '0.88rem' }}>
                <Phone size={15} style={{ color: 'var(--gold-500)', flexShrink: 0 }} />
                <span>Telefono di riferimento: +39 350 575 7501</span>
              </div>
            </div>
          </section>

          {/* 2. Dati Raccolti */}
          <section style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--gold-400)' }}>2.</span> Quali Dati Personali Raccogliamo
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Raccogliamo unicamente i dati necessari per gestire la tua partecipazione agli eventi promossi dalla Pro Loco:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { title: 'Dati di identificazione e contatto', desc: 'Nome, cognome, indirizzo email e recapito telefonico inseriti al momento della prenotazione o iscrizione.' },
                { title: 'Dati relativi alla prenotazione', desc: 'Numero e tipologia di biglietti/attività selezionati, data e turno dell\'evento, nominativi di eventuali accompagnatori se richiesti, note organizzative (es. intolleranze o segnalazioni logistiche).' },
                { title: 'Dati di fatturazione/ricevuta', desc: 'Dati strettamente necessari alla contabilità fiscale e alla tenuta dei registri dell\'Associazione di Promozione Sociale (ETS).' },
                { title: 'Nessun dato di pagamento bancario memorizzato', desc: 'Le transazioni con carta di credito, prepagata o PagoPA avvengono interamente su server esterni protetti del fornitore di servizi di pagamento (Nexi S.p.A.). La Pro Loco non entra in possesso né memorizza i numeri della tua carta di credito o le credenziali bancarie.' }
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <CheckCircle size={18} style={{ color: 'var(--gold-500)', flexShrink: 0, marginTop: '3px' }} />
                  <div>
                    <strong style={{ color: '#ffffff' }}>{item.title}:</strong> {item.desc}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* 3. Finalità e Basi Giuridiche */}
          <section style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--gold-400)' }}>3.</span> Finalità del Trattamento e Base Giuridica
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              Il trattamento dei dati personali avviene esclusivamente per le seguenti finalità:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ borderLeft: '3px solid var(--gold-500)', paddingLeft: '1rem' }}>
                <strong style={{ color: '#ffffff' }}>a) Esecuzione del rapporto contrattuale e organizzativo (Art. 6, par. 1, lett. b GDPR):</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--neutral-400)', fontSize: '0.9rem' }}>
                  Gestione dell&apos;ordine, emissione e recapito dei biglietti digitali con codice QR, convalida dell&apos;ingresso tramite scanner ai varchi dell&apos;evento e assistenza al partecipante.
                </p>
              </div>
              <div style={{ borderLeft: '3px solid var(--gold-500)', paddingLeft: '1rem' }}>
                <strong style={{ color: '#ffffff' }}>b) Comunicazioni di servizio e contatto diretto relativo all&apos;evento (Art. 6, par. 1, lett. b ed f GDPR):</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--neutral-400)', fontSize: '0.9rem' }}>
                  Invio di avvisi urgenti, aggiornamenti su orari e parcheggi, spostamenti di data per maltempo o comunicazioni strettamente pertinenti alla prenotazione effettuata.
                </p>
              </div>
              <div style={{ borderLeft: '3px solid var(--gold-500)', paddingLeft: '1rem' }}>
                <strong style={{ color: '#ffffff' }}>c) Obblighi di legge, contabili e fiscali (Art. 6, par. 1, lett. c GDPR):</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--neutral-400)', fontSize: '0.9rem' }}>
                  Adempimento delle disposizioni previste dalla normativa civilistica e tributaria applicabile agli Enti del Terzo Settore (D.Lgs. 117/2017).
                </p>
              </div>
              <div style={{ borderLeft: '3px solid var(--gold-500)', paddingLeft: '1rem' }}>
                <strong style={{ color: '#ffffff' }}>d) Tutela della sicurezza e prevenzione abusi (Art. 6, par. 1, lett. f GDPR):</strong>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--neutral-400)', fontSize: '0.9rem' }}>
                  Prevenzione di frodi, doppie convalide, biglietti contraffatti o gestione di blocchi motivati (blacklist) a tutela dell&apos;ordine e della sicurezza dei partecipanti e degli organizzatori.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Modalità di Trattamento e Sicurezza */}
          <section style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--gold-400)' }}>4.</span> Modalità di Trattamento e Sicurezza dei Dati
            </h2>
            <p>
              I dati personali sono trattati con strumenti automatizzati e cartacei, secondo logiche strettamente correlate alle finalità sopra indicate, garantendo la riservatezza e l&apos;integrità dei dati stessi.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              Adottiamo misure tecniche e organizzative adeguate (crittografia SSL/TLS per tutte le comunicazioni web, credenziali di accesso sicure e differenziate per il personale addetto, database protetti ospitati su infrastrutture cloud europee conformi al GDPR) per proteggere i dati da accessi non autorizzati, divulgazione, modifica o distruzione.
            </p>
          </section>

          {/* 5. Periodo di Conservazione */}
          <section style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--gold-400)' }}>5.</span> Periodo di Conservazione dei Dati
            </h2>
            <p>
              I dati personali raccolti per la gestione delle prenotazioni e per i contatti relativi all&apos;evento vengono conservati per il tempo strettamente necessario all&apos;erogazione del servizio e all&apos;espletamento delle attività connesse all&apos;evento.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              I dati necessari ai fini contabili, amministrativi e fiscali sono conservati per il periodo prescritto dalla legge (generalmente 10 anni, ai sensi dell&apos;art. 2220 del Codice Civile).
            </p>
          </section>

          {/* 6. Destinatari e Comunicazione dei Dati */}
          <section style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--gold-400)' }}>6.</span> Comunicazione dei Dati a Terzi
            </h2>
            <p>
              I dati personali non saranno in alcun caso diffusi o ceduti a terzi per scopi commerciali. I dati potranno essere comunicati unicamente a:
            </p>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li>Membri autorizzati del consiglio direttivo e collaboratori/volontari incaricati dell&apos;Associazione, formalmente istruiti al rispetto della privacy;</li>
              <li>Fornitori di servizi tecnici e informatici necessari al funzionamento del sito e all&apos;invio di email transazionali (nominati se necessario Responsabili del Trattamento);</li>
              <li>Istituti bancari e circuiti di pagamento telematico (Nexi S.p.A.) per la sola gestione economica delle transazioni;</li>
              <li>Autorità competenti o Forze dell&apos;Ordine in adempimento di specifici obblighi di legge o per la tutela dei diritti dell&apos;Associazione in sede giudiziaria.</li>
            </ul>
          </section>

          {/* 7. Diritti dell'Interessato */}
          <section style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--gold-400)' }}>7.</span> I Tuoi Diritti (Artt. 15-22 GDPR)
            </h2>
            <p style={{ marginBottom: '1rem' }}>
              In conformità con il Regolamento UE 2016/679, hai il diritto in qualunque momento di:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {[
                { title: 'Accesso (Art. 15)', text: 'Ottenere la conferma dell\'esistenza dei tuoi dati e conoscerne l\'origine e il trattamento.' },
                { title: 'Rettifica (Art. 16)', text: 'Richiedere l\'aggiornamento o la correzione di dati inesatti o incompleti.' },
                { title: 'Cancellazione (Art. 17)', text: 'Chiedere la cancellazione dei tuoi dati («diritto all\'oblio»), fatti salvi gli obblighi legali di conservazione fiscale.' },
                { title: 'Limitazione (Art. 18)', text: 'Richiedere la limitazione del trattamento dei dati personali nei casi previsti.' },
                { title: 'Portabilità (Art. 20)', text: 'Ricevere i tuoi dati in un formato strutturato e leggibile da dispositivo automatico.' },
                { title: 'Opposizione (Art. 21)', text: 'Opporti in qualsiasi momento per motivi legittimi al trattamento dei tuoi dati personali.' },
              ].map((r, i) => (
                <div key={i} style={{ background: 'var(--neutral-950)', border: '1px solid var(--neutral-800)', borderRadius: '0.75rem', padding: '1rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--gold-400)', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', lineHeight: 1.5 }}>
                    {r.text}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', background: 'rgba(217, 119, 6, 0.08)', border: '1px solid rgba(217, 119, 6, 0.2)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} style={{ color: 'var(--gold-500)' }} /> Come Esercitare i Propri Diritti
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-300)' }}>
                Per esercitare uno qualsiasi dei tuoi diritti, è sufficiente inviare una comunicazione scritta a mezzo email all&apos;indirizzo: <a href="mailto:prolocogasperina@gmail.com" style={{ color: 'var(--gold-400)', textDecoration: 'underline', fontWeight: 600 }}>prolocogasperina@gmail.com</a>. Risponderemo tempestivamente e comunque entro 30 giorni dalla richiesta.
              </p>
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--neutral-400)' }}>
                Resta inoltre fermo il tuo diritto di proporre reclamo all&apos;Autorità Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neutral-300)', textDecoration: 'underline' }}>www.garanteprivacy.it</a>).
              </p>
            </div>
          </section>

          {/* 8. Cookie Policy Sintetica */}
          <section style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-800)', borderRadius: '1rem', padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--gold-400)' }}>8.</span> Cookie e Strumenti di Tracciamento
            </h2>
            <p>
              Questo sito web utilizza <strong>esclusivamente cookie tecnici e di sessione</strong> indispensabili al corretto funzionamento della navigazione (ad es. per mantenere il contenuto del carrello ordini e consentire l&apos;accesso alle aree operative e amministrative).
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Non utilizziamo cookie di profilazione pubblicitaria</strong> né strumenti di tracciamento invasivi o cessione di dati comportamentali a terze parti a scopo di monetizzazione.
            </p>
          </section>

        </div>

        {/* Footer Contact box */}
        <div style={{ textAlign: 'center', marginTop: '4rem', padding: '2rem', background: 'var(--neutral-900)', borderRadius: '1.25rem', border: '1px solid var(--neutral-800)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#ffffff', marginBottom: '0.5rem' }}>
            Hai domande o dubbi sulla gestione dei tuoi dati?
          </h3>
          <p style={{ color: 'var(--neutral-400)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
            Il nostro team è sempre a disposizione per fornirti chiarimenti e supporto in totale trasparenza.
          </p>
          <a 
            href="mailto:prolocogasperina@gmail.com" 
            className="btn btn-gold"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Mail size={16} /> Scrivici a prolocogasperina@gmail.com
          </a>
        </div>

      </div>
    </div>
  );
}
