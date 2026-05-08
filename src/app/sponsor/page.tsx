import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Phone, Star, Megaphone, Video, Image as ImageIcon, Shirt, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Diventa Sponsor | Pro Loco Gasperina APS',
  description: 'Sostieni la Pro Loco Gasperina APS e porta il tuo brand al cuore della comunità calabrese. Scopri le opportunità di sponsorizzazione per il 2026.',
};

const benefits = [
  {
    icon: Megaphone,
    title: 'Visibilità sui Social',
    desc: 'Post, storie e contenuti dedicati su Instagram e Facebook. Il tuo brand raggiunge la community della Pro Loco prima, durante e dopo ogni evento.',
  },
  {
    icon: ImageIcon,
    title: 'Locandine Ufficiali',
    desc: 'Il tuo logo sulle locandine degli eventi, diffuse capillarmente su tutto il territorio nei punti di maggiore passaggio.',
  },
  {
    icon: Video,
    title: 'Contenuti Video',
    desc: 'Non solo belle foto: progettiamo contenuti visivi e video pensati per raccontare il tuo brand, coinvolgere il pubblico e generare interazioni reali.',
  },
  {
    icon: MapPin,
    title: 'Cartellonistica',
    desc: 'Spazi di grande impatto visivo durante gli eventi, con cartellonistica e supporti ben posizionati che garantiscono massima visibilità e riconoscibilità.',
  },
  {
    icon: Shirt,
    title: 'Indumenti dello Staff',
    desc: 'Il tuo logo sugli indumenti dello staff: presenza continua e riconoscibile per tutta la durata dell\'evento.',
  },
  {
    icon: Star,
    title: 'Presenza diretta',
    desc: 'Stand e spazi dedicati durante gli eventi per un contatto diretto con il pubblico: degustazioni, attivazioni e promozione del tuo prodotto o servizio.',
  },
];

const tiers = [
  {
    name: 'Bronze',
    color: '#cd7f32',
    highlight: false,
    perks: [
      'Logo su locandine ufficiali',
      '1 storia social (Instagram) tematizzata per evento',
      '1 post social come partner',
      'Menzione durante l\'evento',
    ],
  },
  {
    name: 'Silver',
    color: '#aaaaaa',
    highlight: false,
    perks: [
      'Tutti i benefit Bronze',
      '2 storie social tematizzate (Instagram e Facebook)',
      'Tag e menzioni nei contenuti social',
    ],
  },
  {
    name: 'Gold',
    color: '#E8A91A',
    highlight: true,
    perks: [
      'Tutti i benefit Silver',
      '1 post dedicato esclusivo',
      'Logo in posizione evidenziata',
      'Banner/roll-up visibile durante l\'evento',
      'Possibilità di stand/promozione diretta',
      'Inserimento nei contenuti video principali',
    ],
  },
  {
    name: 'Platinum',
    color: '#1B4BAA',
    highlight: false,
    perks: [
      'Tutti i benefit Gold',
      'Main Sponsor ufficiale',
      'Logo in massima evidenza su tutto il materiale',
      'Naming evento (es. "Evento presented by …")',
      '2+ contenuti dedicati (post e reel)',
      'Presenza premium (stand + attivazioni)',
      'Integrazione del brand nell\'esperienza',
    ],
  },
];

