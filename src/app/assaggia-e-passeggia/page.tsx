import Link from 'next/link';
import type { Metadata } from 'next';
import { Ticket as TicketIcon, Wine, ChefHat, MapPin, Map, CalendarDays, Clock, Info, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import FormattedText from '@/components/ui/FormattedText';
import SponsorsMarquee from '@/components/ui/SponsorsMarquee';
import HeroVideo from '@/components/ui/HeroVideo';
import { getPageContent, DEFAULT_ASSAGGIA_CONTENT, type AssaggiaEPasseggiaContent } from '@/lib/data/pages';

export const metadata: Metadata = {
  title: 'Assaggia & Passeggia - Pro Loco Gasperina',
  description: 'Un viaggio enogastronomico tra le vie del borgo di Gasperina. Scopri i sapori autentici della nostra terra.',
};

export const revalidate = 0; // Ensures the page fetches fresh data from CMS

// Helper for extracting YouTube ID
function getYoutubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default async function AssaggiaPasseggiaPage() {
  const data = await getPageContent<AssaggiaEPasseggiaContent>('assaggia-e-passeggia', DEFAULT_ASSAGGIA_CONTENT);

  return (
    <div style={{ background: '#F9F3E4', minHeight: '100vh', color: '#1a1a1a' }}>
      
      {/* Otter-Style Hero Section */}
      <section style={{ 
        padding: '8rem 2rem 4rem', 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Soft floating shapes in background could go here */}
        
        <div style={{ maxWidth: '900px', width: '100%', position: 'relative', zIndex: 10 }}>
          {data.hero.badge && (
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1.2rem', 
              background: '#283983', 
              color: 'white',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '2rem',
              boxShadow: '0 4px 15px rgba(40,57,131,0.15)'
            }}>
              <CalendarDays size={16} color="#E8C042" /> {data.hero.badge}
            </div>
          )}

          <div style={{ marginBottom: '2rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img src="/img/LogoAP_GA_nero.png" alt="Logo Assaggia & Passeggia" style={{ width: '100%', height: 'auto', maxWidth: '500px', objectFit: 'contain' }} />
          </div>


          <p style={{ 
            fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', 
            color: '#555', 
            lineHeight: 1.6, 
            maxWidth: '650px', 
            margin: '0 auto 3rem',
            fontWeight: 500
          }}>
            {data.hero.subtitle}
          </p>

          <Link href={data.hero.ctaLink} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            background: '#E8C042', color: '#283983', padding: '1.2rem 2.5rem', borderRadius: '999px',
            textDecoration: 'none', fontSize: '1.1rem', fontWeight: 800,
            boxShadow: '0 8px 25px rgba(232, 192, 66, 0.4)', transition: 'transform 0.2s',
          }}>
            {data.hero.ctaText} <ArrowRight size={20} />
          </Link>
        </div>

        {/* Large Rounded Image (Otter style hero image or Video) */}
        {(data.hero.heroVideoUrl || data.hero.bgImageUrl) && (
          <div style={{
            width: '100%',
            maxWidth: '1200px',
            height: '500px',
            margin: '4rem auto 0',
            borderRadius: '2rem',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            position: 'relative',
            background: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <HeroVideo 
              videoId={data.hero.heroVideoUrl ? getYoutubeId(data.hero.heroVideoUrl) : null} 
              bgImageUrl={data.hero.bgImageUrl} 
            />
          </div>
        )}
      </section>

      {/* Sponsors Marquee */}
      <section style={{ padding: '0 0 4rem 0' }}>
         <SponsorsMarquee />
      </section>

      {/* Bento Grid Concept */}
      <section style={{ padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Main Story Card */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '2rem', 
            padding: '3rem', 
            gridColumn: '1 / -1',
            boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <FormattedText as="h2" style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: '#283983', marginBottom: '1.5rem', lineHeight: 1.1 }} text={data.story.title} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <FormattedText as="p" style={{ color: '#555', fontSize: '1.15rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }} text={data.story.paragraph1} />
              <FormattedText as="p" style={{ color: '#555', fontSize: '1.15rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }} text={data.story.paragraph2} />
            </div>
          </div>

          {/* Image Cards (Bento style) */}
          {data.story.image1Url && (
            <div style={{ 
              background: '#E8C042', 
              borderRadius: '2rem', 
              height: '350px', 
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
              position: 'relative'
            }}>
               <img src={data.story.image1Url} alt="Story 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {data.story.image2Url && (
            <div style={{ 
              background: '#283983', 
              borderRadius: '2rem', 
              height: '350px', 
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
              position: 'relative'
            }}>
               <img src={data.story.image2Url} alt="Story 2" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
            </div>
          )}
        </div>
      </section>

      {/* Le Tappe (Bento Style Grid) */}
      <section style={{ padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '600px', margin: '0 auto 4rem' }}>
            <FormattedText as="span" style={{ display: 'inline-block', background: '#e0e7ff', color: '#283983', padding: '0.5rem 1rem', borderRadius: '999px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem', marginBottom: '1rem' }} text={data.menu.subtitle} />
            <FormattedText as="h2" style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', color: '#1a1a1a', lineHeight: 1.1 }} text={data.menu.title} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {data.tappe.map((item, index) => (
              <div key={index} style={{ 
                background: 'white', 
                padding: '2rem', 
                borderRadius: '2rem', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                display: 'flex', 
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  background: item.themeColor || '#283983', 
                  color: 'white', 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)', 
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  marginBottom: '1.5rem'
                }}>
                  {item.id}
                </div>
                
                <div style={{ flex: 1 }}>
                  <FormattedText as="h3" style={{ fontSize: '1.6rem', color: '#1a1a1a', marginBottom: '0.75rem', fontFamily: 'var(--font-display)', lineHeight: 1.2 }} text={item.title} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 500 }}>
                     <MapPin size={16} /> {item.location}
                  </div>

                  <FormattedText 
                    as="p"
                    style={{ color: '#555', marginBottom: '1.5rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontSize: '1.05rem' }} 
                    text={item.description}
                  />
                  
                  {item.allergens && (
                    <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fef3c7', padding: '0.5rem 0.75rem', borderRadius: '0.75rem' }}>
                      <AlertCircle size={16} style={{ flexShrink: 0 }} /> 
                      <span><strong>Allergeni:</strong> {item.allergens}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ background: '#fce7f3', color: '#db2777', padding: '0.5rem', borderRadius: '0.75rem' }}>
                      <Wine size={20} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '0.2rem' }}>In degustazione</p>
                      <p style={{ color: '#1a1a1a', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>{item.wineName}</p>
                      <p style={{ color: '#555', fontSize: '0.9rem', marginTop: '0.2rem' }}>{item.wineryName}</p>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info Pratiche e CTA (Super Card Bento) */}
      <section style={{ padding: '4rem 2rem 6rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          
          <div style={{ background: 'white', padding: '3rem', borderRadius: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', color: '#283983', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Info color="#E8C042" size={32} /> Info Pratiche
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#555', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '1rem', color: '#4b5563' }}><TicketIcon size={24} /></div>
                <div>
                   <h4 style={{ color: '#1a1a1a', fontWeight: 700, marginBottom: '0.25rem' }}>Ritiro Kit</h4>
                   <FormattedText style={{ lineHeight: 1.6 }} text={data.logistics.ticketInfo} />
                </div>
              </li>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '1rem', color: '#4b5563' }}><Map size={24} /></div>
                <div>
                   <h4 style={{ color: '#1a1a1a', fontWeight: 700, marginBottom: '0.25rem' }}>Parcheggi</h4>
                   <FormattedText style={{ lineHeight: 1.6 }} text={data.logistics.parkingInfo} />
                </div>
              </li>
              <li style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ background: '#fef3c7', padding: '0.75rem', borderRadius: '1rem', color: '#d97706' }}><AlertCircle size={24} /></div>
                <div>
                   <h4 style={{ color: '#1a1a1a', fontWeight: 700, marginBottom: '0.25rem' }}>Intolleranze</h4>
                   <FormattedText style={{ lineHeight: 1.6 }} text={data.logistics.disclaimer} />
                </div>
              </li>
            </ul>
          </div>

          <div style={{ 
            background: '#283983', 
            padding: '3rem', 
            borderRadius: '2rem', 
            color: 'white', 
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(40,57,131,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
             {/* Decorative blob */}
             <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px', background: 'rgba(232, 192, 66, 0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
             
             <FormattedText as="h3" style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', marginBottom: '1rem', position: 'relative', zIndex: 2 }} text={data.presale.title} />
             <FormattedText as="p" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.15rem', marginBottom: '2.5rem', whiteSpace: 'pre-wrap', maxWidth: '400px', position: 'relative', zIndex: 2 }} text={data.presale.subtitle} />
             
             <div style={{ fontSize: '4.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#E8C042', marginBottom: '2.5rem', lineHeight: 1, position: 'relative', zIndex: 2 }}>
               {data.presale.priceInfo} <span style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>/ pers.</span>
             </div>
             
             <Link href={data.presale.ctaLink} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                background: 'white', color: '#283983', padding: '1.25rem 3rem', borderRadius: '999px',
                textDecoration: 'none', fontWeight: 800, fontSize: '1.2rem', transition: 'transform 0.2s',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)', position: 'relative', zIndex: 2
              }}>
                {data.presale.ctaText}
              </Link>
          </div>
          
        </div>
      </section>

      {/* FAQs */}
      {data.faqs && data.faqs.length > 0 && (
        <section style={{ padding: '0 2rem 4rem' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', color: '#283983', marginBottom: '2.5rem', textAlign: 'center' }}>
              Domande Frequenti
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.faqs.map((faq, index) => (
                <div key={index} style={{ background: 'white', padding: '2rem', borderRadius: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '0.75rem' }}>{faq.question}</h4>
                  <FormattedText as="div" style={{ color: '#555', lineHeight: 1.6 }} text={faq.answer} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
