'use client';

import Link from 'next/link';
import { ArrowRight, Wine, MapPin, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AssaggiaTeaser() {
  return (
    <section style={{ padding: '6rem 2rem', background: '#F9F3E4', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05, pointerEvents: 'none' }}>
        <img 
          src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2940&auto=format&fit=crop" 
          alt="" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem', position: 'relative', zIndex: 10 }}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(40,57,131,0.1)', color: '#283983', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            <Wine size={16} /> Il Nostro Evento Autentico
          </div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <img 
              src="/img/AP_only.png" 
              alt="Assaggia & Passeggia" 
              style={{ width: '100%', maxWidth: '350px', height: 'auto', objectFit: 'contain' }} 
            />
          </div>
          <p style={{ fontSize: '1.1rem', color: '#555', lineHeight: 1.6, marginBottom: '2rem' }}>
            Un itinerario enogastronomico scenografico ed esperienziale tra i vicoli di Gasperina. Quattro tappe di puro gusto e vino locale alla scoperta delle nostre radici.
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.95rem' }}>
              <CalendarDays size={18} color="#d97706" />
              10 Agosto
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666', fontSize: '0.95rem' }}>
              <MapPin size={18} color="#d97706" />
              Piazza Enrico Fermi, Gasperina
            </div>
          </div>

          <Link href="/assaggia-e-passeggia" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#283983', color: 'white', padding: '1rem 2rem', borderRadius: '999px', fontWeight: 600, textDecoration: 'none', transition: 'transform 0.2s, boxShadow 0.2s', boxShadow: '0 4px 15px rgba(40,57,131,0.2)' }}>
            Scopri di più e acquista i biglietti <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