export default function SponsorPage() {
  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '6rem 1.5rem 5rem', background: 'linear-gradient(135deg, #0e2a6e 0%, #1B4BAA 50%, #0e2a6e 100%)' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(ellipse at 60% 40%, rgba(232,169,26,0.12) 0%, transparent 60%)',
        }} />
        <div style={{ position: 'relative', maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
          <p className="label" style={{ color: 'var(--gold-400)' }}>Partner & Sponsor</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          <h1 style={{ fontWeight: 300, color: '#ffffff', marginBottom: '1.25rem' }}>
            Cresciamo{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>insieme</em>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, maxWidth: '620px', margin: '0 auto 2rem' }}>
            Sostenere la Pro Loco Gasperina significa entrare a far parte di un progetto che
            valorizza il territorio, coinvolge la comunità e genera visibilità concreta durante tutto
            l&apos;anno.
          </p>
          <a href="#contattaci" className="btn btn-gold">Parliamo →</a>
        </div>
      </div>

      {/* What we offer */}
      <section className="section">
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="label">Il valore della partnership</p>
            <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
            <h2>Cosa possiamo <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>offrirti</em></h2>
            <p style={{ fontSize: '1rem', color: 'var(--neutral-400)', maxWidth: '560px', margin: '1rem auto 0', lineHeight: 1.7 }}>
              Attraverso un calendario ricco di eventi e iniziative, offriamo alle aziende partner
              opportunità reali di promozione e presenza costante sul territorio.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {benefits.map(b => (
              <div key={b.title} className="card" style={{ padding: '1.75rem' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)',
                  background: 'rgba(27,75,170,0.15)', border: '1px solid rgba(27,75,170,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem',
                }}>
                  <b.icon size={20} style={{ color: 'var(--blue-500)' }} />
                </div>
                <h4 style={{ color: 'var(--color-heading)', marginBottom: '0.5rem' }}>{b.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.7 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="section" style={{ background: 'var(--neutral-900)' }}>
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="label">Livelli di partnership</p>
            <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
            <h2>Scegli il tuo <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>livello</em></h2>
            <p style={{ fontSize: '1rem', color: 'var(--neutral-400)', maxWidth: '520px', margin: '1rem auto 0', lineHeight: 1.7 }}>
              Ogni realtà è diversa: per questo offriamo la possibilità di costruire insieme
              soluzioni personalizzate, in linea con i tuoi obiettivi di comunicazione.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {tiers.map(tier => (
              <div
                key={tier.name}
                className="card"
                style={{
                  padding: '1.75rem',
                  border: tier.highlight ? `1px solid ${tier.color}` : undefined,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {tier.highlight && (
                  <div style={{
                    position: 'absolute', top: '0.75rem', right: '0.75rem',
                    background: 'var(--gold-500)', color: 'var(--neutral-950)',
                    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
                    padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)',
                    textTransform: 'uppercase',
                  }}>Più scelto</div>
                )}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: tier.color, marginBottom: '0.75rem',
                  boxShadow: `0 0 12px ${tier.color}88`,
                }} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 500, color: tier.color, marginBottom: '1.25rem' }}>
                  {tier.name}
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {tier.perks.map(perk => (
                    <li key={perk} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--neutral-400)' }}>
                      <span style={{ color: tier.color, fontSize: '0.9rem', flexShrink: 0, marginTop: '1px' }}>✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--neutral-400)' }}>
            Per contributi inferiori a €250, il sostegno viene considerato come contributo liberale, non soggetto a fatturazione,
            e rappresenta comunque un importante gesto di supporto alle attività della Pro Loco e al territorio.
          </p>
        </div>
      </section>

      {/* Vision */}
      <section className="section">
        <div className="section-inner" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <p className="label">La nostra visione</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          <h2 style={{ marginBottom: '1.5rem' }}>
            Più comunità, più partecipazione,{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>più valore</em>
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--neutral-400)', lineHeight: 1.8, marginBottom: '1rem' }}>
            La Pro Loco Gasperina guarda al 2026 con l&apos;obiettivo di rafforzare il legame tra
            territorio, comunità e innovazione, attraverso un programma di eventi capaci di
            valorizzare l&apos;identità locale e generare nuove opportunità di crescita.
          </p>
          <p style={{ fontSize: '1.05rem', color: 'var(--neutral-400)', lineHeight: 1.8 }}>
            Vogliamo costruire un calendario che non sia solo una successione di appuntamenti,
            ma un vero e proprio percorso esperienziale, in cui tradizioni, cultura, enogastronomia
            e intrattenimento si incontrano per raccontare il nostro territorio in modo autentico e contemporaneo.
          </p>
        </div>
      </section>

      {/* CTA Contact */}
      <section id="contattaci" className="section" style={{ background: 'linear-gradient(135deg, #0e2a6e, #1B4BAA)' }}>
        <div className="section-inner" style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <p className="label" style={{ color: 'var(--gold-400)' }}>Iniziamo a collaborare</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          <h2 style={{ color: '#ffffff', marginBottom: '1.25rem' }}>
            Contattaci per un{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>preventivo</em>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, marginBottom: '2.5rem', fontSize: '1rem' }}>
            Raccontaci la tua realtà e costruiamo insieme una proposta su misura.
            Ogni partnership è unica, proprio come ogni evento che organizziamo.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="mailto:prolocogasperina@gmail.com?subject=Richiesta%20Sponsorizzazione%202026"
              className="btn btn-gold"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Mail size={16} /> prolocogasperina@gmail.com
            </a>
            <a
              href="tel:+393279783232"
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
            >
              <Phone size={16} /> +39 327 978 3232
            </a>
          </div>
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
            Pro Loco Gasperina APS · Via Raffaele Milano SNC, 88060 Gasperina (CZ) · P.IVA 03923590792
          </div>
        </div>
      </section>
    </div>
  );
}
