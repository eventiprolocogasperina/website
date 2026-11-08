import type { Metadata } from 'next';
import { PageHero, V3Page } from '@/components/site/ui';

export const metadata: Metadata = {
  title: 'Diventa Sponsor | Pro Loco Gasperina APS',
  description: 'Sostieni la Pro Loco Gasperina APS e porta il tuo brand al cuore della comunità calabrese. Scopri le opportunità di sponsorizzazione.',
};

const benefits = [
  { title: 'Visibilità sui social', desc: 'Post, storie e contenuti dedicati su Instagram e Facebook. Il tuo brand raggiunge la community della Pro Loco prima, durante e dopo ogni evento.' },
  { title: 'Locandine ufficiali', desc: 'Il tuo logo sulle locandine degli eventi, diffuse capillarmente su tutto il territorio nei punti di maggiore passaggio.' },
  { title: 'Contenuti video', desc: 'Non solo belle foto: progettiamo contenuti visivi e video pensati per raccontare il tuo brand, coinvolgere il pubblico e generare interazioni reali.' },
  { title: 'Cartellonistica', desc: 'Spazi di grande impatto visivo durante gli eventi, con cartellonistica e supporti ben posizionati che garantiscono massima visibilità e riconoscibilità.' },
  { title: 'Indumenti dello staff', desc: "Il tuo logo sugli indumenti dello staff: presenza continua e riconoscibile per tutta la durata dell'evento." },
  { title: 'Presenza diretta', desc: 'Stand e spazi dedicati durante gli eventi per un contatto diretto con il pubblico: degustazioni, attivazioni e promozione del tuo prodotto o servizio.' },
];

const tiers = [
  { name: 'Bronze', highlight: false, perks: ['Logo su locandine ufficiali', '1 storia social (Instagram) tematizzata per evento', '1 post social come partner', "Menzione durante l'evento"] },
  { name: 'Silver', highlight: false, perks: ['Tutti i benefit Bronze', '2 storie social tematizzate (Instagram e Facebook)', 'Tag e menzioni nei contenuti social'] },
  { name: 'Gold', highlight: true, perks: ['Tutti i benefit Silver', '1 post dedicato esclusivo', 'Logo in posizione evidenziata', "Banner/roll-up visibile durante l'evento", 'Possibilità di stand/promozione diretta', 'Inserimento nei contenuti video principali'] },
  { name: 'Platinum', highlight: false, perks: ['Tutti i benefit Gold', 'Main Sponsor ufficiale', 'Logo in massima evidenza su tutto il materiale', 'Naming evento (es. "Evento presented by …")', '2+ contenuti dedicati (post e reel)', 'Presenza premium (stand + attivazioni)', "Integrazione del brand nell'esperienza"] },
];

export default function SponsorPage() {
  return (
    <V3Page>
      <PageHero
        eyebrow="Partner & sponsor"
        title="Cresciamo"
        accent="insieme."
        lede="Sostenere la Pro Loco Gasperina significa entrare a far parte di un progetto che valorizza il territorio, coinvolge la comunità e genera visibilità concreta durante tutto l'anno."
      >
        <div className="actions" style={{ marginTop: 26 }}>
          <a className="vbtn vbtn-gold" href="#contattaci">Richiedi un preventivo</a>
        </div>
      </PageHero>

      <section className="panel p-cream">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Il valore della partnership</span>
            <h2 className="h2">Cosa possiamo offrirti.</h2>
            <p className="lede">Un calendario ricco di eventi e iniziative offre alle aziende partner opportunità reali di promozione e presenza costante sul territorio.</p>
          </div>
        </div>
        <div className="grid g3">
          {benefits.map((b) => (
            <div key={b.title} className="vcard">
              <h3 className="h3">{b.title}</h3>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-bluexl">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Livelli di partnership</span>
            <h2 className="h2">Scegli il tuo livello.</h2>
            <p className="lede">Ogni realtà è diversa: costruiamo insieme soluzioni personalizzate, in linea con i tuoi obiettivi di comunicazione.</p>
          </div>
        </div>
        <div className="grid g4" style={{ alignItems: 'start' }}>
          {tiers.map((t) => (
            <div key={t.name} className={t.highlight ? 'tier top' : 'tier'}>
              {t.highlight && <span className="badge">Più scelto</span>}
              <h3 className="h3">{t.name}</h3>
              <ul>
                {t.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 26, fontSize: 14.5 }}>
          Per contributi inferiori a 250 €, il sostegno è considerato contributo liberale, non soggetto a fatturazione, e rappresenta comunque un importante gesto di supporto alle attività della Pro Loco e al territorio.
        </p>
      </section>

      <section className="panel p-gold">
        <div className="split" style={{ alignItems: 'start' }}>
          <div>
            <span className="eyebrow">La nostra visione</span>
            <h2 className="h2">Più comunità, più partecipazione, più valore.</h2>
          </div>
          <div>
            <p className="lede" style={{ marginTop: 0 }}>Rafforzare il legame tra territorio, comunità e innovazione, con un programma di eventi capace di valorizzare l&apos;identità locale e generare nuove opportunità di crescita.</p>
            <p>Un calendario che non sia solo una successione di appuntamenti, ma un percorso esperienziale in cui tradizioni, cultura, enogastronomia e intrattenimento raccontano il territorio in modo autentico e contemporaneo.</p>
          </div>
        </div>
      </section>

      <section id="contattaci" className="panel p-blued">
        <div className="split">
          <div>
            <span className="eyebrow">Iniziamo a collaborare</span>
            <h2 className="h2">Contattaci per un preventivo.</h2>
            <p className="lede" style={{ marginTop: 18 }}>Raccontaci la tua realtà e costruiamo insieme una proposta su misura. Ogni partnership è unica, proprio come ogni evento che organizziamo.</p>
          </div>
          <div className="rows">
            <div className="row" style={{ gridTemplateColumns: '1fr' }}>
              <div><h3 className="h3">Email</h3><p><a href="mailto:prolocogasperina@gmail.com?subject=Richiesta%20sponsorizzazione">prolocogasperina@gmail.com</a></p></div>
            </div>
            <div className="row" style={{ gridTemplateColumns: '1fr' }}>
              <div><h3 className="h3">Telefono</h3><p><a href="tel:+393505757501">+39 350 575 7501</a></p></div>
            </div>
            <p className="muted" style={{ fontSize: 13.5 }}>Pro Loco Gasperina APS · Via Raffaele Milano SNC, 88060 Gasperina (CZ) · P.IVA 03923590792</p>
          </div>
        </div>
      </section>
    </V3Page>
  );
}
