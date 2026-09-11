'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { Calendar, MapPin, Minus, Plus, Loader2, CheckCircle, AlertCircle, Tag, X, ArrowRight, ShieldCheck, Ticket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ZuccalandContent, DEFAULT_ZUCCALAND_CONTENT } from '@/lib/data/pages';
import FormattedText from '@/components/ui/FormattedText';

// ─── Config ───────────────────────────────────────────────────────────────────
const EVENT_ID = 'zuccaland-2026';

const TICKET_TYPES = [
  { id: 'adulto', label: 'Ingresso Adulto', price: 5, description: 'Adulti oltre 12 anni', emoji: '🎃' },
  { id: 'ridotto', label: 'Ingresso Ridotto', price: 3, description: 'Bambini fino a 12 anni · Over 65', emoji: '🌽' },
];

// ─── Falling Pumpkins Easter Egg ──────────────────────────────────────────────
function FallingPumpkins() {
  const [pumpkins, setPumpkins] = useState<{ id: number; left: string; delay: number; duration: number; size: number; rotation: number }[]>([]);

  useEffect(() => {
    // Generate some random pumpkins
    const newPumpkins = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 20,
      size: 40 + Math.random() * 60,
      rotation: Math.random() * 360,
    }));
    setPumpkins(newPumpkins);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
      {pumpkins.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: '-10vh', rotate: p.rotation, opacity: 0 }}
          animate={{
            y: '110vh',
            rotate: p.rotation + 360,
            opacity: [0, 0.2, 0.2, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            position: 'absolute',
            left: p.left,
            width: p.size,
            height: p.size,
          }}
        >
          <Image src="/img/zuccaland/Pumpink.png" alt="" fill style={{ objectFit: 'contain' }} />
        </motion.div>
      ))}
    </div>
  );
}


