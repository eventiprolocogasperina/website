import Image from 'next/image';
import Link from 'next/link';
import { projects } from '@/lib/data/projects';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Progetti',
  description: 'Scopri tutti i progetti della Pro Loco Gasperina APS per valorizzare cultura, turismo e ambiente nel territorio di Gasperina.',
};

const statusMap: Record<string, { label: string; class: string }> = {
  completato:  { label: 'Completato', class: 'badge-green' },
  'in corso':  { label: 'In corso', class: 'badge-blue' },
  pianificato: { label: 'Pianificato', class: 'badge-gold' },
};

export default function ProgettiPage() {
  return (
    <div style={{ paddingTop: '5rem', background: 'var(--neutral-950)', minHeight: '100vh' }}>
      <section className="section">
        <div className="section-inner">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="label">Cosa facciamo</p>
            <div className="divider-gold" style={{ margin: '0.75rem auto' }} />
            <h1 style={{ fontWeight: 300 }}>I nostri <em style={{ fontStyle: 'italic', color: 'var(--gold-400)' }}>progetti</em></h1>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {projects.map(project => {
              const status = statusMap[project.status];
              return (
                <article key={project.id} className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                    <Image src={project.image} alt={project.title} fill style={{ objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,18,0.8) 0%, transparent 60%)' }} />
                    <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
                      <span className={`badge ${status.class}`}>{status.label}</span>
                    </div>
                  </div>
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginBottom: '0.4rem' }}>{project.year} · <span style={{ textTransform: 'capitalize' }}>{project.category}</span></div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--color-heading)', marginBottom: '0.75rem' }}>{project.title}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--neutral-400)', lineHeight: 1.6, marginBottom: '1rem' }}>{project.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {project.partners.map(p => (
                        <span key={p} style={{ fontSize: '0.7rem', color: 'var(--neutral-400)', background: 'var(--neutral-700)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
