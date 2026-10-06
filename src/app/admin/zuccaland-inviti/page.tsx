'use client';

import { useState, useEffect } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  Send,
  User,
  Mail,
  Phone,
  Calendar,
  Ticket,
  FileText,
  CheckCircle2,
  AlertCircle,
  QrCode as QrIcon,
  RefreshCw,
  Search,
  Users,
  Sparkles,
  Info
} from 'lucide-react';
import QRCode from 'qrcode';

interface InviteRecord {
  id: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  notes?: string;
  ticketCount: number;
}

export default function ZuccalandInvitiPage() {
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [eventDateLabel, setEventDateLabel] = useState('Domenica 25 Ottobre 2026');
  const [inviteCount, setInviteCount] = useState<number>(2);
  const [customNotes, setCustomNotes] = useState(
    'Invito omaggio personale per Zuccaland. Eventuali servizi e attività aggiuntivi (es. laboratori o prodotti) possono essere acquistati in loco dietro un contributo libero.'
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Invites list
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);

  // QR Modal
  const [selectedQr, setSelectedQr] = useState<{ name: string; ref: string; url: string } | null>(null);

  const fetchInvites = async () => {
    setListLoading(true);
    try {
      const res = await fetch('/api/admin/zuccaland/invites');
      const data = await res.json();
      if (data.success && Array.isArray(data.invites)) {
        setInvites(data.invites);
      }
    } catch (err) {
      console.error('Failed to fetch invites:', err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setMessage({ type: 'error', text: 'Inserisci Nome e Email dell\'invitato.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/zuccaland/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName,
          buyerEmail,
          buyerPhone,
          eventDateLabel,
          inviteCount,
          customNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `🎉 Invito inviato con successo a ${buyerEmail}! (Codice: #${data.orderRef})`,
        });
        setBuyerName('');
        setBuyerEmail('');
        setBuyerPhone('');
        fetchInvites();
      } else {
        setMessage({ type: 'error', text: data.error || 'Impossibile inviare l\'invito.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Errore di connessione.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (orderId: string, email: string) => {
    setResendingId(orderId);
    try {
      const res = await fetch('/api/admin/zuccaland/invites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Email di invito reinviata con successo a ${email}!`);
      } else {
        alert(`❌ Errore reinvio: ${data.error || 'Errore imprevisto'}`);
      }
    } catch (err) {
      alert('❌ Errore durante il reinvio dell\'email.');
    } finally {
      setResendingId(null);
    }
  };

  const handleShowQr = async (inv: InviteRecord) => {
    try {
      const ref = inv.id.replace('zinv_', '').substring(0, 8).toUpperCase();
      const qrData = `${inv.id}-invito`;
      const url = await QRCode.toDataURL(qrData, { width: 320, margin: 2 });
      setSelectedQr({ name: inv.buyerName, ref, url });
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  };

  const filteredInvites = invites.filter(
    (inv) =>
      inv.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
      inv.buyerEmail?.toLowerCase().includes(search.toLowerCase()) ||
      inv.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <AdminHeader
        title="Inviti Ufficiali Zuccaland 🎃"
        subtitle="Genera ed invia pass d'ingresso gratuiti via e-mail con QR Code integrato e clausole personalizzate"
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* Banner informativo */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(234,88,12,0.15) 0%, rgba(194,65,12,0.08) 100%)',
          border: '1px solid rgba(234,88,12,0.3)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
        }}>
          <Sparkles size={24} style={{ color: '#fb923c', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.88rem', color: 'var(--neutral-300)', lineHeight: 1.6 }}>
            <strong style={{ color: '#ffffff', display: 'block', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
              Inviti E-mail Senza PDF Allegato (Solo QR Code nel Body)
            </strong>
            Gli inviti inviati da questa sezione includono il **QR Code di ingresso direttamente all'interno dell'email HTML**, senza allegati PDF ingombranti. L'invitato dovrà semplicemente mostrare l'email ricevuta dallo smartphone ai varchi d'accesso.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          
          {/* Form Creazione Invito */}
          <div style={{
            background: 'var(--neutral-900)',
            border: '1px solid var(--neutral-800)',
            borderRadius: '20px',
            padding: '1.75rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Send size={20} style={{ color: '#ea580c' }} />
              Nuovo Invito Zuccaland
            </h2>

            {message && (
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: message.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                border: message.type === 'success' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(239,68,68,0.4)',
                color: message.type === 'success' ? '#4ade80' : '#f87171',
              }}>
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              {/* Nome Invitato */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Nome & Cognome Invitato *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-500)' }} />
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Es. Marco Rossi"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                      background: 'var(--neutral-950)',
                      border: '1px solid var(--neutral-800)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Email Invitato */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Indirizzo Email *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-500)' }} />
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="mario.rossi@example.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                      background: 'var(--neutral-950)',
                      border: '1px solid var(--neutral-800)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Telefono & Ingressi */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Telefono (Opz.)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-500)' }} />
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="+39 333..."
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                        background: 'var(--neutral-950)',
                        border: '1px solid var(--neutral-800)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 600 }}>
                    N° Ingressi
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Ticket size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-500)' }} />
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={inviteCount}
                      onChange={(e) => setInviteCount(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                        background: 'var(--neutral-950)',
                        border: '1px solid var(--neutral-800)',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Data dell'evento */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Data Evento Zuccaland
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-500)' }} />
                  <select
                    value={eventDateLabel}
                    onChange={(e) => setEventDateLabel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem 0.75rem 2.5rem',
                      background: 'var(--neutral-950)',
                      border: '1px solid var(--neutral-800)',
                      borderRadius: '10px',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="Domenica 25 Ottobre 2026">Domenica 25 Ottobre 2026</option>
                    <option value="Domenica 11 Ottobre 2026">Domenica 11 Ottobre 2026</option>
                    <option value="Sabato 10 Ottobre 2026">Sabato 10 Ottobre 2026</option>
                  </select>
                </div>
              </div>

              {/* Clausole / Note personalizzate */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--neutral-300)', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Clausole & Condizioni Invito (Visibili in Email)
                </label>
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Inserisci eventuali note o clausole per l'invitato..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--neutral-950)',
                    border: '1px solid var(--neutral-800)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.9rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: '0 4px 16px rgba(234,88,12,0.3)',
                  transition: 'transform 0.15s ease',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" /> Invio in corso...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Invia Invito Email (con QR Body)
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Statistiche rapide & Anteprima Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              background: 'var(--neutral-900)',
              border: '1px solid var(--neutral-800)',
              borderRadius: '20px',
              padding: '1.5rem',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
            }}>
              <div style={{ background: 'var(--neutral-950)', padding: '1.2rem', borderRadius: '14px', border: '1px solid var(--neutral-800)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Totale Inviti Generati
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fb923c', marginTop: '0.3rem' }}>
                  {invites.length}
                </div>
              </div>
              <div style={{ background: 'var(--neutral-950)', padding: '1.2rem', borderRadius: '14px', border: '1px solid var(--neutral-800)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  Pass Ingressi Inviati
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4ade80', marginTop: '0.3rem' }}>
                  {invites.reduce((acc, i) => acc + (Number(i.ticketCount) || 1), 0)}
                </div>
              </div>
            </div>

            {/* Facsimile Anteprima Mail */}
            <div style={{
              background: 'var(--neutral-900)',
              border: '1px solid var(--neutral-800)',
              borderRadius: '20px',
              padding: '1.5rem',
              flex: 1,
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={16} style={{ color: '#38bdf8' }} /> Anteprima Struttura Mail Invitato
              </h3>
              <div style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '1rem',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                lineHeight: 1.6,
              }}>
                <div style={{ color: '#ea580c', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  🎃 INVITO UFFICIALE ZUCCALAND
                </div>
                <div><b>Oggetto:</b> ✨ Il tuo Pass d'Ingresso Ufficiale per Zuccaland 2026! 🎃</div>
                <div><b>Contenuto:</b> QR Code ad alta risoluzione (inline) + {inviteCount} {inviteCount === 1 ? 'Ingresso' : 'Ingressi'}</div>
                <div style={{ marginTop: '0.6rem', padding: '0.5rem', background: '#fef3c7', color: '#78350f', borderRadius: '6px', fontSize: '0.75rem' }}>
                  <b>Note:</b> {customNotes || 'Eventuali attività aggiuntive possono essere acquistate in loco...'}
                </div>
                <div style={{ marginTop: '0.5rem', color: '#475569', fontSize: '0.7rem' }}>
                  ⚠️ Nessun file PDF allegato (Direct QR Code email body render).
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Tabella Storico Inviti Inviati */}
        <div style={{
          background: 'var(--neutral-900)',
          border: '1px solid var(--neutral-800)',
          borderRadius: '20px',
          padding: '1.75rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Users size={20} style={{ color: '#fb923c' }} />
              Storico Inviti Zuccaland Inviati
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-500)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca per nome o email..."
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem 0.55rem 2.4rem',
                    background: 'var(--neutral-950)',
                    border: '1px solid var(--neutral-800)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                onClick={fetchInvites}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '10px',
                  background: 'var(--neutral-800)',
                  border: '1px solid var(--neutral-700)',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <RefreshCw size={14} className={listLoading ? 'animate-spin' : ''} /> Aggiorna
              </button>
            </div>
          </div>

          {listLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-400)' }}>
              Caricamento inviti in corso...
            </div>
          ) : filteredInvites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-500)', fontSize: '0.9rem' }}>
              Nessun invito trovato.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--neutral-800)', color: 'var(--neutral-400)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Invitato</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Email / Tel</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Ingressi</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Data Invio</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Note & Clausole</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvites.map((inv) => {
                    const orderRef = inv.id.replace('zinv_', '').substring(0, 8).toUpperCase();
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--neutral-800)', color: 'var(--neutral-200)' }}>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <strong style={{ color: '#ffffff', display: 'block' }}>{inv.buyerName}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', fontFamily: 'monospace' }}>#{orderRef}</span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <div style={{ color: '#38bdf8' }}>{inv.buyerEmail}</div>
                          {inv.buyerPhone && <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{inv.buyerPhone}</div>}
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px',
                            background: 'rgba(34,197,94,0.15)',
                            color: '#4ade80',
                            border: '1px solid rgba(34,197,94,0.3)',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                          }}>
                            {inv.ticketCount || 1} pass
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', color: 'var(--neutral-400)', whiteSpace: 'nowrap' }}>
                          {new Date(inv.createdAt).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '0.9rem 1rem', maxWidth: '280px' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {inv.notes || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleShowQr(inv)}
                              title="Visualizza QR Code"
                              style={{
                                padding: '0.45rem 0.65rem',
                                borderRadius: '8px',
                                background: 'rgba(56,189,248,0.12)',
                                border: '1px solid rgba(56,189,248,0.3)',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.78rem',
                              }}
                            >
                              <QrIcon size={14} /> QR
                            </button>

                            <button
                              onClick={() => handleResend(inv.id, inv.buyerEmail)}
                              disabled={resendingId === inv.id}
                              title="Reinvia Email Invito"
                              style={{
                                padding: '0.45rem 0.65rem',
                                borderRadius: '8px',
                                background: 'rgba(234,88,12,0.12)',
                                border: '1px solid rgba(234,88,12,0.3)',
                                color: '#fb923c',
                                cursor: resendingId === inv.id ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.78rem',
                              }}
                            >
                              <Send size={14} className={resendingId === inv.id ? 'animate-spin' : ''} /> Reinvia
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

      {/* Modal QR Code */}
      {selectedQr && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            background: 'var(--neutral-900)',
            border: '1px solid var(--neutral-700)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem' }}>
              QR Code Invito Zuccaland
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', marginBottom: '1.25rem' }}>
              {selectedQr.name} (Ref: #{selectedQr.ref})
            </p>

            <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', display: 'inline-block', marginBottom: '1.5rem' }}>
              <img src={selectedQr.url} alt="QR Code" width="220" height="220" style={{ display: 'block' }} />
            </div>

            <button
              onClick={() => setSelectedQr(null)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--neutral-800)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
