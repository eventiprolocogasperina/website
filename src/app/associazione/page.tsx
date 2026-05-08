import type { Metadata } from 'next';
import Image from 'next/image';
import { teamMembers } from '@/lib/data/members';
import { Download, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chi Siamo',
  description: 'Scopri la storia, la missione e il team della Pro Loco Gasperina APS, associazione di promozione sociale fondata nel 1995.',
};

export default function AssociazionePagePage() {
  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: '380px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src="/img/IMG1.jpg" alt="Gasperina" fill style={{ objectFit: 'cover', objectPosition: 'center 60%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,12,18,0.5), rgba(10,12,18,0.9))' }} />
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <p className="label">Dal 1995</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          <h1 style={{ fontWeight: 300 }}>Chi <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>siamo</em></h1>
        </div>
      </div>

      {/* Mission */}
      <section id="missione" className="section">
        <div className="section-inner" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <p className="label">La nostra missione</p>
          <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
          <h2 style={{ marginBottom: '1.5rem' }}>Promuovere, <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>valorizzare</em>, connettere</h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--neutral-400)', lineHeight: 1.8, marginBottom: '1rem' }}>
            La Pro Loco Gasperina APS è un'associazione di promozione sociale nata nel 1995.
            Con passione e dedizione promuoviamo la cultura, le tradizioni e il turismo del nostro borgo,
            organizzando eventi, gestendo progetti culturali e rafforzando il senso di comunità.
          </p>
          <p style={{ fontSize: '1.05rem', color: 'var(--neutral-400)', lineHeight: 1.8 }}>
            Siamo un'associazione apartitica, senza scopo di lucro, guidata dalla passione per Gasperina
            e dal desiderio di tramandare l'identità calabrese alle future generazioni.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="section" style={{ background: 'var(--neutral-900)' }}>
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="label">I nostri valori</p>
            <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
            <h2>Cosa ci <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>guida</em></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {[
              { emoji: '🏛️', title: 'Cultura', desc: 'Preservare e diffondere il patrimonio culturale e le tradizioni di Gasperina.' },
              { emoji: '🤝', title: 'Comunità', desc: 'Creare momenti di incontro e rafforzare il senso di appartenenza.' },
              { emoji: '🌿', title: 'Territorio', desc: 'Valorizzare e proteggere le risorse naturali e paesaggistiche locali.' },
              { emoji: '✨', title: 'Inclusione', desc: 'Essere un punto di riferimento per tutti i cittadini, nessuno escluso.' },
            ].map(v => (
              <div key={v.title} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{v.emoji}</div>
                <h4 style={{ color: 'var(--color-heading)', marginBottom: '0.5rem' }}>{v.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.6 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section">
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="label">Le persone</p>
            <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
            <h2>Il nostro <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>direttivo</em></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {teamMembers.map(m => (
              <div key={m.nome} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--blue-700), var(--blue-900))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem',
                  fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#ffffff',
                }}>
                  {m.nome.split(' ').map(n => n[0]).join('')}
                </div>
                <h4 style={{ color: 'var(--color-heading)', marginBottom: '0.25rem' }}>{m.nome}</h4>
                <p className="label">{m.ruolo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Documents */}
      <section className="section" style={{ background: 'var(--neutral-900)' }}>
        <div className="section-inner" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <p className="label">Documenti</p>
            <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
            <h2>Atti e <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>documenti</em></h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { name: 'Statuto Associativo', date: 'In caricamento', type: 'PDF' },
              { name: 'Atto Costitutivo', date: '1995', type: 'PDF' },
              { name: 'Regolamento Interno', date: 'In caricamento', type: 'PDF' },
            ].map(doc => (
              <div key={doc.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <FileText size={18} style={{ color: 'var(--blue-500)' }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-heading)', fontWeight: 500 }}>{doc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{doc.date}</div>
                  </div>
                </div>
                <button className="btn btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem', gap: '0.35rem' }}>
                  <Download size={13} /> {doc.type}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
