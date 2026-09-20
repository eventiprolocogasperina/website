'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Minus, Plus, Loader2, CheckCircle, AlertCircle, Tag, X, ArrowRight, ArrowLeft, ShieldCheck, Ticket, Calendar, Clock, MapPin, Music, ShoppingBag, Coffee, Image as ImageIcon, PartyPopper, Sparkles, Check, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ZuccalandContent, DEFAULT_ZUCCALAND_CONTENT } from '@/lib/data/pages';
import FormattedText from '@/components/ui/FormattedText';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map icon string from CMS to lucide component */
function getHighlightIcon(icon: string, size: number = 22) {
  switch (icon) {
    case 'shopping-bag': return <ShoppingBag size={size} />;
    case 'music': return <Music size={size} />;
    case 'coffee': return <Coffee size={size} />;
    case 'image': return <ImageIcon size={size} />;
    case 'calendar': return <Calendar size={size} />;
    default: return <Sparkles size={size} />;
  }
}

/** Render ticket emoji — 'pumpkin' sentinel renders the custom image */
function TicketEmoji({ emoji }: { emoji: string }) {
  if (emoji === 'pumpkin') {
    return <img src="/img/zuccaland/Pumpink.png" style={{ width: 36, height: 36, objectFit: 'contain' }} alt="Zucca" />;
  }
  return <span>{emoji}</span>;
}

// ─── Event Phase ──────────────────────────────────────────────────────────────

type EventPhase = 'pre-sale' | 'on-sale' | 'live' | 'concluded';

function getEventPhase(event: ZuccalandContent['event']): EventPhase {
  const now = new Date();
  const salesOpen = new Date(event.salesOpenDate);
  const salesClose = new Date(event.salesCloseDate);
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);

  if (now < salesOpen) return 'pre-sale';
  if (now >= salesOpen && now < salesClose) return 'on-sale';
  if (now >= start && now <= end) return 'live';
  return now > end ? 'concluded' : 'on-sale';
}

// ─── Countdown Hook ───────────────────────────────────────────────────────────

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return { ...timeLeft, mounted };
}

// ─── Falling Pumpkins Easter Egg ──────────────────────────────────────────────

