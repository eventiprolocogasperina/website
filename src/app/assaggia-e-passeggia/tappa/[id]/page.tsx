import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Wine, Utensils, MapPin, ArrowRight, ArrowLeft, AlertCircle, Info, Lightbulb, Camera } from 'lucide-react';
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


  return (
    <div style={{ background: '#F9F3E4', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Header speciale per la tappa */}
      <div style={{ background: tappa.themeColor, padding: '4rem 2rem', color: 'white', textAlign: 'center', borderRadius: '0 0 2rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700, marginBottom: '1rem', color: 'rgba(255,255,255,0.9)' }}>
            Tappa {tappa.id} di {tappe.length}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', marginBottom: '1rem', lineHeight: 1.1, textShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <ReactMarkdown components={{
              p: ({node, ...props}) => <span {...props} />, // Evita block paragraph inside h1
              strong: ({node, ...props}) => <strong style={{ fontWeight: 700 }} {...props} />,
              em: ({node, ...props}) => <em style={{ fontStyle: 'italic', opacity: 0.9 }} {...props} />,
            }}>
              {tappa.title}
            </ReactMarkdown>
          </h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(10px)', padding: '0.6rem 1.2rem', borderRadius: '999px', fontSize: '0.95rem', fontWeight: 500 }}>
            <MapPin size={18} /> {locationName}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '-3rem auto 0', padding: '0 1.5rem', position: 'relative', zIndex: 10 }}>
        
        {/* Menu Card with Glassmorphism */}
        <div style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '1.5rem', padding: '2.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', marginBottom: '2rem', border: '1px solid rgba(255,255,255,1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Intro Text Section */}
            {tappa.introText && (
              <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <ReactMarkdown components={{
                  p: ({node, ...props}) => <p style={{ color: '#444', lineHeight: 1.7, fontSize: '1.15rem', whiteSpace: 'pre-wrap', margin: 0, fontStyle: 'italic' }} {...props} />,
                  strong: ({node, ...props}) => <strong style={{ fontWeight: 700, color: '#1a1a1a' }} {...props} />,
                  em: ({node, ...props}) => <em style={{ color: tappa.themeColor }} {...props} />,
                }}>
                  {tappa.introText}
                </ReactMarkdown>
              </div>
            )}

            {/* Dish Section */}
            <div style={{ borderLeft: `4px solid ${tappa.themeColor}`, paddingLeft: '1.5rem' }}>
              <h4 style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem', fontWeight: 700 }}>Il Piatto</h4>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: '#1a1a1a', lineHeight: 1.1, marginBottom: '1rem' }}>
                <ReactMarkdown components={{
                  p: ({node, ...props}) => <span {...props} />, // Evita block paragraph inside h2
                  strong: ({node, ...props}) => <strong style={{ fontWeight: 700 }} {...props} />,
                  em: ({node, ...props}) => <em style={{ fontStyle: 'italic', color: tappa.themeColor }} {...props} />,
                }}>
                  {dishName}
                </ReactMarkdown>
              </h2>
              <ReactMarkdown components={{
                p: ({node, ...props}) => <p style={{ color: '#555', lineHeight: 1.7, fontSize: '1.1rem', whiteSpace: 'pre-wrap', margin: '0 0 1rem 0' }} {...props} />,
                strong: ({node, ...props}) => <strong style={{ fontWeight: 700, color: '#1a1a1a' }} {...props} />,
                em: ({node, ...props}) => <em style={{ fontStyle: 'italic', color: tappa.themeColor }} {...props} />,
              }}>
                {dishDescription}
              </ReactMarkdown>
              
              {tappa.allergens && (
                <div style={{ fontSize: '0.85rem', color: '#d97706', alignItems: 'center', gap: '0.4rem', marginTop: '1rem', background: 'rgba(217, 119, 6, 0.1)', padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'inline-flex' }}>
                  <AlertCircle size={14} /> <strong>Allergeni:</strong> {tappa.allergens}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, #eaeaea, transparent)' }} />

            {/* Wine Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: tappa.themeColor, padding: '1.2rem', borderRadius: '50%', color: 'white', boxShadow: `0 10px 20px ${tappa.themeColor}40` }}>
                <Wine size={32} strokeWidth={1.5} />
              </div>
              <div>
                 <h4 style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.8rem', color: '#888', marginBottom: '0.2rem', fontWeight: 700 }}>In Degustazione</h4>
                 <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: '#1a1a1a', lineHeight: 1.2 }}>{tappa.wineName}</h3>
                 <p style={{ color: '#666', fontSize: '1rem', marginTop: '0.25rem' }}>Cantina {tappa.wineryName}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Map Card */}
        <TappaMapClient
          lat={lat}
          lng={lng}
          themeColor={tappa.themeColor}
          locationName={mapLabel}
          mapUrl={mapUrl}
        />

        {/* Informazioni Extra e Curiosità */}
        {(tappa.curiosities || tappa.extraInfo) && (
          <div style={{ background: 'white', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
            {tappa.curiosities && (
              <div style={{ marginBottom: tappa.extraInfo ? '2rem' : '0' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ background: '#e0f2fe', padding: '1rem', borderRadius: '1rem', color: '#0369a1' }}>
                    <Lightbulb size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: '#1a1a1a', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>Lo Sapevi Che?</h3>
                    <ReactMarkdown components={{ p: ({node, ...props}) => <p style={{ color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }} {...props} /> }}>
                      {tappa.curiosities}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            
            {tappa.curiosities && tappa.extraInfo && (
              <div style={{ height: '1px', background: '#eaeaea', margin: '2rem 0' }} />
            )}

            {tappa.extraInfo && (
              <div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '1rem', color: '#4b5563' }}>
                    <Info size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: '#1a1a1a', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>Informazioni</h3>
                    <ReactMarkdown components={{ p: ({node, ...props}) => <p style={{ color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }} {...props} /> }}>
                      {tappa.extraInfo}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Galleria Fotografica Asimmetrica */}
        {tappa.photos && tappa.photos.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                <div style={{ background: '#fce7f3', padding: '0.8rem', borderRadius: '1rem', color: '#db2777' }}>
                  <Camera size={20} />
                </div>
                <h3 style={{ fontSize: '1.25rem', color: '#1a1a1a', fontFamily: 'var(--font-display)' }}>Galleria</h3>
             </div>
             
             {tappa.photos.length === 1 && (
               <div style={{ borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 15px 30px rgba(0,0,0,0.06)' }}>
                 <img src={tappa.photos[0]} alt="Foto" style={{ width: '100%', height: 'auto', display: 'block' }} />
               </div>
             )}
             
             {tappa.photos.length === 2 && (
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                 {tappa.photos.map((photo, i) => (
                   <div key={i} style={{ borderRadius: '1.5rem', overflow: 'hidden', aspectRatio: '4/5', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                     <img src={photo} alt={`Foto ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   </div>
                 ))}
               </div>
             )}
             
             {tappa.photos.length >= 3 && (
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '0.75rem', height: '400px' }}>
                 <div style={{ gridColumn: '1 / 2', gridRow: '1 / 3', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                   <img src={tappa.photos[0]} alt="Foto 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 </div>
                 <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                   <img src={tappa.photos[1]} alt="Foto 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 </div>
                 <div style={{ gridColumn: '2 / 3', gridRow: '2 / 3', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}>
                   <img src={tappa.photos[2]} alt="Foto 3" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                 </div>
               </div>
             )}
          </div>
        )}

        {/* Navigazione */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          {prevTappa ? (
            <Link href={`/assaggia-e-passeggia/tappa/${prevTappa.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem',
              background: 'white', color: '#283983', textDecoration: 'none', borderRadius: '1rem',
              fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', flex: 1, justifyContent: 'center'
            }}>
              <ArrowLeft size={16} /> Precedente
            </Link>
          ) : <div style={{ flex: 1 }} />}
          
          {nextTappa ? (
            <Link href={`/assaggia-e-passeggia/tappa/${nextTappa.id}`} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem',
              background: '#283983', color: 'white', textDecoration: 'none', borderRadius: '1rem',
              fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(40,57,131,0.2)', flex: 1, justifyContent: 'center'
            }}>
              Prossima Tappa <ArrowRight size={16} />
            </Link>
          ) : (
            <Link href="/assaggia-e-passeggia" style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem',
              background: '#E8C042', color: '#283983', textDecoration: 'none', borderRadius: '1rem',
              fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(232,192,66,0.3)', flex: 1, justifyContent: 'center'
            }}>
              Torna alla Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
