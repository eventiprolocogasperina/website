'use client';

import { useState } from 'react';
import { CheckCircle2, Download, ArrowRight, Loader2, Mail, MapPin } from 'lucide-react';
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
              {(() => {
                let admCount = 0;
                let labCount = 0;
                return tickets.map((ticket) => {
                  const isLab = ticket.type.toLowerCase().includes('you pick') || ticket.type.toLowerCase().includes('laboratorio');
                  if (isLab) labCount++;
                  else admCount++;

                  return (
                    <div key={ticket.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: isLab ? '#fff7ed' : '#fdf7f0',
                      borderRadius: '0.75rem',
                      padding: '0.875rem 1rem',
                      border: isLab ? '1.5px solid #fed7aa' : '1px solid #eaddd0',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.25rem', display: 'flex' }}>
                          {isLab ? '🎨' : <img src="/img/zuccaland/Pumpink.png" style={{ width: 24, height: 24, objectFit: 'contain' }} alt="Zucca" />}
                        </span>
                        <div>
                          <div style={{ color: '#2d1200', fontWeight: 700, fontSize: '0.9rem' }}>{ticket.type}</div>
                          <div style={{ color: isLab ? '#c2410c' : '#a06840', fontSize: '0.75rem', fontWeight: 600 }}>
                            {isLab ? 'Attività Extra · Include 1 sola zucca' : `Ingresso Villaggio #${admCount}`}
                          </div>
                        </div>
                      </div>
                      <span style={{ color: '#c85a0e', fontWeight: 700, fontSize: '1rem' }}>
                        €{ticket.price.toFixed(2)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>

            {/* If You Pick Lab was purchased, show notice */}
            {tickets.some(t => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio')) && (
              <div style={{
                background: '#fff7ed',
                border: '1.5px solid #fed7aa',
                borderRadius: '0.75rem',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.82rem',
                color: '#7c2d12',
                lineHeight: 1.45,
              }}>
                🎃 <strong>Promemoria You Pick Lab:</strong> Ogni acquisto di You Pick Lab dà diritto ad <strong>una sola zucca</strong> da scegliere, intagliare o dipingere nel campo e portare a casa.
              </div>
            )}

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
          marginBottom: '1rem',
        }}>
          <Mail size={18} color="#c85a0e" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ color: '#7a4820', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
            Abbiamo inviato la ricevuta con QR code a <strong style={{ color: '#c85a0e' }}>{buyerEmail}</strong>.
            Presentala all'ingresso di Zuccaland. Controlla anche la cartella spam.
          </p>
        </div>

        {/* Location & Navigation */}
        <div style={{
          background: '#fef3c7', border: '1.5px solid #fcd34d', borderRadius: '1rem',
          padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <MapPin size={20} color="#b45309" />
            <span style={{ fontWeight: 700, color: '#92400e', fontSize: '1rem' }}>Come Raggiungere Zuccaland</span>
          </div>
          <p style={{ color: '#78350f', fontSize: '0.85rem', margin: '0 0 0.85rem', lineHeight: 1.5 }}>
            L'evento si terrà a <strong>Gasperina (CZ)</strong>. Apri la posizione esatta con il navigatore:
          </p>
          <a
            href="https://maps.google.com/?q=38.743791,16.481122"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: '#ea580c', color: 'white', padding: '0.65rem 1.25rem',
              borderRadius: '999px', textDecoration: 'none', fontWeight: 700,
              fontSize: '0.875rem', boxShadow: '0 3px 10px rgba(234,88,12,0.3)',
            }}
          >
            🗺️ Apri su Google Maps
          </a>
          <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: '#92400e' }}>
            Coordinate GPS: <code style={{ background: '#fde68a', padding: '2px 6px', borderRadius: '4px' }}>38.743791, 16.481122</code>
          </div>
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
