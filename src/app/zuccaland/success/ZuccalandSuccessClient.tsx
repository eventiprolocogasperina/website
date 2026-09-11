'use client';

import { useState } from 'react';
import { CheckCircle2, Download, ArrowRight, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface TicketItem {
  id: string;
  type: string;
  price: number;
}

interface ZuccalandSuccessClientProps {
  orderId: string;
  orderRef: string;
  buyerName: string;
  buyerEmail: string;
  totalAmount: number;
  tickets: TicketItem[];
}

export default function ZuccalandSuccessClient({
  orderId,
  orderRef,
  buyerName,
  buyerEmail,
  totalAmount,
  tickets,
}: ZuccalandSuccessClientProps) {
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
      a.download = `biglietti-zuccaland-${orderRef}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Si è verificato un errore durante il download. Controlla la tua email.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fdf7f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '560px', width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Image src="/img/zuccaland/Logo.png" alt="Zuccaland" width={220} height={70} style={{ objectFit: 'contain' }} />
        </div>

        {/* Success Icon */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#f0fdf4',
            border: '2px solid #86efac',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 4px 16px rgba(22,163,74,0.12)',
          }}>
            <CheckCircle2 size={36} color="#16a34a" />
          </div>
          <h1 style={{
            color: '#2d1200', fontFamily: 'var(--font-display)',
            fontSize: '2rem', margin: '0 0 0.4rem', letterSpacing: '-0.02em',
          }}>
            Pagamento Completato!
          </h1>
          <p style={{ color: '#7a4820', fontSize: '0.95rem', margin: 0 }}>
            Grazie <strong>{buyerName}</strong>, il tuo ordine è confermato.
          </p>
        </div>

        {/* Main Card */}
        <div style={{
          background: 'white',
          borderRadius: '1.5rem',
          border: '1.5px solid #eaddd0',
          overflow: 'hidden',
          marginBottom: '1.25rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}>
          {/* Order ref bar */}
          <div style={{
            background: '#fff8f0',
            borderBottom: '1px solid #f0e6da',
            padding: '0.875rem 1.5rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ color: '#a06840', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Ordine
            </span>
            <span style={{ color: '#c85a0e', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.05em' }}>
              #{orderRef}
            </span>
          </div>

          {/* Tickets */}
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
              {tickets.map((ticket, i) => (
                <div key={ticket.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#fdf7f0',
                  borderRadius: '0.75rem',
                  padding: '0.875rem 1rem',
                  border: '1px solid #eaddd0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem', display: 'flex' }}>
                      <img src="/img/zuccaland/Pumpink.png" style={{ width: 24, height: 24, objectFit: 'contain' }} alt="Zucca" />
                    </span>
                    <div>
                      <div style={{ color: '#2d1200', fontWeight: 600, fontSize: '0.9rem' }}>{ticket.type}</div>
                      <div style={{ color: '#a06840', fontSize: '0.75rem' }}>Biglietto {i + 1}</div>
                    </div>
                  </div>
                  <span style={{ color: '#c85a0e', fontWeight: 700, fontSize: '1rem' }}>
                    €{ticket.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              paddingTop: '1rem', borderTop: '1.5px dashed #eaddd0',
            }}>
              <span style={{ color: '#7a4820', fontSize: '0.9rem', fontWeight: 600 }}>Totale pagato</span>
              <span style={{ color: '#c85a0e', fontWeight: 800, fontSize: '1.4rem' }}>
                €{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Email notice */}
        <div style={{
          background: '#fff8f0', border: '1.5px solid #f5c89a', borderRadius: '1rem',
          padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <Mail size={18} color="#c85a0e" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: '#7a4820', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
            Abbiamo inviato la ricevuta con QR code a <strong style={{ color: '#c85a0e' }}>{buyerEmail}</strong>.
            Presentala all'ingresso di Zuccaland. Controlla anche la cartella spam.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              background: 'white',
              color: '#2d1200',
              padding: '0.9rem 1.5rem',
              borderRadius: '999px',
              border: '1.5px solid #eaddd0',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              opacity: downloading ? 0.7 : 1,
              minWidth: '150px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {downloading ? 'Generazione...' : 'Scarica PDF'}
          </button>

          <Link href="/zuccaland" style={{
            flex: 1,
            background: 'linear-gradient(135deg, #e07848, #c85a0e)',
            color: 'white', padding: '0.9rem 1.5rem',
            borderRadius: '999px', textDecoration: 'none',
            fontSize: '0.9rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            boxShadow: '0 4px 16px rgba(200,90,14,0.3)',
            minWidth: '150px',
          }}>
            Torna a Zuccaland <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
