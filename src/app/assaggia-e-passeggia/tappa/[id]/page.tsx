import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Wine, MapPin, ArrowRight, ArrowLeft, AlertCircle, Info, Lightbulb, Camera, ChefHat, Clock, Gauge, ChevronDown } from 'lucide-react';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import TappaMapClient from '@/components/TappaMapClient';

import 'leaflet/dist/leaflet.css';

import { getPageContent, DEFAULT_ASSAGGIA_CONTENT, type AssaggiaEPasseggiaContent } from '@/lib/data/pages';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getPageContent<AssaggiaEPasseggiaContent>('assaggia-e-passeggia', DEFAULT_ASSAGGIA_CONTENT);
  const tappa = data.tappe.find(t => t.id === id);
  if (!tappa) return { title: 'Tappa non trovata' };
  return {
    title: `Tappa ${tappa.id}: ${tappa.title} - Assaggia & Passeggia`,
  };
}

export const revalidate = 0;

export default async function TappaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPageContent<AssaggiaEPasseggiaContent>('assaggia-e-passeggia', DEFAULT_ASSAGGIA_CONTENT);
  const tappe = data.tappe;
  const tappaIndex = tappe.findIndex(t => t.id === id);
  
  if (tappaIndex === -1) {
    notFound();
  }

  const tappa = tappe[tappaIndex];
  const nextTappa = tappe[tappaIndex + 1];
  const prevTappa = tappe[tappaIndex - 1];

  const dishName = tappa.tappaMenu?.dishName || tappa.title;
  const dishDescription = tappa.tappaMenu?.description || tappa.description;
  const locationName = typeof tappa.location === 'string' ? tappa.location : (tappa.location?.name || 'Gasperina');
  const mapLabel = typeof tappa.location === 'object' && tappa.location?.mapLabel ? tappa.location.mapLabel : locationName;
  const lat = typeof tappa.location === 'object' ? tappa.location?.lat : 38.7423; // Gasperina center
  const lng = typeof tappa.location === 'object' ? tappa.location?.lng : 16.4952;
  const mapUrl = typeof tappa.location === 'object' && tappa.location?.googleMapsUrl 
    ? tappa.location.googleMapsUrl 
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const heroImage = tappa.photos && tappa.photos.length > 0 ? tappa.photos[0] : null;

  return (
    <div style={{ background: '#Fdfcf8', minHeight: '100vh', paddingBottom: '4rem', fontFamily: 'var(--font-body)' }}>
      {/* Hero Section */}
      <div style={{ 
        background: heroImage ? `url(${heroImage}) center/cover no-repeat` : tappa.themeColor,
        position: 'relative',
        minHeight: '65vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white', 
        textAlign: 'center', 
        borderBottomLeftRadius: '3rem',
        borderBottomRightRadius: '3rem',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
      }}>
        {/* Overlay gradient */}
        <div style={{ position: 'absolute', inset: 0, background: heroImage ? `linear-gradient(to bottom, rgba(0,0,0,0.2), ${tappa.themeColor} 120%)` : 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.3))' }}></div>
        {!heroImage && <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>}
        
        <div style={{ position: 'relative', zIndex: 1, padding: '2rem', maxWidth: '800px', width: '100%', marginTop: '4rem' }}>
          <div style={{ 
            display: 'inline-block',
            fontSize: '0.9rem', 
            textTransform: 'uppercase', 
            letterSpacing: '4px', 
            fontWeight: 700, 
            marginBottom: '1.5rem', 
            color: 'white',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(10px)',
            padding: '0.5rem 1.5rem',
            borderRadius: '2rem',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            Tappa {tappa.id} di {tappe.length}
          </div>
          <h1 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 'clamp(3rem, 8vw, 5rem)', 
            marginBottom: '1.5rem', 
            lineHeight: 1.05, 
            textShadow: '0 10px 30px rgba(0,0,0,0.3)',
            fontWeight: 800
          }}>
            <ReactMarkdown components={{
              p: ({node, ...props}) => <span {...props} />,
              strong: ({node, ...props}) => <strong style={{ fontWeight: 800, color: 'white' }} {...props} />,
              em: ({node, ...props}) => <em style={{ fontStyle: 'italic', opacity: 0.9, fontWeight: 400 }} {...props} />,
            }}>
              {tappa.title}
            </ReactMarkdown>
          </h1>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            background: 'rgba(255,255,255,0.15)', 
            backdropFilter: 'blur(12px)', 
            WebkitBackdropFilter: 'blur(12px)',
            padding: '0.75rem 1.5rem', 
            borderRadius: '999px', 
            fontSize: '1.1rem', 
            fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
            <MapPin size={20} /> {locationName}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', opacity: 0.8, animation: 'bounce 2s infinite' }}>
          <ChevronDown size={32} />
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '-5rem auto 0', padding: '0 1.5rem', position: 'relative', zIndex: 10 }}>
        
        {/* Main Menu Card with Premium Glassmorphism */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.9)', 
          backdropFilter: 'blur(20px)', 
          WebkitBackdropFilter: 'blur(20px)', 
          borderRadius: '2rem', 
          padding: '3rem 2.5rem', 
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.5) inset', 
          marginBottom: '3rem', 
          border: '1px solid rgba(255,255,255,0.8)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative element */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '150px', background: `radial-gradient(circle, ${tappa.themeColor}20 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', position: 'relative', zIndex: 2 }}>
            
            {/* Intro Text Section */}
            {tappa.introText && (
              <div style={{ paddingBottom: '2rem', borderBottom: '1px dashed rgba(0,0,0,0.1)' }}>
                <ReactMarkdown components={{
                  p: ({node, ...props}) => <p style={{ color: '#4a4a4a', lineHeight: 1.8, fontSize: '1.2rem', whiteSpace: 'pre-wrap', margin: '0', fontStyle: 'italic', textAlign: 'center' }} {...props} />,
                  ul: ({node, ...props}) => <ul style={{ margin: '0.5rem 0 1rem 1.5rem', listStyleType: 'disc', color: '#4a4a4a', lineHeight: 1.8, fontSize: '1.2rem', fontStyle: 'italic' }} {...props} />,
                  ol: ({node, ...props}) => <ol style={{ margin: '0.5rem 0 1rem 1.5rem', listStyleType: 'decimal', color: '#4a4a4a', lineHeight: 1.8, fontSize: '1.2rem', fontStyle: 'italic' }} {...props} />,
                  li: ({node, ...props}) => <li style={{ marginBottom: '0.5rem' }} {...props} />,
                  strong: ({node, ...props}) => <strong style={{ fontWeight: 700, color: '#1a1a1a' }} {...props} />,
                  em: ({node, ...props}) => <em style={{ color: tappa.themeColor }} {...props} />,
                }}>
                  {tappa.introText}
                </ReactMarkdown>
              </div>
            )}

            {/* Dish Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <h4 style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.85rem', color: tappa.themeColor, marginBottom: '1rem', fontWeight: 800 }}>In Degustazione</h4>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1.5rem' }}>
                <ReactMarkdown components={{
                  p: ({node, ...props}) => <span {...props} />,
                  strong: ({node, ...props}) => <strong style={{ fontWeight: 800 }} {...props} />,
                  em: ({node, ...props}) => <em style={{ fontStyle: 'italic', color: tappa.themeColor, fontWeight: 400 }} {...props} />,
                }}>
                  {dishName}
                </ReactMarkdown>
              </h2>
              <div style={{ maxWidth: '600px' }}>
                <ReactMarkdown components={{
                  p: ({node, ...props}) => <p style={{ color: '#555', lineHeight: 1.8, fontSize: '1.15rem', whiteSpace: 'pre-wrap', margin: '0 0 1rem 0' }} {...props} />,
                  ul: ({node, ...props}) => <ul style={{ margin: '0.5rem 0 1rem 1.5rem', listStyleType: 'disc', color: '#555', lineHeight: 1.8, fontSize: '1.15rem' }} {...props} />,
                  ol: ({node, ...props}) => <ol style={{ margin: '0.5rem 0 1rem 1.5rem', listStyleType: 'decimal', color: '#555', lineHeight: 1.8, fontSize: '1.15rem' }} {...props} />,
                  li: ({node, ...props}) => <li style={{ marginBottom: '0.5rem' }} {...props} />,
                  strong: ({node, ...props}) => <strong style={{ fontWeight: 700, color: '#1a1a1a' }} {...props} />,
                  em: ({node, ...props}) => <em style={{ fontStyle: 'italic', color: tappa.themeColor }} {...props} />,
                }}>
                  {dishDescription}
                </ReactMarkdown>
              </div>
              
              {tappa.allergens && (
                <div style={{ fontSize: '0.9rem', color: '#b45309', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', background: '#fef3c7', padding: '0.75rem 1.5rem', borderRadius: '1rem', display: 'inline-flex', fontWeight: 500, boxShadow: '0 4px 12px rgba(180, 83, 9, 0.1)' }}>
                  <AlertCircle size={18} /> <strong>Allergeni:</strong> {tappa.allergens}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.1), transparent)', margin: '0.5rem 0' }} />

            {/* Wine Section */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', textAlign: 'left', background: 'rgba(0,0,0,0.02)', padding: '1.5rem', borderRadius: '1.5rem', border: '1px solid rgba(0,0,0,0.03)' }}>
              <div style={{ background: `linear-gradient(135deg, ${tappa.themeColor}, #111)`, padding: '1.25rem', borderRadius: '1rem', color: 'white', boxShadow: `0 15px 30px -10px ${tappa.themeColor}` }}>
                <Wine size={36} strokeWidth={1.5} />
              </div>
              <div>
                 <h4 style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem', fontWeight: 800 }}>In Abbinamento</h4>
                 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#1a1a1a', lineHeight: 1.2, fontWeight: 700 }}>{tappa.wineName}</h3>
                 <p style={{ color: '#666', fontSize: '1.05rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                   Cantina <strong style={{ color: tappa.themeColor }}>{tappa.wineryName}</strong>
                 </p>
              </div>
            </div>

          </div>
        </div>

        {/* Recipes Section */}
        {tappa.recipes && tappa.recipes.length > 0 && (
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', color: '#1a1a1a', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
              <ChefHat size={36} color={tappa.themeColor} /> Le Ricette
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {tappa.recipes.map((recipe, idx) => (
                <div key={recipe.id} style={{ background: 'white', borderRadius: '2rem', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', border: '1px solid rgba(0,0,0,0.04)' }}>
                  {recipe.photoUrl && (
                    <div style={{ width: '100%', height: '350px', position: 'relative' }}>
                      <img src={recipe.photoUrl} alt={recipe.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 50%)' }} />
                      <h3 style={{ position: 'absolute', bottom: '1.5rem', left: '2rem', right: '2rem', fontSize: '2.2rem', fontFamily: 'var(--font-display)', color: 'white', margin: 0, textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>{recipe.title}</h3>
                    </div>
                  )}
                  <div style={{ padding: '2.5rem' }}>
                    {!recipe.photoUrl && (
                      <h3 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-display)', color: '#1a1a1a', marginBottom: '1rem' }}>{recipe.title}</h3>
                    )}
                    {recipe.description && (
                      <p style={{ color: '#666', fontSize: '1.1rem', fontStyle: 'italic', marginBottom: '2rem', lineHeight: 1.6 }}>{recipe.description}</p>
                    )}
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                      {recipe.prepTime && (
                         <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f8f9fa', padding: '0.6rem 1.2rem', borderRadius: '2rem', fontSize: '0.9rem', color: '#333', fontWeight: 600, border: '1px solid #eee' }}>
                          <Clock size={18} color={tappa.themeColor} /> {recipe.prepTime}
                        </div>
                      )}
                      {recipe.difficulty && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#f8f9fa', padding: '0.6rem 1.2rem', borderRadius: '2rem', fontSize: '0.9rem', color: '#333', fontWeight: 600, border: '1px solid #eee' }}>
                          <Gauge size={18} color={tappa.themeColor} /> {recipe.difficulty}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2.5rem' }}>
                      {/* Ingredienti */}
                      <div style={{ background: '#fafafa', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #eaeaea', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                        <h4 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'var(--font-display)' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: tappa.themeColor, display: 'inline-block' }}></span>
                          Ingredienti
                        </h4>
                        <div className="prose prose-md max-w-none">
                          <ReactMarkdown components={{ 
                            p: ({node, ...props}) => <p style={{ color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }} {...props} />,
                            ul: ({node, ...props}) => <ul style={{ margin: '0.75rem 0 0.75rem 1.5rem', listStyleType: 'disc', color: '#444', lineHeight: 1.7 }} {...props} />,
                            ol: ({node, ...props}) => <ol style={{ margin: '0.75rem 0 0.75rem 1.5rem', listStyleType: 'decimal', color: '#444', lineHeight: 1.7 }} {...props} />,
                            li: ({node, ...props}) => <li style={{ marginBottom: '0.4rem' }} {...props} />,
                          }}>
                            {recipe.ingredients}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* Procedimento */}
                      <div>
                        <h4 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'var(--font-display)' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: tappa.themeColor, display: 'inline-block' }}></span>
                          Procedimento
                        </h4>
                        <div className="prose prose-md max-w-none">
                          <ReactMarkdown components={{ 
                            p: ({node, ...props}) => <p style={{ color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: '1.2rem' }} {...props} />,
                            ul: ({node, ...props}) => <ul style={{ margin: '0.75rem 0 1.2rem 1.5rem', listStyleType: 'disc', color: '#444', lineHeight: 1.8 }} {...props} />,
                            ol: ({node, ...props}) => <ol style={{ margin: '0.75rem 0 1.2rem 1.5rem', listStyleType: 'decimal', color: '#444', lineHeight: 1.8 }} {...props} />,
                            li: ({node, ...props}) => <li style={{ marginBottom: '0.5rem' }} {...props} />,
                          }}>
                            {recipe.instructions}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informazioni Extra e Curiosità */}
        {(tappa.curiosities || tappa.extraInfo) && (
          <div style={{ background: 'white', borderRadius: '2rem', padding: '3rem', boxShadow: '0 20px 40px rgba(0,0,0,0.04)', marginBottom: '3rem', border: '1px solid rgba(0,0,0,0.03)' }}>
            {tappa.curiosities && (
              <div style={{ marginBottom: tappa.extraInfo ? '3rem' : '0' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ background: '#fef3c7', padding: '1.25rem', borderRadius: '1.5rem', color: '#d97706', boxShadow: '0 10px 20px rgba(217, 119, 6, 0.1)' }}>
                    <Lightbulb size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', color: '#1a1a1a', marginBottom: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Lo Sapevi Che?</h3>
                    <ReactMarkdown components={{ 
                      p: ({node, ...props}) => <p style={{ color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '0 0 1rem 0', fontSize: '1.1rem' }} {...props} />,
                      ul: ({node, ...props}) => <ul style={{ margin: '0.5rem 0 1rem 1.5rem', listStyleType: 'disc', color: '#555', lineHeight: 1.7, fontSize: '1.1rem' }} {...props} />,
                      ol: ({node, ...props}) => <ol style={{ margin: '0.5rem 0 1rem 1.5rem', listStyleType: 'decimal', color: '#555', lineHeight: 1.7, fontSize: '1.1rem' }} {...props} />,
                      li: ({node, ...props}) => <li style={{ marginBottom: '0.5rem' }} {...props} />
                    }}>
                      {tappa.curiosities}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            
            {tappa.curiosities && tappa.extraInfo && (
              <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, #eaeaea, transparent)', margin: '3rem 0' }} />
            )}

            {tappa.extraInfo && (
              <div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ background: '#f3f4f6', padding: '1.25rem', borderRadius: '1.5rem', color: '#4b5563', boxShadow: '0 10px 20px rgba(75, 85, 99, 0.1)' }}>
                    <Info size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', color: '#1a1a1a', marginBottom: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Informazioni</h3>
                    <ReactMarkdown components={{ 
                      p: ({node, ...props}) => <p style={{ color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '0 0 1rem 0', fontSize: '1.1rem' }} {...props} />,
                      ul: ({node, ...props}) => <ul style={{ margin: '0.5rem 0 1rem 1.5rem', listStyleType: 'disc', color: '#555', lineHeight: 1.7, fontSize: '1.1rem' }} {...props} />,
                      ol: ({node, ...props}) => <ol style={{ margin: '0.5rem 0 1rem 1.5rem', listStyleType: 'decimal', color: '#555', lineHeight: 1.7, fontSize: '1.1rem' }} {...props} />,
                      li: ({node, ...props}) => <li style={{ marginBottom: '0.5rem' }} {...props} />
                    }}>
                      {tappa.extraInfo}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Galleria Fotografica Asimmetrica Premium */}
        {tappa.photos && tappa.photos.length > 0 && (
          <div style={{ marginBottom: '4rem' }}>
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem', padding: '0 0.5rem', justifyContent: 'center' }}>
                <div style={{ background: '#fce7f3', padding: '1rem', borderRadius: '1.25rem', color: '#db2777', boxShadow: '0 10px 20px rgba(219, 39, 119, 0.15)' }}>
                  <Camera size={24} />
                </div>
                <h3 style={{ fontSize: '1.75rem', color: '#1a1a1a', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Galleria</h3>
             </div>
             
             {tappa.photos.length === 1 && (
               <div style={{ borderRadius: '2rem', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.1)' }}>
                 <img src={tappa.photos[0]} alt="Foto" style={{ width: '100%', height: 'auto', display: 'block', transition: 'transform 0.5s ease', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
               </div>
             )}
             
             {tappa.photos.length === 2 && (
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                 {tappa.photos.map((photo, i) => (
                   <div key={i} style={{ borderRadius: '2rem', overflow: 'hidden', aspectRatio: '4/5', boxShadow: '0 15px 30px rgba(0,0,0,0.08)' }}>
                     <img src={photo} alt={`Foto ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                   </div>
                 ))}
               </div>
             )}
             
             {tappa.photos.length >= 3 && (
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '1rem', height: '500px' }}>
                 <div style={{ gridColumn: '1 / 2', gridRow: '1 / 3', borderRadius: '2rem', overflow: 'hidden', boxShadow: '0 15px 30px rgba(0,0,0,0.08)' }}>
                   <img src={tappa.photos[0]} alt="Foto 1" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                 </div>
                 <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', borderRadius: '2rem', overflow: 'hidden', boxShadow: '0 15px 30px rgba(0,0,0,0.08)' }}>
                   <img src={tappa.photos[1]} alt="Foto 2" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                 </div>
                 <div style={{ gridColumn: '2 / 3', gridRow: '2 / 3', borderRadius: '2rem', overflow: 'hidden', boxShadow: '0 15px 30px rgba(0,0,0,0.08)' }}>
                   <img src={tappa.photos[2]} alt="Foto 3" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                 </div>
               </div>
             )}
          </div>
        )}

        {/* Map Card */}
        <div style={{ marginBottom: '3rem', borderRadius: '2rem', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <TappaMapClient
            lat={lat}
            lng={lng}
            themeColor={tappa.themeColor}
            locationName={mapLabel}
            mapUrl={mapUrl}
          />
        </div>

        {/* Navigazione */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexDirection: 'row', alignItems: 'center' }}>
          {prevTappa ? (
            <Link href={`/assaggia-e-passeggia/tappa/${prevTappa.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 1.5rem',
              background: 'white', color: '#283983', textDecoration: 'none', borderRadius: '1.5rem',
              fontWeight: 700, fontSize: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', flex: 1, justifyContent: 'center',
              border: '1px solid rgba(0,0,0,0.03)', transition: 'all 0.2s ease', WebkitTapHighlightColor: 'transparent'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.08)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.05)' }}
            >
              <ArrowLeft size={20} /> Precedente
            </Link>
          ) : <div style={{ flex: 1 }} />}
          
          {nextTappa ? (
            <Link href={`/assaggia-e-passeggia/tappa/${nextTappa.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 1.5rem',
              background: '#283983', color: 'white', textDecoration: 'none', borderRadius: '1.5rem',
              fontWeight: 700, fontSize: '1rem', boxShadow: '0 15px 35px rgba(40,57,131,0.25)', flex: 1, justifyContent: 'center',
              transition: 'all 0.2s ease', WebkitTapHighlightColor: 'transparent'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 20px 45px rgba(40,57,131,0.35)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(40,57,131,0.25)' }}
            >
              Prossima Tappa <ArrowRight size={20} />
            </Link>
          ) : (
            <Link href="/assaggia-e-passeggia" style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 1.5rem',
              background: '#E8C042', color: '#283983', textDecoration: 'none', borderRadius: '1.5rem',
              fontWeight: 800, fontSize: '1rem', boxShadow: '0 15px 35px rgba(232,192,66,0.3)', flex: 1, justifyContent: 'center',
              transition: 'all 0.2s ease', WebkitTapHighlightColor: 'transparent'
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 20px 45px rgba(232,192,66,0.4)' }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(232,192,66,0.3)' }}
            >
              Torna alla Home
            </Link>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0) translateX(-50%); }
          40% { transform: translateY(-15px) translateX(-50%); }
          60% { transform: translateY(-7px) translateX(-50%); }
        }
      `}} />
    </div>
  );
}

