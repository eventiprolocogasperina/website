'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  Calendar, 
  Clock, 
  ArrowRight,
  Download,
  FileText
} from 'lucide-react';

interface PayLinkClientProps {
  orderId: string;
  parentOrderId: string | null;
  buyerName: string;
  buyerEmail: string;
  totalAmount: number;
  status: string;
  isZuccaland: boolean;
  dayLabel: string | null;
  items: Array<{ type: string; price: number; count: number; total: number }>;
  freeLabs: string[];
  notes: string;
}

export default function PayLinkClient({
  orderId,
  parentOrderId,
  buyerName,
  buyerEmail,
  totalAmount,
  status,
  isZuccaland,
  dayLabel,
  items,
  freeLabs,
  notes,
}: PayLinkClientProps) {
  const [redirecting, setRedirecting] = useState(false);

  const isAlreadyPaid = status === 'PAID';
  const orderRef = orderId.substring(0, 8).toUpperCase();
  const parentRef = parentOrderId ? parentOrderId.substring(0, 8).toUpperCase() : null;

  const handleProceedToNexi = () => {
    setRedirecting(true);
    window.location.href = `/api/nexi/checkout?orderId=${orderId}`;
  };

  const bgGradient = isZuccaland 
    ? 'linear-gradient(135deg, #1c0f05 0%, #2d1607 50%, #150a04 100%)' 
    : 'linear-gradient(135deg, #091326 0%, #0d1e3d 50%, #060d1b 100%)';

  const accentColor = isZuccaland ? '#ea580c' : '#2563eb';
  const accentLight = isZuccaland ? '#fdba74' : '#93c5fd';

  return (
    <div style={{
      minHeight: '100vh',
      background: bgGradient,
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '540px',
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1.5rem',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow decorativo */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: accentColor,
          opacity: 0.18,
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }} />

        {/* Header Evento */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {isZuccaland ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(234, 88, 12, 0.15)', border: '1px solid rgba(234, 88, 12, 0.3)', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700, color: '#fed7aa', marginBottom: '1rem' }}>
              🎃 Zuccaland 2026 · Gasperina
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(37, 99, 235, 0.3)', padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 700, color: '#bfdbfe', marginBottom: '1rem' }}>
              🍷 Assaggia & Passeggia · Gasperina
            </div>
          )}

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {isAlreadyPaid ? 'Pagamento Completato' : 'Integrazione Prenotazione'}
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.92rem', margin: 0 }}>
            {isAlreadyPaid ? 'I servizi sono stati aggiunti con successo.' : 'Completa il pagamento per confermare i servizi aggiuntivi.'}
          </p>
        </div>

        {/* Se già pagato */}
        {isAlreadyPaid ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(74, 222, 128, 0.15)',
              border: '2px solid #4ade80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#4ade80'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <p style={{ fontSize: '1rem', color: '#e2e8f0', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Questa transazione risulta già <b>saldata con successo</b>.<br/>
              Tutti i biglietti e servizi aggiornati sono stati inviati all&apos;indirizzo <b>{buyerEmail}</b>.
            </p>

            {parentOrderId && (
              <a
                href={`/api/tickets/download?orderId=${parentOrderId}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: accentColor,
                  color: 'white',
                  textDecoration: 'none',
                  padding: '0.85rem 1.5rem',
                  borderRadius: '0.75rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                  transition: 'opacity 0.2s'
                }}
              >
                <Download size={18} /> Scarica Biglietti PDF Aggiornati
              </a>
            )}
          </div>
        ) : (
          /* Scheda Pagamento PENDING */
          <div>
            {/* Box Cliente e Info Prenotazione */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '1rem',
              padding: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.5)' }}>Intestatario</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>{buyerName}</span>
              </div>
              {parentRef && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.5)' }}>Prenotazione Principale</span>
                  <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: accentLight, fontWeight: 700 }}>#{parentRef}</span>
                </div>
              )}
              {dayLabel && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.5)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={13} /> Data Evento
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>{dayLabel}</span>
                </div>
              )}
            </div>

            {/* Lista Servizi da Saldare */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.75rem' }}>
                Servizi Aggiunti da Saldare
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '0.85rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>
                        <span style={{ color: accentLight, marginRight: '0.4rem' }}>{item.count}x</span>
                        {item.type}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.15rem' }}>
                        €{item.price.toFixed(2)} cad.
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>
                      €{item.total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Box Laboratori Gratuiti Bimbi (se presenti) */}
            {freeLabs.length > 0 && (
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '0.85rem',
                padding: '0.85rem 1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fde68a', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                  <Sparkles size={14} /> Laboratori gratuiti per bambini inclusi:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {freeLabs.map((lab, i) => (
                    <span key={i} style={{
                      background: 'rgba(251, 191, 36, 0.2)',
                      color: '#fef3c7',
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      fontWeight: 600
                    }}>
                      {lab}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Totale da Saldare */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '1.25rem 0',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '1.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>Totale da saldare</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>IVA inclusa · Nessuna commissione extra</div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                €{totalAmount.toFixed(2)}
              </div>
            </div>

            {/* Pulsante Procedi a Nexi */}
            <button
              onClick={handleProceedToNexi}
              disabled={redirecting}
              style={{
                width: '100%',
                background: isZuccaland 
                  ? 'linear-gradient(135deg, #ea580c, #c2410c)' 
                  : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.85rem',
                padding: '1rem',
                fontSize: '1.05rem',
                fontWeight: 800,
                cursor: redirecting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                boxShadow: isZuccaland 
                  ? '0 8px 25px rgba(234, 88, 12, 0.35)' 
                  : '0 8px 25px rgba(37, 99, 235, 0.35)',
                transition: 'transform 0.15s, opacity 0.15s',
                opacity: redirecting ? 0.7 : 1
              }}
            >
              <CreditCard size={20} />
              <span>{redirecting ? 'Reindirizzamento a Nexi...' : `Paga €${totalAmount.toFixed(2)} con Nexi`}</span>
              {!redirecting && <ArrowRight size={18} />}
            </button>

            {/* Rassicurazione Sicurezza Nexi */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.75rem',
              marginTop: '1rem'
            }}>
              <ShieldCheck size={14} color="#4ade80" />
              <span>Transazione crittografata 256-bit certificata tramite <b>Nexi XPay</b></span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1.25rem',
              marginTop: '0.75rem',
              fontSize: '0.72rem',
              color: 'rgba(255, 255, 255, 0.4)'
            }}>
              <span>💳 Visa / Mastercard</span>
              <span>🍎 Apple Pay</span>
              <span>📱 Google Pay</span>
            </div>
          </div>
        )}

        {/* Footer info Pro Loco */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.4)'
        }}>
          Pro Loco Gasperina APS · Cod. Ordine: <span style={{ fontFamily: 'monospace' }}>#{orderRef}</span>
        </div>
      </div>
    </div>
  );
}
