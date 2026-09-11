'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, CalendarDays, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function ZuccalandTeaser() {
  return (
    <section style={{ padding: '6rem 2rem', background: '#ffedd5', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative Blob */}
      <div style={{
        position: 'absolute', top: -50, right: '10%',
        width: 150, height: 150, background: '#ea580c',
        borderRadius: '50% 30% 70% 30%', opacity: 0.15,
        filter: 'blur(20px)', zIndex: 1,
      }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem', position: 'relative', zIndex: 10 }}>
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(234,88,12,0.1)', color: '#ea580c', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
            🎃 Prossimo Evento
          </div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <Image 
              src="/img/zuccaland/Logo.png" 
              alt="Zuccaland" 
              width={600}
              height={200}
              unoptimized
              style={{ width: '100%', maxWidth: '450px', height: 'auto', objectFit: 'contain' }} 
            />
          </div>
          <p style={{ fontSize: '1.1rem', color: '#7c2d12', lineHeight: 1.6, marginBottom: '2rem', fontWeight: 500 }}>
            Il villaggio magico delle zucche di Gasperina. Un'esperienza incantata tra colori autunnali, laboratori per grandi e piccini, e tanto street food da leccarsi i baffi.
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9a3412', fontSize: '0.95rem', fontWeight: 600 }}>
              <CalendarDays size={18} color="#ea580c" />
              10-11 Ottobre 2026
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9a3412', fontSize: '0.95rem', fontWeight: 600 }}>
              <MapPin size={18} color="#ea580c" />
              Gasperina (CZ)
            </div>
          </div>

          <Link href="/zuccaland" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#ea580c', color: 'white', padding: '1rem 2rem', borderRadius: '999px', fontWeight: 700, textDecoration: 'none', transition: 'transform 0.2s, boxShadow 0.2s', boxShadow: '0 8px 20px rgba(234,88,12,0.3)' }}>
            <Ticket size={18} /> Scopri di più e Prenota <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
