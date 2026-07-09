'use client';

import { useState } from 'react';
import { CheckCircle2, Ticket, Download, ArrowRight, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

interface Ticket {
  id: string;
  type: string;
  price: number;
}

interface SuccessClientProps {
  orderId: string;
  orderRef: string;
  buyerName: string;
  buyerEmail: string;
  totalAmount: number;
  tickets: Ticket[];
}

export default function SuccessClient({
  orderId,
  orderRef,
  buyerName,
  buyerEmail,
  totalAmount,
  tickets,
}: SuccessClientProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/tickets/download?orderId=${orderId}`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biglietti-assaggia-passeggia-${orderRef}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Si è verificato un errore durante il download. Riprova o controlla la tua email.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #3a0a0a 50%, #1a1a1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '580px', width: '100%' }}>

        {/* Success Icon */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(22,163,74,0.15)',
            border: '2px solid rgba(22,163,74,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 0 40px rgba(22,163,74,0.2)',
          }}>
            <CheckCircle2 size={40} color="#4ade80" />
          </div>
          <h1 style={{
            color: '#ffffff', fontFamily: 'var(--font-display)',
            fontSize: '2.5rem', margin: '0 0 0.5rem', letterSpacing: '-0.5px',
          }}>
            Pagamento Completato!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', margin: 0 }}>
            Grazie {buyerName}, il tuo ordine è confermato
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          borderRadius: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}>
          {/* Order ref bar */}
          <div style={{
            background: 'rgba(40, 57, 131, 0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '0.875rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Ordine
            </span>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.05em' }}>
              #{orderRef}
            </span>
          </div>

          {/* Tickets list */}
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {tickets.map((ticket, i) => (
                <div key={ticket.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '0.75rem',
                  padding: '0.875rem 1.25rem',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(40, 57, 131, 0.3)',
                      border: '1px solid rgba(40, 57, 131, 0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Ticket size={14} color="#60a5fa" />
                    </div>
                    <div>
                      <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.95rem' }}>{ticket.type}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Biglietto {i + 1}</div>
                    </div>
                  </div>
                  <span style={{ color: '#60a5fa', fontWeight: 700, fontSize: '1rem' }}>
                    €{ticket.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: '1rem',
              borderTop: '1px dashed rgba(255,255,255,0.15)',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Totale pagato</span>
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.4rem' }}>
                €{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Email notice */}
        <div style={{
          background: 'rgba(232, 192, 66, 0.1)',
          border: '1px solid rgba(232, 192, 66, 0.3)',
          borderRadius: '1rem',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <Mail size={18} color="#E8C042" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
            Abbiamo inviato i biglietti PDF con QR code a <strong style={{ color: '#E8C042' }}>{buyerEmail}</strong>.
            Controlla anche la cartella spam.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background 0.2s',
              opacity: downloading ? 0.7 : 1,
              minWidth: '180px',
            }}
          >
            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {downloading ? 'Generazione...' : 'Scarica Biglietti PDF'}
          </button>

            <Link
            href="/assaggia-e-passeggia"
            style={{
              flex: 1,
              background: '#283983',
              color: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '999px',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 20px rgba(40, 57, 131, 0.4)',
              minWidth: '180px',
            }}
          >
            Torna alla Home <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
