import { Metadata } from 'next';
import Link from 'next/link';
import { V3Page } from '@/components/site/ui';

export const metadata: Metadata = {
  title: 'Informativa sulla Privacy | Pro Loco Gasperina APS',
  description: "Informativa sul trattamento dei dati personali ai sensi del Regolamento UE 2016/679 (GDPR) da parte dell'Associazione di Promozione Sociale Pro Loco Gasperina.",
};

const EMAIL = 'prolocogasperina@gmail.com';

const collected = [
  { title: 'Dati di identificazione e contatto', desc: 'Nome, cognome, indirizzo email e recapito telefonico inseriti al momento della prenotazione o iscrizione.' },
  { title: 'Dati relativi alla prenotazione', desc: "Numero e tipologia di biglietti/attività selezionati, data e turno dell'evento, nominativi di eventuali accompagnatori se richiesti, note organizzative (es. intolleranze o segnalazioni logistiche)." },
  { title: 'Dati di fatturazione/ricevuta', desc: "Dati strettamente necessari alla contabilità fiscale e alla tenuta dei registri dell'Associazione di Promozione Sociale (ETS)." },
  { title: 'Nessun dato di pagamento bancario memorizzato', desc: 'Le transazioni con carta di credito, prepagata o PagoPA avvengono interamente su server esterni protetti del fornitore di servizi di pagamento (Nexi S.p.A.). La Pro Loco non entra in possesso né memorizza i numeri della tua carta di credito o le credenziali bancarie.' },
];

const purposes = [
  { title: "a) Esecuzione del rapporto contrattuale e organizzativo (Art. 6, par. 1, lett. b GDPR):", text: "Gestione dell'ordine, emissione e recapito dei biglietti digitali con codice QR, convalida dell'ingresso tramite scanner ai varchi dell'evento e assistenza al partecipante." },
  { title: "b) Comunicazioni di servizio e contatto diretto relativo all'evento (Art. 6, par. 1, lett. b ed f GDPR):", text: 'Invio di avvisi urgenti, aggiornamenti su orari e parcheggi, spostamenti di data per maltempo o comunicazioni strettamente pertinenti alla prenotazione effettuata.' },
  { title: 'c) Obblighi di legge, contabili e fiscali (Art. 6, par. 1, lett. c GDPR):', text: 'Adempimento delle disposizioni previste dalla normativa civilistica e tributaria applicabile agli Enti del Terzo Settore (D.Lgs. 117/2017).' },
  { title: 'd) Tutela della sicurezza e prevenzione abusi (Art. 6, par. 1, lett. f GDPR):', text: "Prevenzione di frodi, doppie convalide, biglietti contraffatti o gestione di blocchi motivati (blacklist) a tutela dell'ordine e della sicurezza dei partecipanti e degli organizzatori." },
];

const rights = [
  { title: 'Accesso (Art. 15)', text: "Ottenere la conferma dell'esistenza dei tuoi dati e conoscerne l'origine e il trattamento." },
  { title: 'Rettifica (Art. 16)', text: "Richiedere l'aggiornamento o la correzione di dati inesatti o incompleti." },
  { title: 'Cancellazione (Art. 17)', text: "Chiedere la cancellazione dei tuoi dati («diritto all'oblio»), fatti salvi gli obblighi legali di conservazione fiscale." },
  { title: 'Limitazione (Art. 18)', text: 'Richiedere la limitazione del trattamento dei dati personali nei casi previsti.' },
  { title: 'Portabilità (Art. 20)', text: 'Ricevere i tuoi dati in un formato strutturato e leggibile da dispositivo automatico.' },
  { title: 'Opposizione (Art. 21)', text: 'Opporti in qualsiasi momento per motivi legittimi al trattamento dei tuoi dati personali.' },
];

