import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scopri Gasperina',
  description: 'Scopri la storia, la cultura, le tradizioni e i luoghi di interesse di Gasperina, splendido borgo della Calabria centrale.',
};

const pois = [
  { nome: 'Santuario della Madonna dei Termini', cat: 'religioso', desc: 'Luogo di grande devozione popolare, legato alla leggenda della statua della Madonna ritrovata in mare e trasportata su un carro trainato da buoi.' },
  { nome: 'Belvedere sul Golfo di Squillace', cat: 'panorama', desc: 'Vista mozzafiato sul Mar Ionio: nelle giornate più limpide lo sguardo arriva fino a Punta Stilo e Capo Rizzuto.' },
  { nome: 'Centro Storico – Le Rughe', cat: 'cultura', desc: 'Strette viuzze, archi in pietra e scalinate intrecciate. I "vicoli" nel dialetto locale rivelano antichi palazzi nobiliari e chiese storiche.' },
  { nome: 'Parco Naturale delle Serre', cat: 'natura', desc: 'A pochi chilometri da Gasperina, boschi di faggio e castagno tra le Serre Calabresi, già frequentate dai monaci certosini.' },
];

const foods = [
  { nome: 'Fichi di Calabria', desc: 'I fichi secchi del territorio, prodotto DOP di eccellenza.', emoji: '🫐' },
  { nome: 'Nduja di Spilinga', desc: 'La celebre pasta di salame piccante, re della gastronomia calabrese.', emoji: '🌶️' },
  { nome: 'Cipolla Rossa di Tropea', desc: 'La DOP più famosa di Calabria, dolce e versatile.', emoji: '🧅' },
  { nome: 'Vino Cirò', desc: 'Il vino calabrese per eccellenza, prodotto sulle coste ioniche.', emoji: '🍷' },
];

export default function ScopriGasperinaPage() {
  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ position: 'relative', height: '520px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src="/img/IMG_3.jpg" alt="Gasperina vista aerea" fill style={{ objectFit: 'cover', objectPosition: 'center 40%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,18,0.4) 0%, rgba(10,12,18,0.9) 100%)' }} />
        <div style={{ position: 'relative', textAlign: 'center', padding: '0 1.5rem' }}>
          <p className="label">450 m s.l.m. · Calabria Centrale</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          <h1 style={{ fontWeight: 300, color: 'var(--color-heading)' }}>
            Scopri <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>Gasperina</em>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', maxWidth: '640px', margin: '1rem auto 0', lineHeight: 1.7 }}>
            Arroccata a circa 500 metri sul livello del mare, Gasperina è una vera terrazza naturale affacciata sul Golfo di Squillace — un piccolo gioiello della Calabria ionica capace di sorprendere con la sua autenticità e il suo fascino senza tempo.
          </p>
        </div>
      </div>

      {/* Storia */}
      <section id="storia" className="section">
        <div className="section-inner" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '4rem', alignItems: 'center' }}>
          <div>
            <p className="label">Le radici</p>
            <div className="divider-gold" />
            <h2>Storia e <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>identità</em></h2>
            <p style={{ color: 'var(--neutral-400)', lineHeight: 1.8, margin: '1.25rem 0', fontSize: '0.95rem' }}>
              Le origini di Gasperina risalgono almeno all&apos;XI secolo, in epoca medievale, ma è probabile che il territorio fosse già abitato tra il VII e l&apos;VIII secolo, quando le popolazioni costiere cercavano rifugio sulle alture per sfuggire alle incursioni saracene. Nel corso dei secoli, il borgo è stato influenzato da diverse dominazioni, tra cui quella normanna e quella sveva, che hanno contribuito a modellarne l&apos;identità culturale e architettonica.
            </p>
            <p style={{ color: 'var(--neutral-400)', lineHeight: 1.8, fontSize: '0.95rem' }}>
              Un ruolo importante nella storia locale è stato svolto dai monaci certosini, legati alla vicina Certosa di Serra San Bruno, che hanno favorito lo sviluppo agricolo e spirituale della zona. Il centro storico conserva ancora oggi un impianto urbanistico tipico, fatto di strette viuzze, archi in pietra e scalinate — le cosiddette <em style={{ color: 'var(--gold-400)' }}>&ldquo;rughe&rdquo;</em> — che si intrecciano tra loro, creando un&apos;atmosfera intima e raccolta.
            </p>
          </div>
          <div style={{ position: 'relative', height: '400px', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            <Image src="/img/IMG1.jpg" alt="Centro storico di Gasperina" fill style={{ objectFit: 'cover' }} />
          </div>
        </div>
      </section>

      {/* Gastronomia */}
      <section id="gastronomia" className="section" style={{ background: 'var(--neutral-900)' }}>
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="label">Sapori autentici</p>
            <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
            <h2>La <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>gastronomia</em> calabrese</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {foods.map(food => (
              <div key={food.nome} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{food.emoji}</div>
                <h4 style={{ color: 'var(--color-heading)', marginBottom: '0.5rem' }}>{food.nome}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.6 }}>{food.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Punti di interesse */}
      <section id="mappa" className="section">
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="label">Da visitare</p>
            <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
            <h2>Luoghi da <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>scoprire</em></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            {pois.map((poi, i) => (
              <div key={poi.nome} className="card" style={{ padding: '1.5rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-full)',
                  background: 'rgba(27,75,170,0.2)', border: '1px solid rgba(27,75,170,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '0.85rem',
                  fontFamily: 'var(--font-display)', color: 'var(--blue-500)', fontWeight: 600,
                }}>
                  {i + 1}
                </div>
                <span className="badge badge-blue" style={{ marginBottom: '0.6rem', textTransform: 'capitalize' }}>{poi.cat}</span>
                <h4 style={{ color: 'var(--color-heading)', marginBottom: '0.5rem', marginTop: '0.4rem' }}>{poi.nome}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.6 }}>{poi.desc}</p>
              </div>
            ))}
          </div>

          {/* Static map placeholder — Leaflet would go here with 'use client' */}
          <div style={{
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            height: '400px',
            background: 'var(--neutral-800)',
            border: '1px solid var(--neutral-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '0.75rem',
            color: 'var(--neutral-400)',
            position: 'relative',
          }}>
            <Image src="/img/IMG_2.jpg" alt="Mappa area di Gasperina" fill style={{ objectFit: 'cover', opacity: 0.2 }} />
            <div style={{ position: 'relative', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-heading)' }}>
                Gasperina, Calabria
              </p>
              <p style={{ fontSize: '0.85rem' }}>39.0333° N, 16.5167° E</p>
              <a
                href="https://maps.google.com/?q=Gasperina,Calabria,Italy"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ marginTop: '1rem', display: 'inline-flex' }}
              >
                Apri in Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
