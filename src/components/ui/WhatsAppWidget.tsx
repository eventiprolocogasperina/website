'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

interface SupportTopic {
  id: string;
  label: string;
  phone: string;
}

export default function WhatsAppWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [topics, setTopics] = useState<SupportTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');

  // Fetch topics and listen for custom event
  useEffect(() => {
    // Listen for custom event to open widget from elsewhere (e.g. BookingForm)
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-whatsapp', handleOpen);

    return () => window.removeEventListener('open-whatsapp', handleOpen);
  }, []);

  // Show tooltip after a few seconds ONLY on booking/A&P related pages
  useEffect(() => {
    const isBookingFlow = pathname?.includes('/assaggia-e-passeggia') || pathname?.includes('/ticket') || pathname?.includes('/eventi');
    if (!isBookingFlow) return;

    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Hide tooltip when opened
  useEffect(() => {
    if (isOpen) setShowTooltip(false);
  }, [isOpen]);

  // Fetch topics when widget opens for the first time
  useEffect(() => {
    if (isOpen && topics.length === 0) {
      setLoading(true);
      fetch('/api/support-topics')
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            setTopics(d.data);
            if (d.data.length > 0) {
              setSelectedTopicId(d.data[0].id);
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, topics.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const topic = topics.find(t => t.id === selectedTopicId);
    if (!topic || !topic.phone) return;

    const message = `Ciao, sono ${name.trim()}. Vorrei ricevere assistenza in merito a: ${topic.label}.`;
    window.open(`https://wa.me/${topic.phone}?text=${encodeURIComponent(message)}`, '_blank');
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
              padding: '1.25rem',
              marginBottom: '1rem',
              width: '300px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-heading)', margin: 0 }}>Assistenza</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', margin: '0.2rem 0 0 0' }}>Di cosa hai bisogno?</p>
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

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--neutral-500)' }} />
              </div>
            ) : topics.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', textAlign: 'center', padding: '1rem 0' }}>
                Assistenza al momento non disponibile.
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-300)', marginBottom: '0.3rem', fontWeight: 500 }}>Il tuo nome</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Es. Mario"
                    style={{ width: '100%', padding: '0.65rem', background: 'var(--neutral-950)', border: '1px solid var(--neutral-800)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-300)', marginBottom: '0.3rem', fontWeight: 500 }}>Argomento</label>
                  <select 
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', background: 'var(--neutral-950)', border: '1px solid var(--neutral-800)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
                  >
                    {topics.map(topic => (
                      <option key={topic.id} value={topic.id}>{topic.label}</option>
                    ))}
                  </select>
                </div>
                <button 
                  type="submit"
                  disabled={!name.trim()}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', background: '#25D366', color: 'white', marginTop: '0.5rem' }}
                >
                  <Send size={15} /> Inizia Chat
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ position: 'relative' }}>
        <AnimatePresence>
          {showTooltip && !isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              style={{
                position: 'absolute',
                right: '75px', // slightly offset from the button
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'var(--neutral-900)',
                color: 'var(--color-text)',
                padding: '0.6rem 1rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                border: '1px solid var(--neutral-800)',
                pointerEvents: 'none',
              }}
            >
              Hai bisogno di assistenza? 👋
              <div style={{
                position: 'absolute',
                right: '-6px',
                top: '50%',
                marginTop: '-6px',
                width: 0,
                height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderLeft: '6px solid var(--neutral-800)',
              }} />
              <div style={{
                position: 'absolute',
                right: '-5px',
                top: '50%',
                marginTop: '-5px',
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '5px solid var(--neutral-900)',
              }} />
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
    </div>
  );
}
