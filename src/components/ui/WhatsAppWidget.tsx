'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, ChevronRight } from 'lucide-react';

const CONTACTS = [
  {
    id: 'tickets',
    name: 'Assistenza Biglietti',
    role: 'Per info su ordini e ticket',
    number: '393331234567', // TODO: User will provide real number
  },
  {
    id: 'info',
    name: 'Info Generali',
    role: 'Per domande sulle attività',
    number: '393331234568', // TODO: User will provide real number
  }
];

export default function WhatsAppWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const openWhatsApp = (number: string) => {
    window.open(`https://wa.me/${number}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      fontFamily: 'var(--font-body)'
    }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'var(--neutral-900)',
              border: '1px solid var(--neutral-800)',
              borderRadius: '16px',
              padding: '1rem',
              marginBottom: '1rem',
              width: '280px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-heading)', margin: 0 }}>Chatta con noi</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', margin: '0.2rem 0 0 0' }}>Scegli a chi scrivere su WhatsApp</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {CONTACTS.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => openWhatsApp(contact.number)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '0.75rem', borderRadius: '12px',
                    background: 'var(--neutral-950)', border: '1px solid var(--neutral-800)',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#25D366';
                    e.currentTarget.style.background = 'rgba(37, 211, 102, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--neutral-800)';
                    e.currentTarget.style.background = 'var(--neutral-950)';
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-heading)' }}>{contact.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.1rem' }}>{contact.role}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: '#25D366' }} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#25D366',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(37,211,102,0.4)',
          transition: 'transform 0.2s',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)',
        }}
        aria-label="Apri chat WhatsApp"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
}
