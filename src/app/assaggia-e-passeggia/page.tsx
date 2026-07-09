import Link from 'next/link';
import type { Metadata } from 'next';
import { Wine, MapPin, Music, Utensils, ArrowRight, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { getPageContent, DEFAULT_ASSAGGIA_CONTENT, type AssaggiaEPasseggiaContent } from '@/lib/data/pages';

export const metadata: Metadata = {
  title: 'Assaggia & Passeggia - Pro Loco Gasperina',
  description: 'Un viaggio enogastronomico tra le vie del borgo di Gasperina. Scopri i sapori autentici della nostra terra.',
};

export const revalidate = 0; // Ensures the page fetches fresh data from CMS

export default async function AssaggiaPasseggiaPage() {
  const data = await getPageContent<AssaggiaEPasseggiaContent>('assaggia-e-passeggia', DEFAULT_ASSAGGIA_CONTENT);

  return (
    <div style={{ background: '#F9F3E4', minHeight: '100vh', color: '#1a1a1a' }}>
      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        padding: '3rem 2rem 8rem', 
        background: '#283983', // Fallback color
        color: 'white',
        overflow: 'hidden',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh'
      }}>
        {/* Background image (soft and opacized) */}
        {data.hero.bgImageUrl && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: `url('${data.hero.bgImageUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.25, // Soft opacity
            mixBlendMode: 'luminosity' // Blends with the dark blue background
          }} />
        )}
        
        {/* Overlay gradient for text readability */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(to bottom, rgba(40,57,131,0.6), rgba(40,57,131,1))'
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Pro Loco Logo at the top */}
          <div style={{ marginBottom: '-2rem', zIndex: 10, position: 'relative' }}>
            <img src="/img/logo_white_fg.png" alt="Pro Loco Gasperina" style={{ maxHeight: '110px', objectFit: 'contain', opacity: 0.95 }} />
          </div>

          {data.hero.logoUrl ? (
            <div style={{ marginBottom: '1.5rem', width: '100%', maxWidth: '700px' }}>
              {/* Using standard img for external arbitrary URLs from CMS to avoid next/image domain config errors */}
              <img src={data.hero.logoUrl} alt="Logo" style={{ width: '100%', height: 'auto', maxHeight: '480px', objectFit: 'contain' }} />
            </div>
          ) : (
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '5rem', fontWeight: 700, marginBottom: '1.5rem', lineHeight: 1, textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
              {data.hero.title}
            </h1>
          )}

          {data.hero.badge && (
            <div style={{ 
              display: 'inline-block', 
              padding: '0.5rem 1.5rem', 
              background: 'rgba(232, 192, 66, 0.15)', // Gold with opacity
              color: '#E8C042',
              borderRadius: '999px',
              fontSize: '0.9rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '2rem',
              border: '1px solid rgba(232, 192, 66, 0.3)'
            }}>
              {data.hero.badge}
            </div>
          )}

          <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.9)', marginBottom: '3rem', lineHeight: 1.6, maxWidth: '650px', margin: '0 auto 3rem', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            {data.hero.subtitle}
          </p>

          <Link href={data.hero.ctaLink} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            background: '#E8C042', color: '#283983', padding: '1.25rem 2.5rem', borderRadius: '999px',
            textDecoration: 'none', fontSize: '1.1rem', fontWeight: 700, transition: 'transform 0.2s',
            boxShadow: '0 10px 30px rgba(232, 192, 66, 0.4)'
          }}>
            {data.hero.ctaText} <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Il Concetto */}
      <section style={{ padding: '6rem 2rem', background: '#ffffff' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: '#283983', marginBottom: '1.5rem' }}>{data.story.title}</h2>
            <p style={{ color: '#555', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
              {data.story.paragraph1}
            </p>
            <p style={{ color: '#555', fontSize: '1.1rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {data.story.paragraph2}
            </p>
          </div>
          <div style={{ flex: '1 1 400px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: '#F9F3E4', height: '240px', borderRadius: '1rem', border: '1px solid #E8C042', overflow: 'hidden', position: 'relative' }}>
              {data.story.image1Url && <img src={data.story.image1Url} alt="Story 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ background: '#F9F3E4', height: '240px', borderRadius: '1rem', border: '1px solid #E8C042', marginTop: '2rem', overflow: 'hidden', position: 'relative' }}>
              {data.story.image2Url && <img src={data.story.image2Url} alt="Story 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          </div>
        </div>
      </section>

      {/* Il Menù / Le Tappe */}
      <section style={{ padding: '6rem 2rem', background: '#F9F3E4' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ color: '#E8C042', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem' }}>{data.menu.subtitle}</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: '#283983', marginTop: '0.5rem' }}>{data.menu.title}</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {data.tappe.map((item, index) => (
              <div key={index} style={{ 
                background: 'white', padding: '2rem', borderRadius: '1rem', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                display: 'flex', gap: '2rem', alignItems: 'flex-start'
              }}>
                <div style={{ 
                  background: '#283983', color: 'white', width: '50px', height: '50px', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: '1.5rem', flexShrink: 0
                }}>
                  {item.id}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.5rem', color: '#283983', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                  <p style={{ color: '#555', marginBottom: '1rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{item.description}</p>
                  {item.allergens && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertCircle size={14} /> <strong>Allergeni:</strong> {item.allergens}
                    </div>
                  )}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#F9F3E4', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.9rem', color: '#7a6040' }}>
                    <Wine size={16} /> <strong>In abbinamento:</strong> {item.wineName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info Pratiche */}
      <section style={{ padding: '6rem 2rem', background: 'white' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', color: '#283983', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Info color="#E8C042" /> Informazioni Utili
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#555', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}><CheckCircle2 size={20} color="#283983" style={{ flexShrink: 0, marginTop: '2px' }} /> <strong>Ritiro Kit:</strong> {data.logistics.ticketInfo}</li>
              <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}><CheckCircle2 size={20} color="#283983" style={{ flexShrink: 0, marginTop: '2px' }} /> <strong>Parcheggi:</strong> {data.logistics.parkingInfo}</li>
              <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}><CheckCircle2 size={20} color="#283983" style={{ flexShrink: 0, marginTop: '2px' }} /> <strong>Intolleranze:</strong> {data.logistics.disclaimer}</li>
            </ul>
          </div>
          <div style={{ background: '#283983', padding: '2.5rem', borderRadius: '1rem', color: 'white', textAlign: 'center' }}>
             <h3 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>{data.presale.title}</h3>
             <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>{data.presale.subtitle}</p>
             <div style={{ fontSize: '3.5rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: '#E8C042', marginBottom: '2rem' }}>
               {data.presale.priceInfo} <span style={{ fontSize: '1rem', color: 'white', fontWeight: 400 }}>/ persona</span>
             </div>
             <Link href={data.presale.ctaLink} style={{
                display: 'block', background: 'white', color: '#283983', padding: '1rem', borderRadius: '999px',
                textDecoration: 'none', fontWeight: 700, transition: 'background 0.2s'
              }}>
                {data.presale.ctaText}
              </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