export default function PrivacyPage() {
  return (
    <V3Page>
      <section className="hero">
        <span className="eyebrow">Regolamento UE 2016/679 (GDPR)</span>
        <h1 className="h1" style={{ fontSize: 'clamp(42px,6vw,92px)' }}>
          Informativa sul trattamento <span>dei dati personali.</span>
        </h1>
        <p className="lede">La presente informativa descrive con trasparenza le finalità, le modalità e i diritti relativi al trattamento dei dati personali forniti dagli utenti attraverso questo sito web. Ultimo aggiornamento: ottobre 2026.</p>
      </section>

      <section className="panel p-white">
        <div className="split" style={{ gridTemplateColumns: '240px 1fr', alignItems: 'start', gap: 56 }}>
          <nav aria-label="Indice" style={{ position: 'sticky', top: 24, display: 'grid', gap: 10, fontWeight: 600, fontSize: 15 }}>
            <span className="eyebrow">Indice</span>
            <a href="#titolare">1. Titolare</a>
            <a href="#dati">2. Dati raccolti</a>
            <a href="#finalita">3. Finalità e base giuridica</a>
            <a href="#sicurezza">4. Sicurezza</a>
            <a href="#conservazione">5. Conservazione</a>
            <a href="#terzi">6. Comunicazione a terzi</a>
            <a href="#diritti">7. I tuoi diritti</a>
            <a href="#cookie">8. Cookie</a>
            <Link href="/trasparenza" style={{ color: 'var(--blue)' }}>Versione in breve →</Link>
          </nav>

          <article className="prose">
            <div className="callout">
              <strong>Principio di trasparenza e scopo esclusivo.</strong> I dati personali conferiti all&apos;<strong>Associazione Pro Loco Gasperina APS</strong> (es. nome, cognome, email, recapito telefonico) vengono utilizzati <strong>esclusivamente a scopo organizzativo e di contatto diretto relativamente agli eventi a cui ti sei prenotato o iscritto</strong> (es. invio biglietti con QR code, ricevute, variazioni di programma, spostamento data o allerte di servizio). <strong>Non cediamo mai i tuoi dati a terzi né li utilizziamo per profilazione pubblicitaria o marketing commerciale.</strong>
            </div>

            <h3 id="titolare">1. Titolare del trattamento dei dati</h3>
            <p>Il Titolare del trattamento dei dati è:</p>
            <p>
              <strong>Associazione di Promozione Sociale Pro Loco Gasperina APS</strong><br />
              Via Raffaele Milano SNC, 88060 Gasperina (CZ), Italia<br />
              C.F. 99330790793 · P.IVA 03923590792<br />
              Email di contatto per la privacy: <a href={`mailto:${EMAIL}`} style={{ textDecoration: 'underline' }}>{EMAIL}</a><br />
              Telefono di riferimento: +39 350 575 7501
            </p>

            <h3 id="dati">2. Quali dati personali raccogliamo</h3>
            <p>Raccogliamo unicamente i dati necessari per gestire la tua partecipazione agli eventi promossi dalla Pro Loco:</p>
            <ul>
              {collected.map((item) => (
                <li key={item.title}><strong>{item.title}:</strong> {item.desc}</li>
              ))}
            </ul>

            <h3 id="finalita">3. Finalità del trattamento e base giuridica</h3>
            <p>Il trattamento dei dati personali avviene esclusivamente per le seguenti finalità:</p>
            {purposes.map((p) => (
              <p key={p.title}><strong>{p.title}</strong><br />{p.text}</p>
            ))}

            <h3 id="sicurezza">4. Modalità di trattamento e sicurezza dei dati</h3>
            <p>I dati personali sono trattati con strumenti automatizzati e cartacei, secondo logiche strettamente correlate alle finalità sopra indicate, garantendo la riservatezza e l&apos;integrità dei dati stessi.</p>
            <p>Adottiamo misure tecniche e organizzative adeguate (crittografia SSL/TLS per tutte le comunicazioni web, credenziali di accesso sicure e differenziate per il personale addetto, database protetti ospitati su infrastrutture cloud europee conformi al GDPR) per proteggere i dati da accessi non autorizzati, divulgazione, modifica o distruzione.</p>

            <h3 id="conservazione">5. Periodo di conservazione dei dati</h3>
            <p>I dati personali raccolti per la gestione delle prenotazioni e per i contatti relativi all&apos;evento vengono conservati per il tempo strettamente necessario all&apos;erogazione del servizio e all&apos;espletamento delle attività connesse all&apos;evento.</p>
            <p>I dati necessari ai fini contabili, amministrativi e fiscali sono conservati per il periodo prescritto dalla legge (generalmente 10 anni, ai sensi dell&apos;art. 2220 del Codice Civile).</p>

            <h3 id="terzi">6. Comunicazione dei dati a terzi</h3>
            <p>I dati personali non saranno in alcun caso diffusi o ceduti a terzi per scopi commerciali. I dati potranno essere comunicati unicamente a:</p>
            <ul>
              <li>Membri autorizzati del consiglio direttivo e collaboratori/volontari incaricati dell&apos;Associazione, formalmente istruiti al rispetto della privacy;</li>
              <li>Fornitori di servizi tecnici e informatici necessari al funzionamento del sito e all&apos;invio di email transazionali (nominati se necessario Responsabili del Trattamento);</li>
              <li>Istituti bancari e circuiti di pagamento telematico (Nexi S.p.A.) per la sola gestione economica delle transazioni;</li>
              <li>Autorità competenti o Forze dell&apos;Ordine in adempimento di specifici obblighi di legge o per la tutela dei diritti dell&apos;Associazione in sede giudiziaria.</li>
            </ul>

            <h3 id="diritti">7. I tuoi diritti (artt. 15-22 GDPR)</h3>
            <p>In conformità con il Regolamento UE 2016/679, hai il diritto in qualunque momento di:</p>
            <div className="grid g2" style={{ margin: '16px 0 24px' }}>
              {rights.map((r) => (
                <div key={r.title} className="vcard" style={{ padding: 18 }}>
                  <strong style={{ color: 'var(--blue)' }}>{r.title}</strong>
                  <p style={{ margin: '6px 0 0', fontSize: 15 }}>{r.text}</p>
                </div>
              ))}
            </div>
            <div className="callout">
              <strong>Come esercitare i propri diritti</strong><br />
              Per esercitare uno qualsiasi dei tuoi diritti, è sufficiente inviare una comunicazione scritta a mezzo email all&apos;indirizzo: <a href={`mailto:${EMAIL}`} style={{ textDecoration: 'underline', fontWeight: 600 }}>{EMAIL}</a>, oppure usare il modulo nella pagina <Link href="/trasparenza#diritti" style={{ textDecoration: 'underline' }}>Trasparenza</Link>. Risponderemo tempestivamente e comunque entro 30 giorni dalla richiesta.
            </div>
            <p style={{ marginTop: 16, fontSize: 16 }}>Resta inoltre fermo il tuo diritto di proporre reclamo all&apos;Autorità Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>www.garanteprivacy.it</a>).</p>

            <h3 id="cookie">8. Cookie e strumenti di tracciamento</h3>
            <p>Questo sito web utilizza <strong>esclusivamente cookie tecnici e di sessione</strong> indispensabili al corretto funzionamento della navigazione (ad es. per mantenere il contenuto del carrello ordini e consentire l&apos;accesso alle aree operative e amministrative).</p>
            <p><strong>Non utilizziamo cookie di profilazione pubblicitaria</strong> né strumenti di tracciamento invasivi o cessione di dati comportamentali a terze parti a scopo di monetizzazione.</p>
            <p>In breve, con i tempi di conservazione, i fornitori e i cookie: <Link href="/trasparenza" style={{ textDecoration: 'underline' }}>Trasparenza sui dati</Link>.</p>
          </article>
        </div>
      </section>
    </V3Page>
  );
}
