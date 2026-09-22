'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, 
  Send, Loader2, Info, Ticket, Mail, Phone, User, CreditCard, FileText, Check, X 
} from 'lucide-react';
import { validateIban, formatIban } from '@/lib/validation/iban';

export default function RefundClient() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    bookingNumbers: '',
    accountHolder: '',
    iban: '',
    reason: '',
    acceptTerms: false
  });

  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cleanIban = formData.iban.replace(/[\s-]/g, '').toUpperCase();
  const isItalianIban = cleanIban.startsWith('IT') || cleanIban.length === 0;

  // Validazione approfondita IBAN in tempo reale
  const ibanValidation = useMemo(() => {
    if (!cleanIban) return null;
    return validateIban(cleanIban);
  }, [cleanIban]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.bookingNumbers.trim()) {
      setError('Compila tutti i campi obbligatori contrassegnati con l\'asterisco (*).');
      return;
    }

    if (!formData.accountHolder.trim()) {
      setError('Inserisci l\'intestatario del conto corrente su cui effettuare il bonifico.');
      return;
    }

    const ibanCheck = validateIban(formData.iban);
    if (!ibanCheck.valid) {
      setError(ibanCheck.error || 'Codice IBAN non valido. Verifica attentamente numeri e lettere.');
      return;
    }

    if (!formData.acceptTerms) {
      setError('È necessario confermare la presa visione e la veridicità dei dati inseriti.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          bookingNumbers: formData.bookingNumbers,
          accountHolder: formData.accountHolder,
          iban: ibanCheck.cleanIban,
          reason: formData.reason,
          eventSlug: 'zuccaland'
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSubmittedId(json.id);
      } else {
        setError(json.error || 'Si è verificato un errore durante l\'invio. Riprova più tardi.');
      }
    } catch (err: any) {
      setError('Errore di connessione. Verifica la connessione e riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#fefce8',
      minHeight: '100vh',
      color: '#431407',
      paddingTop: '6.5rem',
      paddingBottom: '5rem',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '1200px',
        height: '450px',
        background: 'radial-gradient(ellipse at 50% 20%, rgba(254, 215, 170, 0.6) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{
        maxWidth: '780px',
        margin: '0 auto',
        padding: '0 1.25rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Back Link */}
        <Link 
          href="/zuccaland"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#c2410c',
            fontWeight: 700,
            fontSize: '0.88rem',
            textDecoration: 'none',
            marginBottom: '1.5rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '999px',
            background: 'rgba(234, 88, 12, 0.08)',
            transition: 'background 0.2s'
          }}
        >
          <ArrowLeft size={16} /> Torna a Zuccaland
        </Link>

        <AnimatePresence mode="wait">
          {submittedId ? (
            /* Success confirmation screen */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'white',
                borderRadius: '1.75rem',
                padding: 'clamp(2rem, 5vw, 3.5rem)',
                boxShadow: '0 20px 50px rgba(234, 88, 12, 0.12)',
                border: '2px solid #fed7aa',
                textAlign: 'center'
              }}
            >
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 8px 20px rgba(22, 163, 74, 0.2)'
              }}>
                <CheckCircle2 size={40} />
              </div>

              <span style={{
                background: '#ffedd5',
                color: '#c2410c',
                padding: '0.3rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Richiesta Registrata
              </span>

              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
                color: '#431407',
                marginTop: '1rem',
                marginBottom: '0.75rem',
                lineHeight: 1.2
              }}>
                Richiesta di rimborso inviata con successo!
              </h1>

              <p style={{
                color: '#7c2d12',
                fontSize: '1.02rem',
                lineHeight: 1.6,
                maxWidth: '560px',
                margin: '0 auto 1.75rem'
              }}>
                Abbiamo preso in carico la tua pratica con identificativo:
              </p>

              <div style={{
                background: '#fff7ed',
                border: '1.5px dashed #ea580c',
                borderRadius: '1rem',
                padding: '1rem 1.5rem',
                display: 'inline-block',
                marginBottom: '2rem'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#9a3412', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Codice Pratica Rimborso
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#c2410c', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                  {submittedId}
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '1.25rem',
                padding: '1.25rem',
                textAlign: 'left',
                color: '#475569',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                marginBottom: '2rem'
              }}>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Info size={16} color="#0284c7" /> Prossimi passi:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  <li>I nostri operatori verificheranno i dati inseriti e la corrispondenza con i titoli emessi.</li>
                  <li>In caso di validazione positiva del secondo rinvio, l'accredito verrà disposto secondo la modalità prevista.</li>
                  <li>Riceverai tutti gli aggiornamenti direttamente all'indirizzo email: <strong>{formData.email}</strong>.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  href="/zuccaland"
                  style={{
                    background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                    color: 'white',
                    padding: '0.75rem 1.6rem',
                    borderRadius: '999px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)'
                  }}
                >
                  Torna all'evento Zuccaland
                </Link>
                <Link
                  href="/"
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    padding: '0.75rem 1.4rem',
                    borderRadius: '999px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    textDecoration: 'none'
                  }}
                >
                  Home Pro Loco
                </Link>
              </div>
            </motion.div>
          ) : (
            /* Refund Request Form */
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'white',
                borderRadius: '1.75rem',
                padding: 'clamp(1.5rem, 5vw, 2.75rem)',
                boxShadow: '0 20px 50px rgba(234, 88, 12, 0.08)',
                border: '1.5px solid #fed7aa'
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(234, 88, 12, 0.1)',
                  color: '#c2410c',
                  padding: '0.35rem 0.9rem',
                  borderRadius: '999px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '0.75rem'
                }}>
                  🎃 Zuccaland • Modulo Ufficiale
                </span>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.85rem, 4.5vw, 2.5rem)',
                  color: '#431407',
                  margin: '0 0 0.5rem',
                  lineHeight: 1.2
                }}>
                  Richiesta di Rimborso
                </h1>
                <p style={{
                  color: '#9a3412',
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  lineHeight: 1.5,
                  maxWidth: '560px',
                  margin: '0 auto'
                }}>
                  Invia i dettagli della tua prenotazione per richiedere il rimborso integrale della spesa sostenuta.
                </p>
              </div>

              {/* Legal Notice Box */}
              <div style={{
                background: '#fff7ed',
                border: '1.5px solid #fdba74',
                borderRadius: '1.25rem',
                padding: '1.25rem',
                marginBottom: '2rem',
                display: 'flex',
                gap: '0.85rem',
                alignItems: 'flex-start'
              }}>
                <div style={{
                  background: '#ea580c',
                  color: 'white',
                  width: 32,
                  height: 32,
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.1rem'
                }}>
                  <ShieldCheck size={18} />
                </div>
                <div style={{ fontSize: '0.86rem', color: '#7c2d12', lineHeight: 1.55 }}>
                  <div style={{ fontWeight: 800, color: '#431407', marginBottom: '0.25rem', textTransform: 'uppercase', fontSize: '0.78rem', letterSpacing: '0.05em' }}>
                    Condizioni e Regolamento di Rimborso
                  </div>
                  Conformemente al regolamento dell'evento, in caso di pioggia o maltempo i biglietti restano automaticamente validi per la nuova data stabilita. La facoltà di richiedere il <strong>rimborso integrale (100%)</strong> matura esclusivamente qualora l'evento subisca un <strong>secondo rinvio consecutivo</strong> per cause di forza maggiore. I rimborsi saranno erogati <strong>esclusivamente tramite bonifico bancario</strong> all'IBAN e all'intestatario indicati.
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: '#fef2f2',
                    border: '1.5px solid #f87171',
                    color: '#991b1b',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '1rem',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem'
                  }}
                >
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Interactive Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Full Name */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#431407', marginBottom: '0.35rem' }}>
                    <User size={15} color="#ea580c" /> Nome e Cognome Intestatario Prenotazione <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Mario Rossi (indicato in fase di prenotazione)"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.85rem',
                      border: '1.5px solid #fed7aa',
                      fontSize: '0.95rem',
                      color: '#431407',
                      background: '#fffaf5',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Email and Phone Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#431407', marginBottom: '0.35rem' }}>
                      <Mail size={15} color="#ea580c" /> Email di Acquisto <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="mario.rossi@example.com"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.85rem',
                        border: '1.5px solid #fed7aa',
                        fontSize: '0.95rem',
                        color: '#431407',
                        background: '#fffaf5',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#431407', marginBottom: '0.35rem' }}>
                      <Phone size={15} color="#ea580c" /> Recapito Telefonico
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+39 340 1234567"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.85rem',
                        border: '1.5px solid #fed7aa',
                        fontSize: '0.95rem',
                        color: '#431407',
                        background: '#fffaf5',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Booking Numbers */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#431407', marginBottom: '0.35rem' }}>
                    <Ticket size={15} color="#ea580c" /> Numero/i di Prenotazione o Codice Ordine <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bookingNumbers}
                    onChange={e => setFormData({ ...formData, bookingNumbers: e.target.value })}
                    placeholder="Es. ZUCCA-10-ABCD o codice riportato nell'email di conferma"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.85rem',
                      border: '1.5px solid #fed7aa',
                      fontSize: '0.95rem',
                      color: '#431407',
                      background: '#fffaf5',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ fontSize: '0.78rem', color: '#9a3412', marginTop: '0.35rem' }}>
                    Indica tutti i codici biglietto o il codice transazione presenti nella mail di conferma. Se sono più codici, separali con una virgola.
                  </p>
                </div>

                {/* Account Holder (Mandatory) */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#431407', marginBottom: '0.35rem' }}>
                    <User size={15} color="#ea580c" /> Intestatario Conto Corrente (Beneficiario Bonifico) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.accountHolder}
                    onChange={e => setFormData({ ...formData, accountHolder: e.target.value })}
                    placeholder="Nome e Cognome o Ragione Sociale a cui è intestato il conto bancario"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.85rem',
                      border: '1.5px solid #fed7aa',
                      fontSize: '0.95rem',
                      color: '#431407',
                      background: '#fffaf5',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p style={{ fontSize: '0.78rem', color: '#9a3412', marginTop: '0.35rem' }}>
                    Indica l'esatta intestazione del conto corrente su cui effettuare l'accredito del bonifico di rimborso.
                  </p>
                </div>

                {/* IBAN (Mandatory with length and character-level validation) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#431407' }}>
                      <CreditCard size={15} color="#ea580c" /> IBAN per Bonifico di Rimborso <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.55rem',
                      borderRadius: '999px',
                      background: ibanValidation?.valid ? '#dcfce7' : cleanIban.length > 0 ? '#ffedd5' : '#f1f5f9',
                      color: ibanValidation?.valid ? '#15803d' : cleanIban.length > 0 ? '#c2410c' : '#64748b',
                      fontFamily: 'monospace'
                    }}>
                      {cleanIban.length} / {isItalianIban ? '27 car.' : '15-34 car.'}
                    </span>
                  </div>

                  <input
                    type="text"
                    required
                    value={formData.iban}
                    onChange={e => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                    placeholder="IT 00 X 00000 00000 000000000000"
                    maxLength={34}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.85rem',
                      border: `1.5px solid ${ibanValidation?.valid ? '#22c55e' : (ibanValidation && !ibanValidation.valid ? '#f87171' : '#fed7aa')}`,
                      fontSize: '1rem',
                      color: '#431407',
                      background: '#fffaf5',
                      outline: 'none',
                      fontFamily: 'monospace',
                      letterSpacing: '0.05em',
                      boxSizing: 'border-box'
                    }}
                  />

                  {/* Struttura guidata per IBAN italiano */}
                  {cleanIban.length > 0 && isItalianIban && (
                    <div style={{
                      display: 'flex',
                      gap: '0.35rem',
                      marginTop: '0.45rem',
                      flexWrap: 'wrap',
                      fontSize: '0.7rem',
                      fontFamily: 'monospace'
                    }}>
                      {/* Paese */}
                      <span style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.35rem',
                        background: cleanIban.startsWith('IT') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: cleanIban.startsWith('IT') ? '#15803d' : '#b91c1c',
                        fontWeight: 700
                      }}>
                        Paese: {cleanIban.slice(0, 2) || '--'} (2 lett.)
                      </span>
                      {/* Check digits */}
                      <span style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.35rem',
                        background: /^\d{2}$/.test(cleanIban.slice(2, 4)) ? 'rgba(34,197,94,0.15)' : cleanIban.length >= 4 ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.05)',
                        color: /^\d{2}$/.test(cleanIban.slice(2, 4)) ? '#15803d' : cleanIban.length >= 4 ? '#b91c1c' : '#78716c',
                        fontWeight: 700
                      }}>
                        Ctrl: {cleanIban.slice(2, 4) || '--'} (2 num.)
                      </span>
                      {/* CIN */}
                      <span style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.35rem',
                        background: /^[A-Z]$/.test(cleanIban.slice(4, 5)) ? 'rgba(34,197,94,0.15)' : cleanIban.length >= 5 ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.05)',
                        color: /^[A-Z]$/.test(cleanIban.slice(4, 5)) ? '#15803d' : cleanIban.length >= 5 ? '#b91c1c' : '#78716c',
                        fontWeight: 700
                      }}>
                        CIN: {cleanIban.slice(4, 5) || '-'} (1 lett.)
                      </span>
                      {/* ABI */}
                      <span style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.35rem',
                        background: /^\d{5}$/.test(cleanIban.slice(5, 10)) ? 'rgba(34,197,94,0.15)' : cleanIban.length >= 10 ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.05)',
                        color: /^\d{5}$/.test(cleanIban.slice(5, 10)) ? '#15803d' : cleanIban.length >= 10 ? '#b91c1c' : '#78716c',
                        fontWeight: 700
                      }}>
                        ABI: {cleanIban.slice(5, 10) || '-----'} (5 num.)
                      </span>
                      {/* CAB */}
                      <span style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.35rem',
                        background: /^\d{5}$/.test(cleanIban.slice(10, 15)) ? 'rgba(34,197,94,0.15)' : cleanIban.length >= 15 ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.05)',
                        color: /^\d{5}$/.test(cleanIban.slice(10, 15)) ? '#15803d' : cleanIban.length >= 15 ? '#b91c1c' : '#78716c',
                        fontWeight: 700
                      }}>
                        CAB: {cleanIban.slice(10, 15) || '-----'} (5 num.)
                      </span>
                      {/* Conto */}
                      <span style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: '0.35rem',
                        background: cleanIban.length === 27 ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.05)',
                        color: cleanIban.length === 27 ? '#15803d' : '#78716c',
                        fontWeight: 700
                      }}>
                        Conto: {cleanIban.slice(15, 27) || '------------'} (12 car.)
                      </span>
                    </div>
                  )}

                  {/* Feedback in tempo reale su validità o errore specifico */}
                  {ibanValidation && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {ibanValidation.valid ? (
                        <div style={{
                          background: '#f0fdf4',
                          border: '1px solid #86efac',
                          color: '#15803d',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '0.6rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          <Check size={14} color="#16a34a" />
                          <span>IBAN valido: struttura numeri/lettere, codice CIN ({ibanValidation.details?.cin}) e checksum MOD-97 verificati con successo.</span>
                        </div>
                      ) : (
                        <div style={{
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          color: '#92400e',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '0.6rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}>
                          <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0 }} />
                          <span>{ibanValidation.error}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!cleanIban && (
                    <p style={{ fontSize: '0.78rem', color: '#9a3412', marginTop: '0.35rem', marginBottom: 0 }}>
                      Formato standard italiano: <strong>IT</strong> (2 lettere) + 2 cifre controllo + <strong>CIN</strong> (1 lettera) + <strong>ABI</strong> (5 cifre) + <strong>CAB</strong> (5 cifre) + <strong>Conto</strong> (12 caratteri).
                    </p>
                  )}
                </div>

                {/* Additional notes / reason */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 800, color: '#431407', marginBottom: '0.35rem' }}>
                    <FileText size={15} color="#ea580c" /> Note Aggiuntive (facoltativo)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Dettagli aggiuntivi o note per l'amministrazione..."
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.85rem',
                      border: '1.5px solid #fed7aa',
                      fontSize: '0.92rem',
                      color: '#431407',
                      background: '#fffaf5',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Checkbox confirmation */}
                <div style={{
                  background: '#fafaf9',
                  border: '1px solid #e7e5e4',
                  borderRadius: '0.85rem',
                  padding: '0.9rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem'
                }}>
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    required
                    checked={formData.acceptTerms}
                    onChange={e => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: '#ea580c',
                      marginTop: '0.15rem',
                      cursor: 'pointer'
                    }}
                  />
                  <label htmlFor="acceptTerms" style={{ fontSize: '0.82rem', color: '#44403c', lineHeight: 1.45, cursor: 'pointer' }}>
                    Dichiaro che i dati indicati corrispondono alla prenotazione originaria e confermo di richiedere il rimborso in virtù del secondo rinvio della manifestazione Zuccaland come da regolamento. <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '0.9rem 1.75rem',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: '0 6px 20px rgba(234, 88, 12, 0.35)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    marginTop: '0.5rem'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Registrazione richiesta in corso...
                    </>
                  ) : (
                    <>
                      <Send size={18} /> Invia Richiesta di Rimborso
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
