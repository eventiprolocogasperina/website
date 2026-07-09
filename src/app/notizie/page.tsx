import { getAllNews } from '@/lib/data/news';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Calendar } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notizie - Pro Loco Gasperina',
  description: 'Resta aggiornato su tutte le novità, le iniziative e gli avvisi della Pro Loco Gasperina.',
};

export default async function NotiziePage() {
  const news = await getAllNews();

  return (
    <div style={{ paddingTop: '6rem', minHeight: '100vh', background: 'var(--neutral-950)' }}>
      <div className="section" style={{ paddingBottom: '2rem' }}>
        <div className="section-inner">
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 3rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 500, color: 'var(--color-heading)', marginBottom: '1rem', lineHeight: 1.1 }}>
              Notizie & Avvisi
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--neutral-400)', lineHeight: 1.6 }}>
              Resta aggiornato su tutte le novità, le iniziative e le comunicazioni ufficiali della Pro Loco.
            </p>
          </div>

          {news.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--neutral-500)' }}>
              Nessuna notizia pubblicata al momento.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
              {news.map(n => (
                <Link key={n.id} href={`/notizie/${n.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="card hover-lift" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                    {n.coverImage ? (
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                        <Image src={n.coverImage} alt={n.title} fill style={{ objectFit: 'cover' }} />
                        {n.featured && (
                          <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--gold-500)', color: 'black', fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-full)' }}>
                            In Evidenza
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: 'var(--neutral-800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--neutral-600)', opacity: 0.5 }}>Pro Loco</div>
                        {n.featured && (
                          <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--gold-500)', color: 'black', fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.8rem', borderRadius: 'var(--radius-full)' }}>
                            In Evidenza
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--neutral-500)', marginBottom: '0.75rem' }}>
                        <Calendar size={14} />
                        {new Date(n.publishedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--color-heading)', marginBottom: '1rem', lineHeight: 1.4 }}>
                        {n.title}
                      </h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--neutral-400)', lineHeight: 1.6, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {n.content.substring(0, 150)}...
                      </p>
                      
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold-400)', fontSize: '0.85rem', fontWeight: 500 }}>
                        Leggi tutto <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3) !important;
        }
      `}} />
    </div>
  );
}