// ─── Ticket Buyer ─────────────────────────────────────────────────────────────
function ZuccalandTicketBuyer({ content }: { content: ZuccalandContent }) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({ adulto: 0, ridotto: 0 });
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', telefono: '' });
  const [discountCode, setDiscountCode] = useState('');
  const [discountData, setDiscountData] = useState<any>(null);
  const [discountError, setDiscountError] = useState('');
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);
  const subtotal = TICKET_TYPES.reduce((sum, t) => sum + (quantities[t.id] || 0) * t.price, 0);
  const getDiscount = () => {
    if (!discountData) return 0;
    if (discountData.type === 'FIXED') return Math.min(discountData.value, subtotal);
    if (discountData.type === 'PERCENTAGE') return +(subtotal * discountData.value / 100).toFixed(2);
    return 0;
  };
  const discount = getDiscount();
  const total = Math.max(0, subtotal - discount);

  const setQty = (id: string, delta: number) =>
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));

  const handleCheckDiscount = async () => {
    if (!discountCode.trim()) return;
    setCheckingDiscount(true); setDiscountError(''); setDiscountData(null);
    try {
      const res = await fetch(`/api/discounts/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode.trim().toUpperCase() })
      });
      const data = await res.json();
      if (res.ok && data) {
        if (data.applies_to === 'FULL_TICKET') {
          setDiscountError('Codice non valido per questo evento.');
        } else {
          setDiscountData(data);
        }
      }
      else setDiscountError('Codice non valido o scaduto.');
    } catch { setDiscountError('Errore nella verifica.'); }
    finally { setCheckingDiscount(false); }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (totalTickets === 0) e.tickets = 'Seleziona almeno un biglietto.';
    if (!form.nome.trim()) e.nome = 'Nome richiesto';
    if (!form.cognome.trim()) e.cognome = 'Cognome richiesto';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email non valida';
    if (!form.telefono.trim()) e.telefono = 'Telefono richiesto';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const cart = TICKET_TYPES.filter(t => quantities[t.id] > 0)
        .map(t => ({ type: t.label, price: t.price, quantity: quantities[t.id] }));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: EVENT_ID,
          buyerName: `${form.nome} ${form.cognome}`,
          buyerEmail: form.email,
          buyerPhone: form.telefono,
          totalAmount: total,
          discountId: discountData?.id || null,
          cart,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      if (total === 0) router.push(`/zuccaland/success?order=${data.orderId}`);
      else router.push(`/api/nexi/checkout?orderId=${data.orderId}`);
    } catch (err: any) {
      alert(err.message || 'Errore imprevisto. Riprova.');
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '1rem', borderRadius: '1rem',
    border: '2px solid transparent', background: '#fff',
    color: '#431407', fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02), 0 4px 12px rgba(234,88,12,0.05)',
  };

  return (
    <div id="acquista" style={{
      padding: '6rem 1.5rem',
      background: 'linear-gradient(180deg, #ffedd5 0%, #fff7ed 100%)',
      position: 'relative',
      zIndex: 2,
    }}>
      {/* Decorative Blob */}
      <div style={{
        position: 'absolute', top: -50, right: '10%',
        width: 120, height: 120, background: '#ea580c',
        borderRadius: '50% 30% 70% 30%', opacity: 0.1,
        filter: 'blur(10px)', zIndex: -1,
      }} />

      <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.5 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: '#ea580c', color: 'white',
              padding: '0.5rem 1.25rem', borderRadius: '999px',
              fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: '1rem',
              boxShadow: '0 4px 14px rgba(234,88,12,0.4)',
            }}
          >
            <Ticket size={16} /> Biglietteria Ufficiale
          </motion.div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            color: '#431407', margin: '0 0 1rem', lineHeight: 1.1,
          }}>
            {content.tickets.title}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Ticket Selectors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {TICKET_TYPES.map((ticket, index) => {
              const qty = quantities[ticket.id];
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    background: qty > 0 ? '#ffedd5' : 'white',
                    border: `3px solid ${qty > 0 ? '#ea580c' : 'white'}`,
                    borderRadius: '1.5rem',
                    padding: '1.25rem 1.5rem',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: '1rem',
                    boxShadow: qty > 0 ? '0 10px 25px rgba(234,88,12,0.2)' : '0 10px 25px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                  onClick={() => qty === 0 && setQty(ticket.id, 1)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      fontSize: '2rem',
                      background: qty > 0 ? '#ea580c' : '#fefce8',
                      width: 60, height: 60, borderRadius: '1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: qty > 0 ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.05)',
                      transform: qty > 0 ? 'rotate(-10deg)' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}>
                      {ticket.emoji}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#431407', fontSize: '1.1rem' }}>{ticket.label}</div>
                      <div style={{ color: '#9a3412', fontSize: '0.85rem', marginTop: '0.1rem', fontWeight: 600 }}>{ticket.description}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <span style={{ color: '#ea580c', fontWeight: 900, fontSize: '1.4rem' }}>€{ticket.price}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                      <motion.button type="button" onClick={() => setQty(ticket.id, -1)} disabled={qty === 0}
                        whileTap={{ scale: 0.9 }}
                        style={{
                          width: 40, height: 40, borderRadius: '50%',
                          border: 'none',
                          background: qty > 0 ? '#fdba74' : '#f3f4f6',
                          color: qty > 0 ? '#7c2d12' : '#9ca3af',
                          cursor: qty > 0 ? 'pointer' : 'not-allowed',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <Minus size={20} strokeWidth={3} />
                      </motion.button>
                      <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#431407', minWidth: '1.5rem', textAlign: 'center' }}>
                        {qty}
                      </span>
                      <motion.button type="button" onClick={() => setQty(ticket.id, 1)}
                        whileTap={{ scale: 0.9 }}
                        style={{
                          width: 40, height: 40, borderRadius: '50%',
                          border: 'none', background: '#ea580c', color: 'white',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 10px rgba(234,88,12,0.4)',
                        }}>
                        <Plus size={20} strokeWidth={3} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            <div style={{
              background: '#fff7ed', border: '1px solid #ffedd5',
              padding: '1rem', borderRadius: '1rem', marginTop: '0.5rem',
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
            }}>
              <AlertCircle size={20} color="#ea580c" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: '#9a3412', fontSize: '0.9rem', lineHeight: 1.4, margin: 0, fontWeight: 500 }}>
                <strong>Attenzione:</strong> {content.tickets.disclaimer}
              </p>
            </div>

            {errors.tickets && (
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                style={{ color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, fontWeight: 700 }}>
                <AlertCircle size={16} /> {errors.tickets}
              </motion.p>
            )}
          </div>

          {/* Buyer Form */}
          <AnimatePresence>
            {totalTickets > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ type: "spring", bounce: 0.3 }}
                style={{ transformOrigin: 'top center' }}
              >
                {/* Info Card */}
                <div style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid white',
                  borderRadius: '1.5rem', padding: '1.75rem', marginBottom: '1rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                }}>
                  <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    I tuoi Dati
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {[
                      { key: 'nome', type: 'text', placeholder: 'Nome', emoji: '🧑' },
                      { key: 'cognome', type: 'text', placeholder: 'Cognome', emoji: '🧑' },
                      { key: 'email', type: 'email', placeholder: 'Email per i biglietti', emoji: '📧' },
                      { key: 'telefono', type: 'tel', placeholder: 'Cellulare', emoji: '📱' },
                    ].map(field => (
                      <div key={field.key} style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '1rem', left: '1rem', fontSize: '1.1rem', pointerEvents: 'none' }}>
                          {field.emoji}
                        </span>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={(form as any)[field.key]}
                          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                          style={{
                            ...inputStyle,
                            paddingLeft: '3rem',
                            borderColor: errors[field.key] ? '#ef4444' : 'transparent',
                            boxShadow: errors[field.key] ? '0 0 0 3px rgba(239,68,68,0.2)' : inputStyle.boxShadow,
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ea580c'; }}
                          onBlur={(e) => { e.target.style.borderColor = errors[field.key] ? '#ef4444' : 'transparent'; }}
                        />
                        {errors[field.key] && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.3rem', margin: '0.3rem 0 0', fontWeight: 600 }}>{errors[field.key]}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Promo Code */}
                <div style={{
                  background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
                  border: '2px solid white',
                  borderRadius: '1.5rem', padding: '1.5rem', marginBottom: '1rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', top: '1rem', left: '1rem', color: '#ea580c', pointerEvents: 'none' }}>
                        <Tag size={20} />
                      </span>
                      <input
                        type="text" placeholder="Codice Sconto (Opzionale)"
                        value={discountCode}
                        onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountData(null); setDiscountError(''); }}
                        style={{ ...inputStyle, paddingLeft: '3rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                      />
                    </div>
                    <motion.button type="button" onClick={handleCheckDiscount}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      disabled={checkingDiscount || !discountCode.trim()}
                      style={{
                        padding: '0 1.5rem', borderRadius: '1rem', border: 'none',
                        background: '#fdba74', color: '#7c2d12', cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem',
                      }}>
                      {checkingDiscount ? <Loader2 size={20} className="animate-spin" /> : 'Verifica'}
                    </motion.button>
                  </div>
                  {discountData && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#16a34a', fontSize: '0.9rem', marginTop: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle size={16} /> Sconto attivato!</motion.p>}
                  {discountError && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><X size={16} /> {discountError}</motion.p>}
                </div>

                {/* Recap & Checkout */}
                <div style={{
                  background: '#ea580c', color: 'white',
                  borderRadius: '1.5rem', padding: '2rem',
                  boxShadow: '0 15px 35px rgba(234,88,12,0.3)',
                  display: 'flex', flexDirection: 'column', gap: '1.5rem',
                }}>
                  <div>
                    {TICKET_TYPES.filter(t => quantities[t.id] > 0).map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.9 }}>
                        <span>{quantities[t.id]}× {t.label}</span>
                        <span>€{(quantities[t.id] * t.price).toFixed(2)}</span>
                      </div>
                    ))}
                    {discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: '#fde047', marginBottom: '0.5rem' }}>
                        <span>Sconto applicato</span><span>−€{discount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop: '2px dashed rgba(255,255,255,0.2)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>Totale</span>
                    <span style={{ fontWeight: 900, fontSize: '2.5rem' }}>€{total.toFixed(2)}</span>
                  </div>

                  <motion.button
                    type="submit" disabled={submitting}
                    whileHover={!submitting ? { scale: 1.02 } : {}}
                    whileTap={!submitting ? { scale: 0.98 } : {}}
                    style={{
                      width: '100%', padding: '1.25rem',
                      background: 'white', color: '#ea580c',
                      border: 'none', borderRadius: '1rem',
                      fontSize: '1.1rem', fontWeight: 900, cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                      opacity: submitting ? 0.8 : 1,
                    }}
                  >
                    {submitting ? <><Loader2 size={22} className="animate-spin" /> Elaborazione in corso...</>
                      : total === 0 ? <><CheckCircle size={22} /> Prenota Gratis</>
                        : <>Procedi al Checkout <ArrowRight size={22} strokeWidth={3} /></>}
                  </motion.button>
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 600 }}>
                    <ShieldCheck size={14} /> Pagamento 100% sicuro con Nexi
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function ZuccalandClient({ content: rawContent }: { content: ZuccalandContent }) {
  // Merge with defaults to prevent crashes if DB row exists but is empty
  const content = {
    hero: { ...DEFAULT_ZUCCALAND_CONTENT.hero, ...(rawContent?.hero || {}) },
    program: { ...DEFAULT_ZUCCALAND_CONTENT.program, ...(rawContent?.program || {}) },
    tickets: { ...DEFAULT_ZUCCALAND_CONTENT.tickets, ...(rawContent?.tickets || {}) },
    faqs: rawContent?.faqs || DEFAULT_ZUCCALAND_CONTENT.faqs,
  };

  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], [0, 300]);

  return (
    <div style={{ background: '#fefce8', minHeight: '100vh', color: '#431407', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Easter Egg */}
      <FallingPumpkins />

      {/* ── Sticky Navbar Fun ── */}
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        style={{
        position: 'sticky', top: '6rem', zIndex: 50,
        margin: '0 auto', maxWidth: '800px', width: 'calc(100% - 2rem)',
        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)',
        borderRadius: '999px', padding: '0.75rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
        border: '2px solid white'
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ color: '#ea580c', fontSize: '0.9rem', fontWeight: 800, paddingLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ← <span style={{ display: 'none' }} className="sm:inline">Pro Loco</span>
          </span>
        </Link>
        <Image src="/img/zuccaland/Logotype.png" alt="" width={80} height={30} unoptimized style={{ objectFit: 'contain' }} />
        <a href="#acquista"
          onClick={e => { e.preventDefault(); document.getElementById('acquista')?.scrollIntoView({ behavior: 'smooth' }); }}
          style={{
            background: '#ea580c', color: 'white', padding: '0.6rem 1.25rem',
            borderRadius: '999px', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem',
            boxShadow: '0 4px 12px rgba(234,88,12,0.3)',
          }}>
          Acquista
        </a>
      </motion.div>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative',
        minHeight: '85vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8rem 2rem 2rem', // Increased top padding from 2rem to 8rem to clear the navbar
        textAlign: 'center',
        zIndex: 2,
      }}>
        <motion.div style={{ y: yBg, position: 'absolute', inset: 0, zIndex: -1 }}>
          <div style={{
            position: 'absolute', top: '10%', left: '5%', width: '40vw', height: '40vw',
            background: '#fef08a', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.6
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', right: '5%', width: '50vw', height: '50vw',
            background: '#fed7aa', borderRadius: '50%', filter: 'blur(100px)', opacity: 0.5
          }} />
        </motion.div>

        <div style={{ position: 'relative', zIndex: 10 }}>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Image
              src="/img/zuccaland/Logo.png"
              alt="Zuccaland"
              width={1600}
              height={500}
              unoptimized
              style={{ objectFit: 'contain', width: '100%', maxWidth: '900px', filter: 'drop-shadow(0 20px 30px rgba(234,88,12,0.15))' }}
              priority
            />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 8vw, 5rem)',
              color: 'white',
              lineHeight: 1.1,
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
              marginBottom: '1rem',
              display: 'none'
            }}
          >
            {content.hero.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            style={{
              fontSize: 'clamp(1.2rem, 4vw, 1.8rem)',
              color: '#ea580c',
              maxWidth: '800px',
              margin: '0 auto',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              letterSpacing: '0.02em',
            }}
          >
            {content.hero.subtitle}
          </motion.p>
          
          {content.hero.description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              style={{
                fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                color: '#7c2d12',
                maxWidth: '700px',
                margin: '1rem auto 0',
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              {content.hero.description}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
          >
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.2rem',
              color: '#9a3412',
              marginTop: '1.5rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              10-11 Ottobre 2026 • Gasperina
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Programma Section ── */}
      <section style={{ padding: '4rem 2rem', background: 'white', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: '#ea580c', marginBottom: '2rem' }}>
            {content.program.title}
          </h2>
          <div style={{
            background: '#ffedd5',
            padding: '3rem',
            borderRadius: '2rem',
            border: '2px dashed #fdba74',
            color: '#9a3412', fontSize: '1.2rem', fontWeight: 500
          }}>
            <FormattedText text={content.program.content} />
          </div>
        </div>
      </section>

      {/* ── Bouncy Cards Section ── */}
      <section style={{ padding: '6rem 2rem', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
          {[
            { emoji: '🎪', title: 'Il Villaggio Magico', desc: 'Immergiti in un mondo arancione tra centinaia di zucche, paglia e allestimenti da favola.', color: '#fef08a' },
            { emoji: '🎨', title: 'Laboratori', desc: 'Intaglia, dipingi e decora la tua zucca perfetta! Divertimento assicurato per tutte le età.', color: '#fed7aa' },
            { emoji: '🥧', title: 'Degustazioni culinarie', desc: 'Assapora tantissimi prodotti a base di zucca, dolci tipici e bevande autunnali per scaldare il cuore.', color: '#fbcfe8' }
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.15, type: 'spring', bounce: 0.5 }}
              whileHover={{ y: -10, rotate: i % 2 === 0 ? 2 : -2 }}
              style={{
                background: 'white',
                borderRadius: '2rem', padding: '2.5rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
                border: '4px solid white',
                position: 'relative', overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 150, height: 150, background: item.color,
                borderRadius: '50%', opacity: 0.3, filter: 'blur(30px)'
              }} />
              <div style={{ fontSize: '3rem', marginBottom: '1rem', position: 'relative', zIndex: 2 }}>{item.emoji}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: '#431407', margin: '0 0 0.5rem', position: 'relative', zIndex: 2 }}>
                {item.title}
              </h3>
              <p style={{ color: '#7c2d12', fontSize: '1rem', lineHeight: 1.6, margin: 0, fontWeight: 500, position: 'relative', zIndex: 2 }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Ticket Buyer ── */}
      <ZuccalandTicketBuyer content={content} />

    </div>
  );
}
