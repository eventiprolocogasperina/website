'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, Camera, Share2 } from 'lucide-react';


export default function ContattiPage() {
  const [form, setForm] = useState({ nome: '', email: '', oggetto: '', messaggio: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nome && form.email && form.messaggio) setSent(true);
  };

  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      <section className="section">
        <div className="section-inner" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="label">Scrivici</p>
            <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
            <h1 style={{ fontWeight: 300 }}>
              <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>Contattaci</em>
            </h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
            {/* Info col */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 400, marginBottom: '1.5rem' }}>
                Siamo a tua disposizione
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                {[
                  { icon: MapPin, title: 'Sede', text: 'Piazza Roma, Gasperina (CZ)\nCalabria, Italia' },
                  { icon: Mail, title: 'Email', text: 'info@prolocogasperina.it' },
                  { icon: Phone, title: 'Telefono', text: '+39 000 000 0000' },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(27,75,170,0.15)', border: '1px solid rgba(27,75,170,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} style={{ color: 'var(--blue-500)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{title}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--neutral-200)', whiteSpace: 'pre-line' }}>{text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {[{ icon: Camera, href: '#' }, { icon: Share2, href: '#' }].map(({ icon: Icon, href }, i) => (
                  <a key={i} href={href} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-full)', color: 'var(--neutral-400)', transition: 'all 0.2s' }}>
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Form col */}
            {sent ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', textAlign: 'center' }}>
                <CheckCircle size={48} style={{ color: '#4ade80', marginBottom: '1rem' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-heading)', marginBottom: '0.5rem' }}>Messaggio inviato!</h3>
                <p style={{ color: 'var(--neutral-400)', fontSize: '0.9rem' }}>Ti risponderemo al più presto.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" htmlFor="ct-nome">Nome</label>
                    <input id="ct-nome" className="form-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required placeholder="Mario" />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="ct-email">Email</label>
                    <input id="ct-email" type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="mario@example.com" />
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="ct-oggetto">Oggetto</label>
                  <input id="ct-oggetto" className="form-input" value={form.oggetto} onChange={e => setForm(f => ({ ...f, oggetto: e.target.value }))} placeholder="Come possiamo aiutarti?" />
                </div>
                <div>
                  <label className="form-label" htmlFor="ct-msg">Messaggio</label>
                  <textarea id="ct-msg" className="form-input" value={form.messaggio} onChange={e => setForm(f => ({ ...f, messaggio: e.target.value }))} required placeholder="Scrivi il tuo messaggio..." rows={5} style={{ resize: 'vertical' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} id="contact-submit">
                  <Send size={15} /> Invia messaggio
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
