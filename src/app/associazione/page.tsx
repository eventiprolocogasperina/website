import type { Metadata } from 'next';
import Link from 'next/link';
import { teamMembers } from '@/lib/data/members';
import { PageHero, V3Page } from '@/components/site/ui';

export const metadata: Metadata = {
  title: 'Chi Siamo',
  description: 'Scopri la storia, la missione e il team della Pro Loco Gasperina APS, associazione di promozione sociale fondata nel 1995.',
};

const values = [
  { title: 'Cultura', desc: 'Preservare e diffondere il patrimonio culturale e le tradizioni di Gasperina.' },
  { title: 'Comunità', desc: 'Creare momenti di incontro e rafforzare il senso di appartenenza.' },
  { title: 'Territorio', desc: 'Valorizzare e proteggere le risorse naturali e paesaggistiche locali.' },
  { title: 'Inclusione', desc: 'Essere un punto di riferimento per tutti i cittadini, nessuno escluso.' },
];

export default function AssociazionePage() {
  return (
    <V3Page>
      <PageHero
        eyebrow="Dal 1995"
        title="Chi"
        accent="siamo."
        lede="La Pro Loco Gasperina APS è un'associazione di promozione sociale nata nel 1995 per la cultura, le tradizioni e il turismo del nostro borgo."
        image="/img/assaggia-2026/A%26P_M-186.webp"
        imageAlt="I volontari della Pro Loco Gasperina"
      />

      <section id="missione" className="panel p-cream">
        <div className="split" style={{ alignItems: 'start' }}>
          <div>
            <span className="eyebrow">La nostra missione</span>
            <h2 className="h2">Promuovere, valorizzare, connettere.</h2>
          </div>
          <div>
            <p className="lede" style={{ margin: '0 0 16px' }}>
              Con passione e dedizione promuoviamo la cultura, le tradizioni e il turismo del nostro borgo, organizzando eventi, gestendo progetti culturali e rafforzando il senso di comunità.
            </p>
            <p>Siamo un&apos;associazione apartitica, senza scopo di lucro, guidata dalla passione per Gasperina e dal desiderio di tramandare l&apos;identità calabrese alle future generazioni.</p>
          </div>
        </div>
      </section>

      <section className="panel p-gold">
        <div className="panel-head">
          <div>
            <span className="eyebrow">I nostri valori</span>
            <h2 className="h2">Cosa ci guida.</h2>
          </div>
        </div>
        <div className="grid g4">
          {values.map((v) => (
            <div key={v.title} className="vcard">
              <h3 className="h3">{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-white">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Le persone</span>
            <h2 className="h2">Il consiglio direttivo.</h2>
          </div>
        </div>
        <div className="grid g4" style={{ rowGap: 40 }}>
          {teamMembers.map((m) => (
            <div key={m.nome} className="person">
              <div className="avatar" aria-hidden>{m.nome.split(' ').map((n) => n[0]).join('')}</div>
              <b>{m.nome}</b>
              <span>{m.ruolo || ' '}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-blued">
        <div className="split">
          <div>
            <span className="eyebrow">Unisciti a noi</span>
            <h2 className="h2">Diventa socio.</h2>
            <p className="lede" style={{ marginTop: 18 }}>
              Entra a far parte della nostra comunità: come socio partecipi alla vita dell&apos;associazione e ai nostri eventi, e contribuisci alla valorizzazione del territorio gasperinese.
            </p>
            <Link className="vbtn vbtn-gold" href="/iscriviti">Compila il modulo di iscrizione</Link>
          </div>
          <div className="grid g2">
            <div className="tier top">
              <h3 className="h3">Socio ordinario</h3>
              <p style={{ margin: '10px 0 0' }}>Partecipi alla vita dell&apos;associazione con la quota annuale.</p>
            </div>
            <div className="tier top">
              <h3 className="h3">Socio sostenitore</h3>
              <p style={{ margin: '10px 0 0' }}>Sostieni la Pro Loco con un contributo volontario in più.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-bluexl">
        <div className="grid g3">
          <Link className="vcard" href="/trasparenza"><h3 className="h3">Trasparenza →</h3><p>Quali dati trattiamo, perché e per quanto tempo.</p></Link>
          <Link className="vcard" href="/sponsor"><h3 className="h3">Sponsor →</h3><p>Sostieni gli eventi del borgo con la tua azienda.</p></Link>
          <Link className="vcard" href="/contatti"><h3 className="h3">Contatti →</h3><p>Via Raffaele Milano SNC, Gasperina (CZ).</p></Link>
        </div>
      </section>
    </V3Page>
  );
}