function FallingPumpkins() {
  const [pumpkins, setPumpkins] = useState<{ id: number; left: string; delay: number; duration: number; size: number; rotation: number }[]>([]);

  useEffect(() => {
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
          <img src="/img/zuccaland/Pumpink.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Countdown Display ────────────────────────────────────────────────────────

function CountdownDisplay({ targetDate, label }: { targetDate: string; label: string }) {
  const { days, hours, minutes, seconds, mounted } = useCountdown(targetDate);

  const segments = [
    { value: days, label: 'Giorni' },
    { value: hours, label: 'Ore' },
    { value: minutes, label: 'Min' },
    { value: seconds, label: 'Sec' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6, type: 'spring', bounce: 0.4 }}
      style={{
        background: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '1.5rem',
        padding: 'clamp(1.25rem, 4vw, 2rem) clamp(0.75rem, 3vw, 2rem)',
        border: '1px solid rgba(255,255,255,0.25)',
        boxShadow: '0 20px 60px rgba(234,88,12,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
        maxWidth: '560px',
        width: 'calc(100% - 1rem)',
        margin: '1.5rem auto 0',
        textAlign: 'center',
      }}
    >
      <p style={{
        color: '#ea580c', fontWeight: 800, fontSize: 'clamp(0.78rem, 2.5vw, 0.85rem)',
        textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.85rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
      }}>
        <Clock size={15} /> {label}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(0.35rem, 2vw, 0.85rem)' }}>
        {segments.map((seg, i) => (
          <div key={seg.label} style={{ textAlign: 'center' }}>
            <motion.div
              key={mounted ? seg.value : 'loading'}
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                color: 'white',
                fontWeight: 900,
                fontSize: 'clamp(1.35rem, 5.5vw, 2.4rem)',
                borderRadius: '0.85rem',
                padding: 'clamp(0.45rem, 1.8vw, 0.75rem) clamp(0.4rem, 1.8vw, 0.85rem)',
                minWidth: 'clamp(48px, 17vw, 75px)',
                boxShadow: '0 8px 20px rgba(234,88,12,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {mounted ? String(seg.value).padStart(2, '0') : '--'}
            </motion.div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9a3412', marginTop: '0.4rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {seg.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Phase Banner ─────────────────────────────────────────────────────────────

function PhaseBanner({ phase }: { phase: EventPhase }) {
  if (phase === 'on-sale') return null;

  const config = {
    'pre-sale': {
      bg: 'linear-gradient(135deg, #fef08a 0%, #fde68a 100%)',
      color: '#92400e',
      icon: <Clock size={20} />,
      text: 'Le vendite apriranno a breve!',
      glow: 'rgba(251,191,36,0.3)',
    },
    'live': {
      bg: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      color: '#ffffff',
      icon: <PartyPopper size={20} />,
      text: "L'evento è in corso! Vieni a trovarci! 🎃",
      glow: 'rgba(34,197,94,0.4)',
    },
    'concluded': {
      bg: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
      color: '#ffffff',
      icon: <Sparkles size={20} />,
      text: 'Grazie a tutti! L\'evento si è concluso. Alla prossima edizione! 💜',
      glow: 'rgba(124,58,237,0.3)',
    },
  }[phase];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0.4 }}
      style={{
        background: config.bg,
        color: config.color,
        padding: '1rem 1.5rem',
        borderRadius: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        fontWeight: 800,
        fontSize: '0.95rem',
        boxShadow: `0 10px 30px ${config.glow}`,
        margin: '1rem auto',
        maxWidth: '600px',
        width: 'calc(100% - 2rem)',
        position: 'relative',
        zIndex: 50,
      }}
    >
      {config.icon}
      {config.text}
    </motion.div>
  );
}

// ─── Ticket Buyer ─────────────────────────────────────────────────────────────

function ZuccalandTicketBuyer({ content }: { content: ZuccalandContent }) {
  const router = useRouter();
  const ticketTypes = content.ticketTypes || DEFAULT_ZUCCALAND_CONTENT.ticketTypes;
  const freeActivities = content.freeActivities || DEFAULT_ZUCCALAND_CONTENT.freeActivities;
  const baseTypes = ticketTypes.filter(t => !t.isExtra);
  const extraTypes = ticketTypes.filter(t => t.isExtra);

  const initialQty: Record<string, number> = {};
  ticketTypes.forEach(t => { initialQty[t.id] = 0; });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDay, setSelectedDay] = useState<'10 Ottobre' | '11 Ottobre'>('10 Ottobre');
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQty);
  const [numChildren, setNumChildren] = useState(0);
  const [activityTarget, setActivityTarget] = useState<'children' | 'all'>('children');
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', telefono: '' });
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [showPromo, setShowPromo] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountData, setDiscountData] = useState<any>(null);
  const [discountError, setDiscountError] = useState('');
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showActivityReminderModal, setShowActivityReminderModal] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  const totalBase = baseTypes.reduce((sum, t) => sum + (quantities[t.id] || 0), 0);
  const subtotal = ticketTypes.reduce((sum, t) => sum + (quantities[t.id] || 0) * t.price, 0);

  const hasFreeActivities = selectedActivities.length > 0;
  const youPickLabTicket = ticketTypes.find(t => t.id === 'laboratorio' || t.isExtra);
  const youPickLabQty = youPickLabTicket ? (quantities[youPickLabTicket.id] || 0) : 0;
  const hasYouPickLab = youPickLabQty > 0;
  const isMissingActivitiesOrLab = !hasFreeActivities || !hasYouPickLab;

  // Auto-adjust children if totalBase decreases
  useEffect(() => {
    if (numChildren > totalBase) {
      setNumChildren(totalBase);
    }
  }, [totalBase, numChildren]);

  // Clean up activities incompatible with the selected day
  useEffect(() => {
    if (selectedDay === '10 Ottobre') {
      setSelectedActivities(prev => prev.filter(id => id !== 'facepainting'));
    } else if (selectedDay === '11 Ottobre') {
      setSelectedActivities(prev => prev.filter(id => id !== 'zucca_vaso'));
    }
  }, [selectedDay]);

  const getDiscount = () => {
    if (!discountData) return 0;
    if (discountData.type === 'FIXED') return Math.min(discountData.value, subtotal);
    if (discountData.type === 'PERCENTAGE') return +(subtotal * discountData.value / 100).toFixed(2);
    return 0;
  };
  const discount = getDiscount();
  const total = Math.max(0, subtotal - discount);

  const setQty = (id: string, delta: number) =>
    setQuantities(prev => {
      const ticket = ticketTypes.find(t => t.id === id);
      let newQty = Math.max(0, (prev[id] || 0) + delta);
      if (ticket?.isExtra) {
        newQty = Math.min(newQty, totalBase + (id === baseTypes[0]?.id ? delta : 0));
      } else {
        // If decreasing a base ticket, cap extras
        const updated = { ...prev, [id]: newQty };
        const newBase = baseTypes.reduce((s, t) => s + (updated[t.id] || 0), 0);
        extraTypes.forEach(ext => {
          if ((updated[ext.id] || 0) > newBase) {
            updated[ext.id] = newBase;
          }
        });
        return updated;
      }
      return { ...prev, [id]: newQty };
    });

  const toggleActivity = (actId: string) => {
    // Guard against day restrictions
    if (selectedDay === '10 Ottobre' && actId === 'facepainting') return;
    if (selectedDay === '11 Ottobre' && actId === 'zucca_vaso') return;

    setSelectedActivities(prev =>
      prev.includes(actId) ? prev.filter(id => id !== actId) : [...prev, actId]
    );
  };

  const proceedToStep3 = (force = false) => {
    if (totalBase === 0) {
      setStep(1);
      setErrors({ tickets: 'Seleziona almeno un ingresso per continuare.' });
      return;
    }
    if (!force && isMissingActivitiesOrLab && !reminderDismissed) {
      setShowActivityReminderModal(true);
      return;
    }
    setStep(3);
  };

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
    if (totalBase === 0) e.tickets = 'Seleziona almeno un Ingresso per procedere.';
    if (!form.nome.trim()) e.nome = 'Nome richiesto';
    if (!form.cognome.trim()) e.cognome = 'Cognome richiesto';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email non valida';
    if (!form.telefono.trim()) e.telefono = 'Telefono richiesto';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    if (totalBase === 0) {
      setStep(1);
      setErrors({ tickets: 'Seleziona almeno un ingresso per continuare.' });
      return;
    }
    if (!force && isMissingActivitiesOrLab && !reminderDismissed) {
      setShowActivityReminderModal(true);
      return;
    }
    if (step < 3) {
      setStep(3);
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const cart = ticketTypes.filter(t => quantities[t.id] > 0)
        .map(t => ({ type: t.label, price: t.price, quantity: quantities[t.id] }));

      const targetLabel = numChildren > 0 && numChildren < totalBase && activityTarget === 'children'
        ? `Solo bambini (${numChildren})`
        : (numChildren > 0 ? `Tutti (${totalBase}, di cui ${numChildren} bambini)` : `Tutti (${totalBase})`);

      const actLabels = selectedActivities.map(id => freeActivities.find(a => a.id === id)?.label || id);

      let orderNotes = `Data: ${selectedDay === '10 Ottobre' ? 'Sabato 10 Ottobre 2026' : 'Domenica 11 Ottobre 2026'} | Bambini: ${numChildren}/${totalBase}`;
      if (actLabels.length > 0) {
        orderNotes += ` | Attività [${targetLabel}]: ${actLabels.join(', ')}`;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'zuccaland-2026',
          buyerName: `${form.nome} ${form.cognome}`,
          buyerEmail: form.email,
          buyerPhone: form.telefono,
          totalAmount: total,
          discountId: discountData?.id || null,
          cart,
          notes: orderNotes.trim()
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

  // Helper for activity icons
  const getActivityIcon = (act: { id: string; label: string }) => {
    const text = (act.id + ' ' + act.label).toLowerCase();
    if (text.includes('vaso') || text.includes('zucca')) return '🎃';
    if (text.includes('pittur') || text.includes('art')) return '🖌️';
    if (text.includes('face') || text.includes('thrill') || text.includes('dance')) return '🧟';
    return '🎨';
  };

  return (
    <div id="acquista" style={{
      padding: 'clamp(3rem, 7vh, 5rem) 1rem 6rem',
      background: 'linear-gradient(180deg, #ffedd5 0%, #fff7ed 100%)',
      position: 'relative',
      zIndex: 2,
      scrollMarginTop: '8rem',
    }}>
      {/* Decorative Blur Blobs */}
      <div style={{
        position: 'absolute', top: -40, right: '10%',
        width: 140, height: 140, background: '#ea580c',
        borderRadius: '50% 30% 70% 30%', opacity: 0.12,
        filter: 'blur(16px)', zIndex: -1,
      }} />
      <div style={{
        position: 'absolute', bottom: 100, left: '5%',
        width: 180, height: 180, background: '#f97316',
        borderRadius: '40% 60% 30% 70%', opacity: 0.08,
        filter: 'blur(20px)', zIndex: -1,
      }} />

      <div style={{ maxWidth: '1080px', margin: '0 auto', position: 'relative' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", bounce: 0.5 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#ea580c', color: 'white',
              padding: '0.4rem 1.1rem', borderRadius: '999px',
              fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: '0.75rem',
              boxShadow: '0 4px 14px rgba(234,88,12,0.4)',
            }}
          >
            <Ticket size={15} /> Biglietteria Ufficiale
          </motion.div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.85rem, 5.5vw, 2.75rem)',
            color: '#431407', margin: '0 0 0.5rem', lineHeight: 1.2,
          }}>
            {content.tickets.title}
          </h2>
          <p style={{
            color: '#9a3412', fontSize: 'clamp(0.88rem, 2.8vw, 0.95rem)', lineHeight: 1.5, fontWeight: 500,
            maxWidth: '520px', margin: '0 auto', padding: '0 0.5rem',
          }}>
            Prenota il tuo ingresso e iscriviti ai laboratori in pochi semplici passaggi.
          </p>

          {/* PROGRESS STEPPER BAR (RESPONSIVE NO-WRAP LABELS) */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)',
            padding: '0.3rem 0.4rem', borderRadius: '999px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(254, 215, 170, 0.8)',
            marginTop: '1.25rem', maxWidth: '460px', width: '100%', justifyContent: 'center'
          }}>
            {[
              { num: 1 as const, titleFull: 'Biglietti & Bimbi', titleShort: '1. Ingressi', emoji: '🎟️' },
              { num: 2 as const, titleFull: 'Laboratori', titleShort: '2. Laboratori', emoji: '🎨' },
              { num: 3 as const, titleFull: 'Dati & Cassa', titleShort: '3. Cassa', emoji: '🧑' },
            ].map(s => {
              const isActive = step === s.num;
              const isDone = step > s.num && totalBase > 0;
              const isClickable = totalBase > 0 || s.num === 1;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (isClickable) {
                      if (s.num === 3) proceedToStep3();
                      else setStep(s.num);
                    }
                  }}
                  disabled={!isClickable}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.45rem clamp(0.5rem, 2.5vw, 0.85rem)', borderRadius: '999px',
                    border: 'none',
                    background: isActive ? '#ea580c' : isDone ? '#ffedd5' : 'transparent',
                    color: isActive ? 'white' : isDone ? '#7c2d12' : '#9ca3af',
                    fontWeight: 700, fontSize: 'clamp(0.75rem, 2.6vw, 0.85rem)',
                    cursor: isClickable ? 'pointer' : 'not-allowed',
                    boxShadow: isActive ? '0 4px 12px rgba(234,88,12,0.35)' : 'none',
                    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{s.emoji}</span>
                  <span className="zucca-stepper-btn-full">{s.titleFull}</span>
                  <span className="zucca-stepper-btn-short">{s.titleShort}</span>
                  {isDone && <Check size={13} strokeWidth={3} color="#16a34a" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-COLUMN LAYOUT ON DESKTOP, FULL WIDTH ON MOBILE */}
        <div className="zucca-checkout-grid">

          {/* LEFT COLUMN: FORM STEPS */}
          <div style={{ minWidth: 0, width: '100%' }}>

            {/* STEP 1: BIGLIETTI & BAMBINI */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                {/* Date Selection */}
                <div style={{
                  background: 'white',
                  borderRadius: '1.25rem',
                  padding: '1.15rem',
                  marginBottom: '1.25rem',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                  border: '1.5px solid #fed7aa'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>📅</span>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#431407' }}>
                        Scegli il giorno di partecipazione
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#9a3412' }}>
                        Il villaggio è aperto sabato 10 e domenica 11 ottobre
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedDay('10 Ottobre')}
                      style={{
                        padding: '0.75rem 0.4rem',
                        borderRadius: '1rem',
                        border: `2px solid ${selectedDay === '10 Ottobre' ? '#ea580c' : '#fed7aa'}`,
                        background: selectedDay === '10 Ottobre' ? '#fff7ed' : '#fafaf9',
                        color: selectedDay === '10 Ottobre' ? '#ea580c' : '#78350f',
                        fontWeight: 800,
                        fontSize: 'clamp(0.78rem, 3.2vw, 0.88rem)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: selectedDay === '10 Ottobre' ? '0 4px 12px rgba(234,88,12,0.15)' : 'none',
                        transition: 'all 0.2s',
                        lineHeight: 1.25,
                      }}
                    >
                      <div>🎃 Sabato 10 Ottobre</div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 650, color: selectedDay === '10 Ottobre' ? '#c2410c' : '#a8a29e', marginTop: '0.25rem' }}>
                        Zucca in Vaso & Zuccart
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDay('11 Ottobre')}
                      style={{
                        padding: '0.75rem 0.4rem',
                        borderRadius: '1rem',
                        border: `2px solid ${selectedDay === '11 Ottobre' ? '#ea580c' : '#fed7aa'}`,
                        background: selectedDay === '11 Ottobre' ? '#fff7ed' : '#fafaf9',
                        color: selectedDay === '11 Ottobre' ? '#ea580c' : '#78350f',
                        fontWeight: 800,
                        fontSize: 'clamp(0.78rem, 3.2vw, 0.88rem)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: selectedDay === '11 Ottobre' ? '0 4px 12px rgba(234,88,12,0.15)' : 'none',
                        transition: 'all 0.2s',
                        lineHeight: 1.25,
                      }}
                    >
                      <div>🎃 Domenica 11 Ottobre</div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 650, color: selectedDay === '11 Ottobre' ? '#c2410c' : '#a8a29e', marginTop: '0.25rem' }}>
                        Thriller Dance & Zuccart
                      </div>
                    </button>
                  </div>
                </div>

                {/* Tickets list - MOBILE FIRST STACKED CARDS (NO TEXT SQUEEZING) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.5rem' }}>
                  {ticketTypes.map((ticket, index) => {
                    const qty = quantities[ticket.id] || 0;
                    const disabledExtra = ticket.isExtra && totalBase === 0;

                    return (
                      <motion.div
                        key={ticket.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        whileHover={disabledExtra ? {} : { scale: 1.01 }}
                        style={{
                          background: qty > 0 ? '#fff7ed' : 'white',
                          border: `2px solid ${qty > 0 ? '#ea580c' : '#f3f4f6'}`,
                          borderRadius: '1.25rem',
                          padding: '1.1rem 1.15rem',
                          boxShadow: qty > 0 ? '0 8px 25px rgba(234,88,12,0.18)' : '0 4px 15px rgba(0,0,0,0.04)',
                          transition: 'all 0.2s',
                          cursor: disabledExtra ? 'not-allowed' : 'pointer',
                          opacity: disabledExtra ? 0.6 : 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                        onClick={() => {
                          if (disabledExtra) return;
                          if (qty === 0) setQty(ticket.id, 1);
                        }}
                      >
                        {/* Top Row: Icon + Title on Left, Price on Right */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                            <div style={{
                              fontSize: '1.6rem',
                              background: qty > 0 ? '#ea580c' : '#fefce8',
                              width: 44, height: 44, borderRadius: '0.85rem', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: qty > 0 ? 'none' : 'inset 0 2px 4px rgba(0,0,0,0.05)',
                              transform: qty > 0 ? 'rotate(-6deg)' : 'none',
                              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}>
                              <TicketEmoji emoji={ticket.emoji} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, color: '#431407', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', lineHeight: 1.25 }}>
                                <span>{ticket.label}</span>
                                {ticket.isExtra && (
                                  <span style={{ fontSize: '0.68rem', background: '#f97316', color: 'white', padding: '0.1rem 0.45rem', borderRadius: '1rem', fontWeight: 800, letterSpacing: '0.04em' }}>EXTRA</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span style={{ color: '#ea580c', fontWeight: 900, fontSize: '1.3rem', lineHeight: 1 }}>€{ticket.price}</span>
                            <div style={{ color: '#9a3412', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '1px' }}>contributo</div>
                          </div>
                        </div>

                        {/* Middle Row: Description across FULL CARD WIDTH (never squeezed!) */}
                        <div style={{
                          color: disabledExtra ? '#c2410c' : '#9a3412',
                          fontSize: '0.84rem',
                          fontWeight: 500,
                          lineHeight: 1.45,
                          padding: '0 0.1rem'
                        }}>
                          {disabledExtra ? '⚠️ Richiede almeno un biglietto d\'ingresso' : ticket.description}
                        </div>

                        {ticket.isExtra && (
                          <div style={{ marginTop: '-0.25rem', padding: '0 0.1rem' }}>
                            <span style={{
                              background: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #fed7aa',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '999px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}>
                              🎃 1 sola zucca inclusa per biglietto
                            </span>
                          </div>
                        )}

                        {/* Bottom Row: Quantity Stepper Controls */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.65rem',
                          borderTop: '1px solid rgba(254, 215, 170, 0.5)',
                          marginTop: '0.1rem'
                        }} onClick={e => e.stopPropagation()}>
                          <span style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: 700 }}>
                            {qty > 0 ? `${qty} ${qty === 1 ? 'selezionato' : 'selezionati'}` : 'Seleziona quantità'}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <motion.button
                              type="button"
                              onClick={() => setQty(ticket.id, -1)}
                              disabled={qty === 0}
                              whileTap={{ scale: 0.9 }}
                              style={{
                                width: 36, height: 36, borderRadius: '50%',
                                border: 'none',
                                background: qty > 0 ? '#fdba74' : '#f3f4f6',
                                color: qty > 0 ? '#7c2d12' : '#9ca3af',
                                cursor: qty > 0 ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                              aria-label={`Riduci quantità ${ticket.label}`}
                            >
                              <Minus size={18} strokeWidth={3} />
                            </motion.button>

                            <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#431407', minWidth: '1.6rem', textAlign: 'center' }}>
                              {qty}
                            </span>

                            <motion.button
                              type="button"
                              onClick={() => setQty(ticket.id, 1)}
                              disabled={disabledExtra}
                              whileTap={disabledExtra ? {} : { scale: 0.9 }}
                              style={{
                                width: 36, height: 36, borderRadius: '50%',
                                border: 'none',
                                background: disabledExtra ? '#d1d5db' : '#ea580c',
                                color: 'white',
                                cursor: disabledExtra ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: disabledExtra ? 'none' : '0 3px 8px rgba(234,88,12,0.4)',
                              }}
                              aria-label={`Aumenta quantità ${ticket.label}`}
                            >
                              <Plus size={18} strokeWidth={3} />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  <div style={{
                    background: '#fff7ed', border: '1px solid #fed7aa',
                    padding: '0.85rem 1rem', borderRadius: '1rem',
                    display: 'flex', gap: '0.6rem', alignItems: 'flex-start'
                  }}>
                    <AlertCircle size={18} color="#ea580c" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ color: '#9a3412', fontSize: '0.84rem', lineHeight: 1.45, margin: 0, fontWeight: 500 }}>
                      <strong>Nota:</strong> {content.tickets.disclaimer}
                    </p>
                  </div>

                  {errors.tickets && (
                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                      style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0, fontWeight: 700 }}>
                      <AlertCircle size={16} /> {errors.tickets}
                    </motion.p>
                  )}
                </div>

                {/* CHILDREN STEPPER & 1-TAP PRESETS (WHEN ENTRANCE SELECTED) */}
                {totalBase > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid white',
                      borderRadius: '1.25rem',
                      padding: '1.25rem',
                      marginBottom: '1.5rem',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 800, color: '#431407', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          👶 Biglietti per Bambini
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#9a3412', fontWeight: 500 }}>
                          Quanti dei <strong>{totalBase} {totalBase === 1 ? 'biglietto' : 'biglietti'}</strong> sono per bambini?
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <motion.button
                          type="button"
                          onClick={() => setNumChildren(prev => Math.max(0, prev - 1))}
                          disabled={numChildren === 0}
                          whileTap={{ scale: 0.9 }}
                          style={{
                            width: 36, height: 36, borderRadius: '50%', border: 'none',
                            background: numChildren > 0 ? '#fdba74' : '#f3f4f6',
                            color: numChildren > 0 ? '#7c2d12' : '#9ca3af',
                            cursor: numChildren > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Minus size={16} strokeWidth={3} />
                        </motion.button>
                        <span style={{ fontWeight: 900, fontSize: '1.25rem', color: '#431407', minWidth: '1.8rem', textAlign: 'center' }}>
                          {numChildren}
                        </span>
                        <motion.button
                          type="button"
                          onClick={() => setNumChildren(prev => Math.min(totalBase, prev + 1))}
                          disabled={numChildren >= totalBase}
                          whileTap={numChildren < totalBase ? { scale: 0.9 } : {}}
                          style={{
                            width: 36, height: 36, borderRadius: '50%', border: 'none',
                            background: numChildren < totalBase ? '#ea580c' : '#d1d5db',
                            color: 'white',
                            cursor: numChildren < totalBase ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: numChildren < totalBase ? '0 3px 8px rgba(234,88,12,0.3)' : 'none',
                          }}
                        >
                          <Plus size={16} strokeWidth={3} />
                        </motion.button>
                      </div>
                    </div>

                    {/* 1-TAP PRESETS */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid #ffedd5' }}>
                      <span style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: 600, alignSelf: 'center', marginRight: '0.2rem' }}>Scelta rapida:</span>
                      <button
                        type="button"
                        onClick={() => setNumChildren(0)}
                        style={{
                          padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #fed7aa',
                          fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                          background: numChildren === 0 ? '#ea580c' : '#ffffff',
                          color: numChildren === 0 ? 'white' : '#7c2d12',
                          transition: 'all 0.15s'
                        }}
                      >
                        Solo Adulti (0)
                      </button>
                      {totalBase >= 1 && (
                        <button
                          type="button"
                          onClick={() => setNumChildren(1)}
                          style={{
                            padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #fed7aa',
                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                            background: numChildren === 1 ? '#ea580c' : '#ffffff',
                            color: numChildren === 1 ? 'white' : '#7c2d12',
                            transition: 'all 0.15s'
                          }}
                        >
                          1 Bimbo
                        </button>
                      )}
                      {totalBase >= 2 && (
                        <button
                          type="button"
                          onClick={() => setNumChildren(2)}
                          style={{
                            padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #fed7aa',
                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                            background: numChildren === 2 ? '#ea580c' : '#ffffff',
                            color: numChildren === 2 ? 'white' : '#7c2d12',
                            transition: 'all 0.15s'
                          }}
                        >
                          2 Bimbi
                        </button>
                      )}
                      {totalBase >= 1 && numChildren !== totalBase && (
                        <button
                          type="button"
                          onClick={() => setNumChildren(totalBase)}
                          style={{
                            padding: '0.25rem 0.65rem', borderRadius: '999px', border: '1px solid #fed7aa',
                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                            background: numChildren === totalBase ? '#ea580c' : '#ffffff',
                            color: numChildren === totalBase ? 'white' : '#7c2d12',
                            transition: 'all 0.15s'
                          }}
                        >
                          Tutti Bimbi ({totalBase})
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 1 NEXT BUTTON */}
                {totalBase > 0 && (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setStep(2);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%', padding: '1.1rem',
                      background: '#ea580c', color: 'white',
                      border: 'none', borderRadius: '1rem',
                      fontSize: '1.05rem', fontWeight: 900, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                      boxShadow: '0 6px 20px rgba(234,88,12,0.35)',
                    }}
                  >
                    Scegli i Laboratori Gratuiti (2/3) <ArrowRight size={20} strokeWidth={3} />
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* STEP 2: LABORATORI GRATUITI */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                <div style={{
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid white',
                  borderRadius: '1.5rem', padding: '1.5rem', marginBottom: '1.5rem',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem', fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🎨 Laboratori e Attività Gratuite
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#7c2d12', margin: 0, fontWeight: 500 }}>
                      Tutte le attività sono gratuite ed incluse! Seleziona quelle a cui desiderate partecipare per aiutarci ad organizzare materiali e posti.
                    </p>
                  </div>

                  {/* Target Selector when there is a mix of adults and children */}
                  {numChildren > 0 && numChildren < totalBase && (
                    <div style={{
                      background: '#fff7ed',
                      border: '1.5px solid #fed7aa',
                      borderRadius: '1.25rem',
                      padding: '0.85rem 1rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#9a3412' }}>
                        Destinatari dei laboratori:
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setActivityTarget('children')}
                          style={{
                            padding: '0.5rem 0.5rem',
                            borderRadius: '999px',
                            border: 'none',
                            fontSize: 'clamp(0.72rem, 2.5vw, 0.8rem)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: activityTarget === 'children' ? '#ea580c' : '#ffffff',
                            color: activityTarget === 'children' ? 'white' : '#7c2d12',
                            boxShadow: activityTarget === 'children' ? '0 2px 8px rgba(234,88,12,0.3)' : 'none',
                            transition: 'all 0.15s',
                            textAlign: 'center',
                          }}
                        >
                          👶 Solo Bimbi ({numChildren})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivityTarget('all')}
                          style={{
                            padding: '0.5rem 0.5rem',
                            borderRadius: '999px',
                            border: 'none',
                            fontSize: 'clamp(0.72rem, 2.5vw, 0.8rem)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: activityTarget === 'all' ? '#ea580c' : '#ffffff',
                            color: activityTarget === 'all' ? 'white' : '#7c2d12',
                            boxShadow: activityTarget === 'all' ? '0 2px 8px rgba(234,88,12,0.3)' : 'none',
                            transition: 'all 0.15s',
                            textAlign: 'center',
                          }}
                        >
                          👥 Tutti ({totalBase})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* VISUAL INTERACTIVE ACTIVITY CARDS - STACKED FOR MOBILE */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {freeActivities.map(act => {
                      const isSaturdayOnly = act.id === 'zucca_vaso';
                      const isSundayOnly = act.id === 'facepainting';
                      const isDayDisabled = (selectedDay === '10 Ottobre' && isSundayOnly) || (selectedDay === '11 Ottobre' && isSaturdayOnly);
                      const isSelected = selectedActivities.includes(act.id);
                      const icon = getActivityIcon(act);
                      const participantCount = numChildren > 0 && numChildren < totalBase && activityTarget === 'children'
                        ? numChildren
                        : (numChildren > 0 ? (activityTarget === 'children' ? numChildren : totalBase) : totalBase);

                      // Timing schedule badge
                      let schedulePill = '🕒 Sempre aperto (Sabato & Domenica)';
                      let schedulePillBg = '#fef3c7';
                      let schedulePillColor = '#92400e';

                      if (isSaturdayOnly) {
                        schedulePill = '🕒 Sabato 14:30 - 16:30 (Max 60 posti)';
                        schedulePillBg = '#ffedd5';
                        schedulePillColor = '#c2410c';
                      } else if (isSundayOnly) {
                        schedulePill = '🕒 Domenica 14:30 - 16:00';
                        schedulePillBg = '#ffedd5';
                        schedulePillColor = '#c2410c';
                      }

                      return (
                        <motion.div
                          key={act.id}
                          whileHover={!isDayDisabled ? { scale: 1.01 } : {}}
                          whileTap={!isDayDisabled ? { scale: 0.99 } : {}}
                          onClick={() => {
                            if (!isDayDisabled) {
                              toggleActivity(act.id);
                            }
                          }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                            cursor: isDayDisabled ? 'not-allowed' : 'pointer',
                            padding: '1rem 1.15rem',
                            borderRadius: '1.25rem',
                            background: isDayDisabled
                              ? '#fafaf9'
                              : isSelected
                              ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
                              : '#ffffff',
                            border: `2px solid ${
                              isDayDisabled
                                ? '#e7e5e4'
                                : isSelected
                                ? '#ea580c'
                                : '#f3f4f6'
                            }`,
                            opacity: isDayDisabled ? 0.65 : 1,
                            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            boxShadow: isDayDisabled
                              ? 'none'
                              : isSelected
                              ? '0 6px 20px rgba(234,88,12,0.14)'
                              : '0 2px 8px rgba(0,0,0,0.02)',
                          }}
                        >
                          {/* Top row: Icon + Title + Schedule badge on left, Badge & Checkbox / Disabled pill on right */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                              <div style={{
                                width: 38, height: 38, borderRadius: '0.8rem', flexShrink: 0,
                                background: isDayDisabled ? '#e7e5e4' : isSelected ? '#ea580c' : '#fff7ed',
                                color: isDayDisabled ? '#78716c' : isSelected ? 'white' : '#ea580c',
                                fontSize: '1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transform: isSelected && !isDayDisabled ? 'rotate(-6deg)' : 'none',
                                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              }}>
                                {icon}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: isDayDisabled ? '#78716c' : '#431407', fontSize: '0.98rem', lineHeight: 1.25 }}>
                                  {act.label}
                                </div>
                                <div style={{ marginTop: '0.2rem' }}>
                                  <span style={{
                                    background: isDayDisabled ? '#f3f4f6' : schedulePillBg,
                                    color: isDayDisabled ? '#78716c' : schedulePillColor,
                                    fontSize: '0.72rem',
                                    fontWeight: 750,
                                    padding: '0.18rem 0.55rem',
                                    borderRadius: '999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                  }}>
                                    {schedulePill}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                              {isDayDisabled ? (
                                <span style={{
                                  background: '#fee2e2', color: '#991b1b',
                                  fontSize: '0.72rem', fontWeight: 800, padding: '0.25rem 0.6rem',
                                  borderRadius: '999px', whiteSpace: 'nowrap'
                                }}>
                                  {isSaturdayOnly ? 'Solo Sabato' : 'Solo Domenica'}
                                </span>
                              ) : (
                                <>
                                  {isSelected && (
                                    <span style={{
                                      background: '#ea580c', color: 'white',
                                      fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.55rem',
                                      borderRadius: '999px', whiteSpace: 'nowrap'
                                    }}>
                                      {participantCount} {participantCount === 1 ? 'iscritto' : 'iscritti'}
                                    </span>
                                  )}
                                  <div style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    border: `2px solid ${isSelected ? '#ea580c' : '#d1d5db'}`,
                                    background: isSelected ? '#ea580c' : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s', flexShrink: 0,
                                  }}>
                                    {isSelected && <Check size={14} strokeWidth={3} color="white" />}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Bottom: Details across FULL WIDTH or Day restriction note */}
                          {isDayDisabled ? (
                            <div style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600, background: '#fef2f2', padding: '0.45rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #fecaca' }}>
                              ⚠️ Questa attività si svolge esclusivamente <strong>{isSaturdayOnly ? 'Sabato 10 Ottobre (14:30 - 16:30)' : 'Domenica 11 Ottobre (14:30 - 16:00)'}</strong>. Per selezionarla, torna allo Step 1 e cambia la data di partecipazione.
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.82rem', color: '#9a3412', lineHeight: 1.45, fontWeight: 500, paddingLeft: '0.1rem' }}>
                              {act.details}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* NAVIGATION BUTTONS STEP 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      padding: '0.9rem', background: '#ffedd5', color: '#7c2d12',
                      border: 'none', borderRadius: '1rem',
                      fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                    }}
                  >
                    <ArrowLeft size={16} /> Biglietti
                  </button>
                  <motion.button
                    type="button"
                    onClick={() => proceedToStep3()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      padding: '0.9rem', background: '#ea580c', color: 'white',
                      border: 'none', borderRadius: '1rem',
                      fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      boxShadow: '0 6px 20px rgba(234,88,12,0.35)'
                    }}
                  >
                    Vai ai Dati (3/3) <ArrowRight size={18} strokeWidth={3} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: DATI PERSONALI & PROMO */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
              >
                {/* Personal Data Form */}
                <div style={{
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid white',
                  borderRadius: '1.5rem', padding: 'clamp(1rem, 3.5vw, 1.5rem)', marginBottom: '1rem',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.03)',
                }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🧑 I tuoi Dati di Contatto
                  </h3>
                  <div className="zucca-form-grid">
                    {[
                      { key: 'nome', type: 'text', placeholder: 'Nome', emoji: '🧑', autoComplete: 'given-name' },
                      { key: 'cognome', type: 'text', placeholder: 'Cognome', emoji: '🧑', autoComplete: 'family-name' },
                      { key: 'email', type: 'email', placeholder: 'Email per i biglietti', emoji: '📧', autoComplete: 'email' },
                      { key: 'telefono', type: 'tel', placeholder: 'Cellulare', emoji: '📱', autoComplete: 'tel', inputMode: 'tel' as const },
                    ].map(field => (
                      <div key={field.key} style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '0.95rem', left: '0.95rem', fontSize: '1rem', pointerEvents: 'none' }}>
                          {field.emoji}
                        </span>
                        <input
                          type={field.type}
                          autoComplete={field.autoComplete}
                          {...(field.inputMode ? { inputMode: field.inputMode } : {})}
                          placeholder={field.placeholder}
                          value={(form as any)[field.key]}
                          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                          style={{
                            ...inputStyle,
                            paddingLeft: '2.75rem',
                            fontSize: '16px', // Prevents iOS Safari zoom-in
                            borderColor: errors[field.key] ? '#ef4444' : 'transparent',
                            boxShadow: errors[field.key] ? '0 0 0 3px rgba(239,68,68,0.2)' : inputStyle.boxShadow,
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ea580c'; }}
                          onBlur={(e) => { e.target.style.borderColor = errors[field.key] ? '#ef4444' : 'transparent'; }}
                        />
                        {errors[field.key] && <p style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.25rem', margin: '0.25rem 0 0', fontWeight: 600 }}>{errors[field.key]}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* COLLAPSIBLE PROMO CODE */}
                <div style={{
                  background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(254, 215, 170, 0.8)',
                  borderRadius: '1.25rem', padding: '0.9rem 1.15rem', marginBottom: '1.25rem',
                }}>
                  {!showPromo && !discountData ? (
                    <button
                      type="button"
                      onClick={() => setShowPromo(true)}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        color: '#ea580c', fontSize: '0.85rem', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                      }}
                    >
                      <Tag size={16} /> Hai un codice sconto o convenzione?
                    </button>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{ position: 'absolute', top: '0.85rem', left: '0.85rem', color: '#ea580c', pointerEvents: 'none' }}>
                            <Tag size={16} />
                          </span>
                          <input
                            type="text" placeholder="CODICE SCONTO"
                            value={discountCode}
                            onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountData(null); setDiscountError(''); }}
                            style={{ ...inputStyle, padding: '0.8rem 0.8rem 0.8rem 2.5rem', fontSize: '16px', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                          />
                        </div>
                        <button type="button" onClick={handleCheckDiscount}
                          disabled={checkingDiscount || !discountCode.trim()}
                          style={{
                            padding: '0 1.15rem', borderRadius: '0.85rem', border: 'none',
                            background: '#fdba74', color: '#7c2d12', cursor: 'pointer', fontWeight: 800, fontSize: '0.88rem',
                          }}>
                          {checkingDiscount ? <Loader2 size={16} className="animate-spin" /> : 'Verifica'}
                        </button>
                      </div>
                      {discountData && <p style={{ color: '#16a34a', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', margin: '0.5rem 0 0' }}><CheckCircle size={15} /> Sconto attivato (-€{discount.toFixed(2)})</p>}
                      {discountError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', margin: '0.5rem 0 0' }}><X size={15} /> {discountError}</p>}
                    </div>
                  )}
                </div>

                {/* NAVIGATION BUTTONS STEP 3 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <motion.button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={submitting}
                    whileHover={!submitting ? { scale: 1.01 } : {}}
                    whileTap={!submitting ? { scale: 0.98 } : {}}
                    style={{
                      width: '100%', padding: '1.1rem',
                      background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                      color: 'white', border: 'none', borderRadius: '1rem',
                      fontSize: '1.05rem', fontWeight: 900,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                      boxShadow: '0 8px 25px rgba(234,88,12,0.3)',
                      opacity: submitting ? 0.85 : 1,
                    }}
                  >
                    {submitting ? <><Loader2 size={20} className="animate-spin" /> Elaborazione in corso...</>
                      : total === 0 ? <><CheckCircle size={20} /> Conferma Prenotazione Gratis</>
                        : <>Procedi al Pagamento (Nexi) <ArrowRight size={20} strokeWidth={3} /></>}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={{
                      padding: '0.8rem 1rem', background: '#ffedd5', color: '#7c2d12',
                      border: 'none', borderRadius: '1rem',
                      fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                    }}
                  >
                    <ArrowLeft size={16} /> Modifica Scelta Laboratori
                  </button>
                </div>
              </motion.div>
            )}
          </div>


          {/* RIGHT COLUMN: FESTIVAL TICKET RECEIPT & CHECKOUT (STICKY ON DESKTOP) */}
          <div style={{ position: 'sticky', top: '2rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              color: 'white',
              borderRadius: '1.5rem',
              padding: 'clamp(1.25rem, 3.5vw, 1.75rem)',
              boxShadow: '0 15px 40px rgba(234,88,12,0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Decorative ticket header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>
                    Riepilogo Ordine
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>🎃 Zuccaland 2026</div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '0.6rem', padding: '0.25rem 0.55rem',
                  fontSize: '0.75rem', fontWeight: 800
                }}>
                  {totalBase} {totalBase === 1 ? 'Ingresso' : 'Ingressi'}
                </div>
              </div>

              {/* Order breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {ticketTypes.filter(t => (quantities[t.id] || 0) > 0).length === 0 ? (
                  <div style={{ fontSize: '0.88rem', opacity: 0.8, fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
                    Nessun biglietto selezionato. Seleziona almeno un ingresso per continuare.
                  </div>
                ) : (
                  ticketTypes.filter(t => (quantities[t.id] || 0) > 0).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: 600, opacity: 0.95, gap: '0.5rem' }}>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {quantities[t.id]}× {t.label} {t.isExtra ? '(1 zucca/cad.)' : ''}
                      </span>
                      <span style={{ flexShrink: 0 }}>€{(quantities[t.id] * t.price).toFixed(2)}</span>
                    </div>
                  ))
                )}

                {hasYouPickLab && (
                  <div style={{ fontSize: '0.73rem', color: '#ffedd5', background: 'rgba(0,0,0,0.18)', padding: '0.35rem 0.6rem', borderRadius: '0.5rem', marginTop: '0.15rem' }}>
                    🎃 Ogni You Pick Lab include <strong>1 sola zucca</strong> da intagliare o dipingere.
                  </div>
                )}

                {numChildren > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, color: '#fef08a', marginTop: '0.15rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(254,240,138,0.5)' }}>
                    <span>👶 Biglietti Bambini:</span>
                    <span>{numChildren} di {totalBase}</span>
                  </div>
                )}

                {selectedActivities.length > 0 && (
                  <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px dashed rgba(255,255,255,0.25)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fef08a', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>🎨 Laboratori scelti ({selectedActivities.length}):</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '0.5rem' }}>
                      {selectedActivities.map(actId => {
                        const act = freeActivities.find(a => a.id === actId);
                        return (
                          <div key={actId} style={{ fontSize: '0.8rem', opacity: 0.95, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>•</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act?.label || actId}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, color: '#fde047', marginTop: '0.5rem' }}>
                    <span>Sconto applicato</span><span>−€{discount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Total Row */}
              <div style={{ borderTop: '2px dashed rgba(255,255,255,0.3)', paddingTop: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', display: 'block' }}>Totale</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>Contributo evento</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: '2.25rem', lineHeight: 1 }}>€{total.toFixed(2)}</span>
              </div>

              {/* Main Action Button */}
              {step === 1 ? (
                <motion.button
                  type="button"
                  onClick={() => {
                    if (totalBase === 0) setErrors({ tickets: 'Seleziona almeno un ingresso per continuare.' });
                    else { setErrors({}); setStep(2); }
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={totalBase === 0}
                  style={{
                    width: '100%', padding: '1.1rem',
                    background: totalBase > 0 ? 'white' : '#fdba74',
                    color: totalBase > 0 ? '#ea580c' : '#7c2d12',
                    border: 'none', borderRadius: '1rem',
                    fontSize: '1.05rem', fontWeight: 900,
                    cursor: totalBase > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                    opacity: totalBase > 0 ? 1 : 0.7,
                  }}
                >
                  Continua (Step 2) <ArrowRight size={18} strokeWidth={3} />
                </motion.button>
              ) : step === 2 ? (
                <motion.button
                  type="button"
                  onClick={() => proceedToStep3()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%', padding: '1.1rem',
                    background: 'white', color: '#ea580c',
                    border: 'none', borderRadius: '1rem',
                    fontSize: '1.05rem', fontWeight: 900, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
                  }}
                >
                  Inserisci i Dati (Step 3) <ArrowRight size={18} strokeWidth={3} />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  whileHover={!submitting ? { scale: 1.02 } : {}}
                  whileTap={!submitting ? { scale: 0.98 } : {}}
                  style={{
                    width: '100%', padding: '1.15rem',
                    background: 'white', color: '#ea580c',
                    border: 'none', borderRadius: '1rem',
                    fontSize: '1.08rem', fontWeight: 900,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                    opacity: submitting ? 0.85 : 1,
                  }}
                >
                  {submitting ? <><Loader2 size={20} className="animate-spin" /> Elaborazione in corso...</>
                    : total === 0 ? <><CheckCircle size={20} /> Conferma Prenotazione Gratis</>
                      : <>Paga con Nexi <ArrowRight size={20} strokeWidth={3} /></>}
                </motion.button>
              )}

              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', margin: '0.85rem 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontWeight: 600 }}>
                <ShieldCheck size={14} /> Pagamento 100% sicuro con Nexi
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* MOBILE STICKY BOTTOM CHECKOUT BAR (HIDDEN ON DESKTOP) */}
      {totalBase > 0 && (
        <div
          className="zucca-mobile-bottom-bar"
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid #fed7aa',
            padding: '0.75rem 1rem max(0.75rem, env(safe-area-inset-bottom))',
            zIndex: 90,
            boxShadow: '0 -4px 25px rgba(0,0,0,0.12)',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: '#9a3412', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {totalBase} {totalBase === 1 ? 'biglietto' : 'biglietti'} {numChildren > 0 ? `(${numChildren} bimbi)` : ''}
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ea580c', lineHeight: 1.1 }}>
              €{total.toFixed(2)}
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  background: '#ea580c', color: 'white', border: 'none',
                  borderRadius: '0.85rem', padding: '0.7rem 1.15rem',
                  fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  boxShadow: '0 4px 12px rgba(234,88,12,0.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                Laboratori (2/3) <ArrowRight size={15} />
              </button>
            ) : step === 2 ? (
              <button
                type="button"
                onClick={() => proceedToStep3()}
                style={{
                  background: '#ea580c', color: 'white', border: 'none',
                  borderRadius: '0.85rem', padding: '0.7rem 1.15rem',
                  fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  boxShadow: '0 4px 12px rgba(234,88,12,0.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                Dati (3/3) <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting}
                style={{
                  background: '#ea580c', color: 'white', border: 'none',
                  borderRadius: '0.85rem', padding: '0.7rem 1.15rem',
                  fontSize: '0.88rem', fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  boxShadow: '0 4px 12px rgba(234,88,12,0.3)',
                  opacity: submitting ? 0.8 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Paga Nexi</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTIVITY & YOU PICK LAB REMINDER POPUP MODAL */}
      <AnimatePresence>
        {showActivityReminderModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              background: 'rgba(20, 10, 5, 0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={() => setShowActivityReminderModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.35, bounce: 0.3 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '540px',
                background: 'linear-gradient(135deg, #ffffff 0%, #fffbf5 100%)',
                borderRadius: '1.5rem',
                padding: 'clamp(1.25rem, 4vw, 2rem)',
                border: '2px solid #fed7aa',
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowActivityReminderModal(false)}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  background: '#ffedd5',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#7c2d12',
                  transition: 'background 0.2s',
                }}
                aria-label="Chiudi popup"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#ea580c',
                    color: 'white',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '0.35rem 0.9rem',
                    borderRadius: '999px',
                    marginBottom: '0.75rem',
                    boxShadow: '0 4px 12px rgba(234,88,12,0.3)',
                  }}
                >
                  <Sparkles size={14} /> Esperienze & Laboratori
                </div>
                <h3
                  style={{
                    margin: '0 0 0.5rem',
                    fontSize: '1.45rem',
                    fontWeight: 900,
                    color: '#431407',
                    lineHeight: 1.25,
                  }}
                >
                  Non perderti le attività di Zuccaland!
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#7c2d12', opacity: 0.9, lineHeight: 1.4 }}>
                  Prima di completare la prenotazione, ricorda che puoi partecipare alle attività del villaggio:
                </p>
              </div>

              {/* Reminder Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.5rem' }}>

                {/* 1. FREE ACTIVITIES */}
                <div
                  style={{
                    background: hasFreeActivities ? '#f0fdf4' : '#fff7ed',
                    border: `1.5px solid ${hasFreeActivities ? '#bbf7d0' : '#fdba74'}`,
                    borderRadius: '1.25rem',
                    padding: '1.1rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.35rem' }}>🎨</span>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#431407' }}>
                        Laboratori Gratuiti Inclusi
                      </h4>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: hasFreeActivities ? '#16a34a' : '#ea580c', fontWeight: 800, background: hasFreeActivities ? '#dcfce7' : '#ffedd5', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                      {hasFreeActivities ? `✅ ${selectedActivities.length} selezionati` : '⚠️ Nessuna scelta'}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.83rem', color: '#7c2d12', lineHeight: 1.4 }}>
                    I laboratori (<em>Zucca in Vaso</em>, <em>Zuccart</em>, <em>Facepainting & Dance</em>) sono <strong>già inclusi nel prezzo del biglietto</strong>.
                  </p>

                  {!hasFreeActivities ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowActivityReminderModal(false);
                        setStep(2);
                      }}
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: '0.25rem',
                        padding: '0.5rem 1rem',
                        background: '#ea580c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 3px 10px rgba(234,88,12,0.25)',
                      }}
                    >
                      🎨 Scegli Laboratori Gratuiti (Step 2) <ArrowRight size={14} />
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                      {selectedActivities.map(id => (
                        <span
                          key={id}
                          style={{
                            background: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                          }}
                        >
                          {freeActivities.find(a => a.id === id)?.label || id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. YOU PICK LAB */}
                {youPickLabTicket && (
                  <div
                    style={{
                      background: hasYouPickLab ? '#f0fdf4' : '#fff7ed',
                      border: `1.5px solid ${hasYouPickLab ? '#bbf7d0' : '#fed7aa'}`,
                      borderRadius: '1.25rem',
                      padding: '1.1rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.35rem' }}>🎃</span>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#431407' }}>
                          You Pick Lab (+€3)
                        </h4>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: hasYouPickLab ? '#16a34a' : '#c2410c', fontWeight: 800, background: hasYouPickLab ? '#dcfce7' : '#ffedd5', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                        {hasYouPickLab ? `✅ ${youPickLabQty} ${youPickLabQty === 1 ? 'zucca' : 'zucche'}` : '💡 Opzionale'}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.83rem', color: '#7c2d12', lineHeight: 1.4 }}>
                      Scegli la tua vera zucca direttamente nel campo, intagliala o decorala e <strong>portala a casa</strong>!
                    </p>

                    <div style={{ fontSize: '0.76rem', color: '#c2410c', fontWeight: 700, background: '#fff7ed', padding: '0.35rem 0.65rem', borderRadius: '0.6rem', border: '1px solid #fed7aa' }}>
                      ⚠️ <strong>Nota:</strong> Ogni acquisto di You Pick Lab dà diritto ad <strong>una sola zucca</strong> da intagliare o dipingere.
                    </div>

                    {!hasYouPickLab ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setQty(youPickLabTicket.id, 1);
                          }}
                          style={{
                            padding: '0.55rem 1rem',
                            background: '#ea580c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 3px 10px rgba(234,88,12,0.25)',
                          }}
                        >
                          <Plus size={15} strokeWidth={3} /> Aggiungi 1 You Pick Lab (+€3)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowActivityReminderModal(false);
                            setStep(1);
                          }}
                          style={{
                            padding: '0.55rem 0.85rem',
                            background: '#ffedd5',
                            color: '#7c2d12',
                            border: 'none',
                            borderRadius: '0.75rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Scegli quantità (Step 1)
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '0.45rem 0.85rem', borderRadius: '0.75rem', border: '1px solid #bbf7d0' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#15803d' }}>
                          Quantità aggiunta: {youPickLabQty} di {totalBase} max
                        </span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => setQty(youPickLabTicket.id, -1)}
                            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            aria-label="Riduci quantità You Pick"
                          >
                            <Minus size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={youPickLabQty >= totalBase}
                            onClick={() => setQty(youPickLabTicket.id, 1)}
                            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: youPickLabQty < totalBase ? '#ea580c' : '#e5e7eb', color: 'white', cursor: youPickLabQty < totalBase ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            aria-label="Aumenta quantità You Pick"
                          >
                            <Plus size={13} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setReminderDismissed(true);
                    setShowActivityReminderModal(false);
                    if (step < 3) {
                      setStep(3);
                    } else {
                      handleSubmit(undefined, true);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: '#431407',
                    color: 'white',
                    border: 'none',
                    borderRadius: '1.25rem',
                    fontWeight: 800,
                    fontSize: '0.98rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 6px 20px rgba(67,20,7,0.25)',
                  }}
                >
                  {hasFreeActivities && hasYouPickLab ? 'Perfetto, Procedi ai Dati (Step 3) ➔' : 'Continua comunque al Checkout ➔'}
                </motion.button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ─── Concluded Section ────────────────────────────────────────────────────────

function ConcludedSection() {
  return (
    <div id="acquista" style={{
      padding: '6rem 1.5rem',
      background: 'linear-gradient(180deg, #f5f3ff 0%, #ede9fe 50%, #fff7ed 100%)',
      position: 'relative', zIndex: 2, textAlign: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', bounce: 0.4 }}
        style={{ maxWidth: '600px', margin: '0 auto' }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎃💜</div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          background: 'linear-gradient(135deg, #7c3aed, #ea580c)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 1rem',
        }}>
          Grazie a Tutti!
        </h2>
        <p style={{ color: '#7c2d12', fontSize: '1.1rem', lineHeight: 1.7, fontWeight: 500 }}>
          L'edizione di quest'anno si è conclusa con grande successo. 
          Grazie a tutti i partecipanti per aver reso questa giornata speciale! 
          Ci vediamo alla prossima edizione di Zuccaland! 🧡
        </p>
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            marginTop: '2rem',
            background: 'rgba(124,58,237,0.1)',
            border: '2px solid rgba(124,58,237,0.2)',
            borderRadius: '1.5rem',
            padding: '1.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#7c3aed',
            fontWeight: 700,
          }}
        >
          <Sparkles size={20} /> Segui i nostri social per le novità!
        </motion.div>
      </motion.div>
    </div>
  );
}


// ─── Main Page Component ──────────────────────────────────────────────────────

export default function ZuccalandClient({ content: rawContent }: { content: ZuccalandContent }) {
  // Merge with defaults to prevent crashes if DB row exists but is empty
  const content = useMemo(() => ({
    hero: { ...DEFAULT_ZUCCALAND_CONTENT.hero, ...(rawContent?.hero || {}) },
    event: { ...DEFAULT_ZUCCALAND_CONTENT.event, ...(rawContent?.event || {}) },
    infoCards: rawContent?.infoCards || DEFAULT_ZUCCALAND_CONTENT.infoCards,
    ticketTypes: rawContent?.ticketTypes || DEFAULT_ZUCCALAND_CONTENT.ticketTypes,
    freeActivities: rawContent?.freeActivities || DEFAULT_ZUCCALAND_CONTENT.freeActivities,
    highlights: rawContent?.highlights || DEFAULT_ZUCCALAND_CONTENT.highlights,
    program: { ...DEFAULT_ZUCCALAND_CONTENT.program, ...(rawContent?.program || {}) },
    tickets: { ...DEFAULT_ZUCCALAND_CONTENT.tickets, ...(rawContent?.tickets || {}) },
    faqs: rawContent?.faqs || DEFAULT_ZUCCALAND_CONTENT.faqs,
  }), [rawContent]);

  const [phase, setPhase] = useState<EventPhase>('on-sale');
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<'hero' | 'attivita' | 'programma' | 'info' | 'acquista'>('hero');

  useEffect(() => {
    setMounted(true);
    setPhase(getEventPhase(content.event));
    const interval = setInterval(() => setPhase(getEventPhase(content.event)), 30000);
    return () => clearInterval(interval);
  }, [content.event]);

  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = ['acquista', 'programma', 'info', 'attivita'];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 260 && rect.bottom >= 120) {
            setActiveSection(id as any);
            return;
          }
        }
      }
      setActiveSection('hero');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], [0, 300]);

  const showTickets = phase === 'on-sale';
  const showCountdown = phase === 'pre-sale';
  const showConcluded = phase === 'concluded';
  const showLive = phase === 'live';

  return (
    <div style={{ background: '#fefce8', minHeight: '100vh', color: '#431407', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Easter Egg */}
      <FallingPumpkins />

      {/* ── Redesigned Useful Sticky Navigation Bar ── */}
      <motion.nav 
        aria-label="Navigazione rapida Zuccaland"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        className="zucca-sticky-nav"
      >
        {/* Left: Home link & compact brand identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
          <Link 
            href="/" 
            style={{ 
              textDecoration: 'none', 
              color: '#ea580c', 
              fontSize: '0.8rem', 
              fontWeight: 750, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.25rem',
              padding: '0.35rem 0.6rem',
              borderRadius: '999px',
              background: 'rgba(234, 88, 12, 0.08)',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap'
            }}
            title="Torna al portale della Pro Loco"
          >
            ← <span style={{ display: 'none' }} className="sm:inline">Pro Loco</span>
          </Link>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              padding: '0.2rem 0.35rem',
              fontFamily: 'inherit',
              textAlign: 'left'
            }}
            title="Torna all'inizio della pagina"
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>🎃</span>
            <span style={{ 
              fontFamily: 'var(--font-display)', 
              fontWeight: 800, 
              fontSize: '0.92rem', 
              color: '#431407',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap'
            }}>
              Zuccaland
            </span>
          </button>

          {/* Quick Date pill */}
          <span 
            className="hidden sm:inline-flex"
            style={{
              background: 'rgba(234, 88, 12, 0.1)',
              color: '#c2410c',
              fontSize: '0.72rem',
              fontWeight: 750,
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              whiteSpace: 'nowrap'
            }}
          >
            10-11 Ott
          </span>
        </div>

        {/* Center: Real Useful Navigation Anchors */}
        <div className="zucca-nav-links">
          <button 
            type="button"
            onClick={() => scrollToSection('attivita')} 
            className={`zucca-nav-link ${activeSection === 'attivita' ? 'active' : ''}`}
          >
            Attività
          </button>
          <button 
            type="button"
            onClick={() => scrollToSection('programma')} 
            className={`zucca-nav-link ${activeSection === 'programma' ? 'active' : ''}`}
          >
            Programma
          </button>
          <button 
            type="button"
            onClick={() => scrollToSection('info')} 
            className={`zucca-nav-link ${activeSection === 'info' ? 'active' : ''}`}
          >
            Info & Servizi
          </button>
        </div>

        {/* Right: Primary Call to Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          {showTickets && (
            <a 
              href="#acquista"
              onClick={e => { e.preventDefault(); scrollToSection('acquista'); }}
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                color: 'white',
                padding: '0.42rem clamp(0.75rem, 2vw, 1.05rem)',
                borderRadius: '999px',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 4px 14px rgba(234,88,12,0.3)',
                whiteSpace: 'nowrap',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              <Ticket size={15} />
              <span>Biglietti</span>
              <span className="hidden md:inline" style={{ fontSize: '0.74rem', opacity: 0.9, fontWeight: 600 }}>da €5</span>
            </a>
          )}

          {!showTickets && (
            <button
              type="button"
              onClick={() => scrollToSection('acquista')}
              style={{
                background: phase === 'live' ? '#22c55e' : phase === 'concluded' ? '#7c3aed' : '#ea580c',
                color: 'white',
                padding: '0.42rem 0.85rem',
                borderRadius: '999px',
                fontWeight: 800,
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                whiteSpace: 'nowrap'
              }}
            >
              {phase === 'live' ? '🔴 Live' : phase === 'concluded' ? 'Concluso' : 'Info Vendite'}
            </button>
          )}
        </div>
      </motion.nav>

      {/* Phase Banner */}
      {mounted && <PhaseBanner phase={phase} />}

      {/* ── Hero ── */}
      <section style={{
        position: 'relative',
        minHeight: '80vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(2rem, 5vh, 3.5rem) 1rem 3.5rem',
        textAlign: 'center',
        zIndex: 2,
      }}>
        {/* Parallax background blobs */}
        <motion.div style={{ y: yBg, position: 'absolute', inset: 0, zIndex: -1 }}>
          <div style={{
            position: 'absolute', top: '5%', left: '0%', width: '45vw', height: '45vw',
            background: 'radial-gradient(circle, #fef08a 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.7
          }} />
          <div style={{
            position: 'absolute', bottom: '5%', right: '0%', width: '55vw', height: '55vw',
            background: 'radial-gradient(circle, #fed7aa 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.5
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '30vw', height: '30vw',
            background: 'radial-gradient(circle, #fecaca 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(70px)', opacity: 0.25
          }} />
        </motion.div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '950px', width: '100%' }}>

          {/* Animated Logo with hover interaction */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, type: 'spring', bounce: 0.3 }}
            whileHover={{ scale: 1.03, filter: 'drop-shadow(0 25px 40px rgba(234,88,12,0.25))' }}
            style={{
              cursor: 'default',
              transition: 'filter 0.4s ease',
              filter: 'drop-shadow(0 20px 30px rgba(234,88,12,0.15))',
            }}
          >
            <Image
              src="/img/zuccaland/Logo.png"
              alt="Zuccaland"
              width={1600}
              height={500}
              unoptimized
              style={{ objectFit: 'contain', width: '100%', maxWidth: '900px' }}
              priority
            />
          </motion.div>

          {/* SEO h1 (hidden) */}
          <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            {content.hero.title}
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            style={{
              fontSize: 'clamp(1.1rem, 3.5vw, 1.65rem)',
              color: '#7c2d12',
              maxWidth: '700px',
              margin: '0.5rem auto 0',
              fontWeight: 600,
              lineHeight: 1.45,
              padding: '0 0.5rem',
            }}
          >
            {content.hero.subtitle}
          </motion.p>

          {content.hero.description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              style={{
                fontSize: 'clamp(0.92rem, 2.6vw, 1.1rem)',
                color: '#9a3412',
                maxWidth: '600px',
                margin: '0.75rem auto 0',
                lineHeight: 1.55,
                fontWeight: 500,
                padding: '0 0.5rem',
              }}
            >
              {content.hero.description}
            </motion.p>
          )}

          {/* Badge with date & location */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '1.5rem', flexWrap: 'wrap',
              marginTop: '1.25rem',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(234,88,12,0.08)', padding: '0.45rem 0.95rem', borderRadius: '999px',
            }}>
              <Calendar size={15} color="#ea580c" />
              <span style={{ color: '#9a3412', fontWeight: 700, fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                {content.hero.badge}
              </span>
            </div>
          </motion.div>

          {/* Primary CTA */}
          {showTickets && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, type: 'spring', bounce: 0.4 }}
              style={{ marginTop: '2rem' }}
            >
              <motion.a
                href="#acquista"
                onClick={e => { e.preventDefault(); document.getElementById('acquista')?.scrollIntoView({ behavior: 'smooth' }); }}
                whileHover={{ scale: 1.04, boxShadow: '0 12px 35px rgba(234,88,12,0.4)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.65rem',
                  background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                  color: 'white',
                  padding: '0.95rem clamp(1.25rem, 4vw, 2.25rem)',
                  borderRadius: '999px',
                  fontWeight: 800, fontSize: 'clamp(0.95rem, 3vw, 1.08rem)',
                  textDecoration: 'none',
                  boxShadow: '0 8px 25px rgba(234,88,12,0.35)',
                  letterSpacing: '0.02em',
                }}
              >
                <Ticket size={19} /> Acquista il tuo Biglietto <ArrowRight size={19} strokeWidth={2.5} />
              </motion.a>
              <p style={{ color: '#9a3412', fontSize: '0.82rem', fontWeight: 600, marginTop: '0.65rem', opacity: 0.85 }}>
                A partire da €{Math.min(...(content.ticketTypes.filter(t => !t.isExtra).map(t => t.price).length > 0 ? content.ticketTypes.filter(t => !t.isExtra).map(t => t.price) : [5]))} · Pagamento sicuro con Nexi
              </p>
            </motion.div>
          )}

          {/* Countdown in hero for pre-sale */}
          {showCountdown && mounted && (
            <CountdownDisplay
              targetDate={content.event.salesOpenDate}
              label="Apertura vendita biglietti tra"
            />
          )}
        </div>
      </section>

      {/* ── Info Cards Section (CMS-driven, interactive chips) ── */}
      <section id="attivita" style={{ padding: 'clamp(2.5rem, 6vh, 4rem) 1rem', position: 'relative', zIndex: 2, scrollMarginTop: '8rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.25rem' }}>
          {content.infoCards.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.15, type: 'spring', bounce: 0.4 }}
              whileHover={{ y: -6 }}
              style={{
                background: 'white',
                borderRadius: '1.5rem', padding: 'clamp(1.25rem, 3.5vw, 2rem)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
                border: '3px solid white',
                position: 'relative', overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Decorative gradient blob */}
              <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 160, height: 160, background: item.color,
                borderRadius: '50%', opacity: 0.25, filter: 'blur(35px)',
              }} />
              <div style={{
                position: 'absolute', bottom: -20, left: -20,
                width: 100, height: 100, background: item.color,
                borderRadius: '50%', opacity: 0.15, filter: 'blur(25px)',
              }} />

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem', position: 'relative', zIndex: 2 }}>
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, -5, 0], scale: 1.15 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    fontSize: '2.2rem',
                    background: `${item.color}66`,
                    width: 52, height: 52, borderRadius: '0.9rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.emoji}
                </motion.div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: '#431407', margin: 0, lineHeight: 1.2 }}>
                    {item.title}
                  </h3>
                </div>
              </div>
              
              <p style={{ color: '#7c2d12', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 1rem', fontWeight: 500, position: 'relative', zIndex: 2 }}>
                {item.description}
              </p>

              {/* Interactive chips with graceful text wrapping */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', position: 'relative', zIndex: 2, flex: 1, alignContent: 'flex-start' }}>
                {item.items.map((li, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + idx * 0.06, type: 'spring', bounce: 0.5 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    style={{
                      background: `${item.color}40`,
                      border: `1.5px solid ${item.color}80`,
                      borderRadius: '999px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem',
                      fontWeight: 650,
                      color: '#431407',
                      cursor: 'default',
                      transition: 'background 0.2s, box-shadow 0.2s',
                      lineHeight: 1.35,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = `${item.color}70`;
                      (e.target as HTMLElement).style.boxShadow = `0 4px 12px ${item.color}50`;
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = `${item.color}40`;
                      (e.target as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    {li}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      
      {/* ── Highlights (Merch & Music — discrete contextual perks) ── */}
      <section id="info" style={{ padding: '0 1rem 2.5rem', position: 'relative', zIndex: 2, scrollMarginTop: '8rem' }}>
         <div style={{ maxWidth: '780px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
            {content.highlights.map((hl, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.4 }}
                whileHover={{ y: -2, borderColor: '#fdba74', boxShadow: '0 8px 20px rgba(124, 45, 18, 0.06)' }}
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(8px)',
                  border: '1.5px solid #f1e4d3',
                  borderRadius: '1.25rem',
                  padding: '1.1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  boxShadow: '0 2px 10px rgba(124, 45, 18, 0.03)',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              >
                <div style={{
                  background: 'rgba(234, 88, 12, 0.08)',
                  color: '#c2410c',
                  width: '42px',
                  height: '42px',
                  minWidth: '42px',
                  borderRadius: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(234, 88, 12, 0.15)',
                }}>
                  {getHighlightIcon(hl.icon, 20)}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.96rem', fontWeight: 700, color: '#431407', letterSpacing: '-0.01em' }}>
                    {hl.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#7c2d12', lineHeight: 1.4, opacity: 0.85, fontWeight: 450 }}>
                    {hl.description}
                  </p>
                </div>
              </motion.div>
            ))}
         </div>
      </section>

      {/* ── Children Ticket Info Bridge ── */}
      {showTickets && (
        <section style={{ padding: '0 1rem 2.5rem', position: 'relative', zIndex: 2 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              maxWidth: '700px', margin: '0 auto',
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              borderRadius: '1.5rem',
              padding: 'clamp(1.25rem, 4vw, 2rem) clamp(1rem, 4vw, 2.5rem)',
              display: 'flex', alignItems: 'center', gap: '1.25rem',
              boxShadow: '0 15px 40px rgba(234,88,12,0.25)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 'min(100%, 240px)' }}>
              <h3 style={{ color: 'white', fontSize: 'clamp(1.15rem, 4vw, 1.3rem)', fontWeight: 800, margin: '0 0 0.5rem', fontFamily: 'var(--font-display)', lineHeight: 1.25 }}>
                Ogni visitatore ha bisogno del suo biglietto
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.86rem', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                Adulti e bambini: seleziona il numero totale di ingressi che ti serve. I laboratori gratuiti per i più piccoli potrai sceglierli nel passaggio successivo.
              </p>
            </div>
            <a
              href="#acquista"
              onClick={e => { e.preventDefault(); document.getElementById('acquista')?.scrollIntoView({ behavior: 'smooth' }); }}
              style={{
                background: 'white', color: '#ea580c',
                padding: '0.8rem 1.5rem', borderRadius: '999px',
                fontWeight: 800, fontSize: '0.92rem', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Ticket size={18} /> Acquista Biglietti <ArrowRight size={16} />
            </a>
          </motion.div>
        </section>
      )}

      {/* ── Programma Section ── */}
      <section id="programma" style={{ padding: '2rem 1rem 3.5rem', background: 'transparent', position: 'relative', zIndex: 2, scrollMarginTop: '8rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', color: '#ea580c', marginBottom: '1.5rem', lineHeight: 1.2 }}>
            {content.program.title}
          </h2>
          <div style={{
            background: '#ffedd5',
            padding: 'clamp(1.25rem, 4vw, 2.5rem)',
            borderRadius: '1.5rem',
            border: '2px dashed #fdba74',
            color: '#9a3412', fontSize: 'clamp(0.95rem, 3vw, 1.15rem)', fontWeight: 500,
            boxShadow: '0 10px 30px rgba(234,88,12,0.1)',
            textAlign: 'left',
            lineHeight: 1.6,
          }}>
            <FormattedText text={content.program.content} />
          </div>
        </div>
      </section>

      {/* ── Ticket Buyer (only on-sale) ── */}
      {showTickets && <ZuccalandTicketBuyer content={content} />}

      {/* ── Concluded Section ── */}
      {showConcluded && <ConcludedSection />}

      {/* ── Pre-sale CTA (countdown to sales) ── */}
      {showCountdown && (
        <div id="acquista" style={{
          padding: '6rem 1.5rem',
          background: 'linear-gradient(180deg, #ffedd5 0%, #fefce8 100%)',
          position: 'relative', zIndex: 2, textAlign: 'center',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ maxWidth: '600px', margin: '0 auto' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎟️</div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              color: '#431407', margin: '0 0 1rem',
            }}>
              Biglietti in arrivo!
            </h2>
            <p style={{ color: '#7c2d12', fontSize: '1.1rem', lineHeight: 1.7, fontWeight: 500, marginBottom: '2rem' }}>
              La vendita dei biglietti non è ancora aperta. Torna su questa pagina quando il countdown sarà terminato per assicurarti il tuo posto!
            </p>
            <CountdownDisplay
              targetDate={content.event.salesOpenDate}
              label="Apertura vendite tra"
            />
          </motion.div>
        </div>
      )}

      {/* ── Live CTA ── */}
      {showLive && (
        <div id="acquista" style={{
          padding: '6rem 1.5rem',
          background: 'linear-gradient(180deg, #dcfce7 0%, #fefce8 100%)',
          position: 'relative', zIndex: 2, textAlign: 'center',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', bounce: 0.4 }}
            style={{ maxWidth: '600px', margin: '0 auto' }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: '4rem', marginBottom: '1rem' }}
            >
              🎃
            </motion.div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              background: 'linear-gradient(135deg, #22c55e, #ea580c)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 1rem',
            }}>
              L'evento è in corso!
            </h2>
            <p style={{ color: '#7c2d12', fontSize: '1.1rem', lineHeight: 1.7, fontWeight: 500 }}>
              Zuccaland è aperto! Vieni a trovarci a Gasperina per vivere la magia delle zucche. I biglietti sono disponibili direttamente in loco.
            </p>
            <div style={{
              marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              color: '#16a34a', fontWeight: 700, fontSize: '1rem',
            }}>
              <MapPin size={18} /> Gasperina (CZ)
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
