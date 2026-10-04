'use client';

import { CashierOrder } from '@/lib/data/cashier';
import { CheckCircle2, Printer, Share2, ArrowLeft, Heart, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ReceiptClient({ order }: { order: CashierOrder }) {
  const formattedDate = new Date(order.createdAt).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ricevuta Contributo #${order.orderNumber} - Pro Loco Gasperina`,
          text: `Ricevuta per ${order.eventName} - Numero #${order.orderNumber}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link della ricevuta copiato negli appunti!');
    }
  };

  const paymentLabel = order.paymentMethod === 'CONTANTI'
    ? '💵 Contanti'
    : order.paymentMethod === 'POS'
    ? '💳 Carta / POS'
    : '🎁 Omaggio';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #090d16 0%, #111827 100%)',
      color: '#f8fafc',
      padding: '2rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body, system-ui, sans-serif)'
    }}>
      
      {/* Top action button */}
      <div style={{ maxWidth: '460px', width: '100%', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#94a3b8',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            padding: '0.4rem 0.75rem',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.06)'
          }}
        >
          <ArrowLeft size={16} /> Home Sito
        </Link>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleShare}
            aria-label="Condividi ricevuta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#38bdf8',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '999px',
              padding: '0.4rem 0.8rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Share2 size={15} /> Condividi
          </button>
          <button
            onClick={handlePrint}
            aria-label="Stampa ricevuta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#f8fafc',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '999px',
              padding: '0.4rem 0.8rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Printer size={15} /> Salva / Stampa
          </button>
        </div>
      </div>

      {/* Main Receipt Container */}
      <div
        className="receipt-card"
        style={{
          maxWidth: '460px',
          width: '100%',
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Top Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
          color: 'white',
          padding: '2rem 1.5rem 1.75rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '0.75rem'
          }}>
            <Sparkles size={14} style={{ color: '#fbbf24' }} /> Pro Loco Gasperina APS
          </div>

          <h1 style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            margin: '0 0 0.25rem',
            letterSpacing: '-0.3px'
          }}>
            RICEVUTA CONTRIBUTO
          </h1>
          <div style={{ fontSize: '0.85rem', opacity: 0.85, fontWeight: 500 }}>
            {order.eventName}
          </div>

          {/* Big Progressive Number Display */}
          <div style={{
            marginTop: '1.25rem',
            background: '#ffffff',
            color: '#1e3a8a',
            borderRadius: '1.25rem',
            padding: '1rem',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Numero Progressivo
            </span>
            <span style={{
              fontSize: '3.5rem',
              fontWeight: 900,
              lineHeight: 1,
              fontFamily: 'monospace',
              color: '#0f172a',
              marginTop: '0.2rem'
            }}>
              #{String(order.orderNumber).padStart(3, '0')}
            </span>
            <span style={{
              marginTop: '0.5rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              background: '#f1f5f9',
              color: '#475569',
              padding: '0.2rem 0.65rem',
              borderRadius: '999px'
            }}>
              {order.cassaName}
            </span>
          </div>
        </div>

        {/* Receipt Body */}
        <div style={{ padding: '1.75rem 1.5rem' }}>
          
          {/* Metadata Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#64748b',
            borderBottom: '1px dashed #cbd5e1',
            paddingBottom: '0.85rem',
            marginBottom: '1rem'
          }}>
            <span>📅 {formattedDate}</span>
            <span>ID: <code style={{ fontSize: '0.75rem', color: '#0f172a' }}>{order.id.slice(-8).toUpperCase()}</code></span>
          </div>

          {/* Items Table */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#94a3b8',
              marginBottom: '0.65rem'
            }}>
              Dettaglio Voci Contributo
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                    <span style={{
                      fontWeight: 800,
                      color: '#1e40af',
                      fontSize: '0.9rem',
                      minWidth: '22px'
                    }}>
                      {item.quantity}x
                    </span>
                    <div>
                      <span style={{ fontWeight: 650, color: '#1e293b' }}>{item.name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                        (Contributo unitario: €{Number(item.price).toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <strong style={{ fontWeight: 750, color: '#0f172a', whiteSpace: 'nowrap' }}>
                    €{Number(item.subtotal).toFixed(2)}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Total & Payment Method Box */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '1rem',
            padding: '1.15rem',
            marginTop: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                TOTALE CONTRIBUTO
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e3a8a' }}>
                €{Number(order.totalAmount).toFixed(2)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.82rem',
              color: '#475569',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '0.6rem'
            }}>
              <span>Modalità di Versamento:</span>
              <span style={{ fontWeight: 750, color: '#0f172a' }}>{paymentLabel}</span>
            </div>

            {order.paymentMethod === 'CONTANTI' && order.cashReceived && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: '#64748b',
                marginTop: '0.35rem'
              }}>
                <span>Contanti ricevuti: €{Number(order.cashReceived).toFixed(2)}</span>
                {order.cashChange !== undefined && order.cashChange > 0 && (
                  <span style={{ color: '#15803d', fontWeight: 700 }}>
                    Resto: €{Number(order.cashChange).toFixed(2)}
                  </span>
                )}
              </div>
            )}

            {order.omaggioNote && (
              <div style={{ fontSize: '0.78rem', color: '#c2410c', marginTop: '0.35rem', fontWeight: 650 }}>
                Nota: {order.omaggioNote}
              </div>
            )}
          </div>

          {/* Legal ETS Footer note */}
          <div style={{
            textAlign: 'center',
            fontSize: '0.72rem',
            color: '#64748b',
            lineHeight: 1.5,
            padding: '0 0.5rem'
          }}>
            <p style={{ margin: '0 0 0.5rem' }}>
              <strong>PRO LOCO GASPERINA APS</strong><br />
              Associazione di Promozione Sociale - Iscritta al RUNTS<br />
              C.F. 97003460793 - Gasperina (CZ)
            </p>
            <p style={{ margin: 0, fontStyle: 'italic', color: '#94a3b8' }}>
              Versamento effettuato a titolo di contributo di partecipazione a sostegno delle attività istituzionali ed associative. Non costituisce corrispettivo commerciale (Art. 85 D.Lgs. 117/2017 - Codice del Terzo Settore).
            </p>
          </div>

          <div style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px dashed #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            fontSize: '0.82rem',
            color: '#15803d',
            fontWeight: 700
          }}>
            <Heart size={16} fill="#15803d" /> Grazie di cuore per il tuo sostegno!
          </div>

        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          .receipt-card {
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          button, a {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
