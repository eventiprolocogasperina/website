'use client';

import { useState, useEffect, useRef } from 'react';
import { QrCode, CheckCircle2, XCircle, AlertTriangle, User, Ticket } from 'lucide-react';
import type { Ticket as TicketType } from '@/lib/data/tickets';
import Link from 'next/link';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'already_used';

interface ScanResult {
  status: ScanStatus;
  message: string;
  ticket?: TicketType;
}

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle', message: 'In attesa di scansione...' });
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep focus on the hidden input so barcode scanners work automatically
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, []);

  const handleScan = async (qrData: string) => {
    if (!qrData.trim()) return;
    
    setScanResult({ status: 'scanning', message: 'Verifica in corso...' });
    
    try {
      const res = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeData: qrData.trim() })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setScanResult({ status: 'success', message: data.message, ticket: data.ticket });
      } else {
        setScanResult({ 
          status: data.message.includes('già utilizzato') ? 'already_used' : 'error', 
          message: data.message,
          ticket: data.ticket 
        });
      }
    } catch (err) {
      setScanResult({ status: 'error', message: 'Errore di connessione. Riprova.' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(inputValue);
      setInputValue(''); // Clear for next scan
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neutral-950)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--neutral-800)', background: 'var(--neutral-900)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--white)', margin: 0 }}>Scanner Biglietti</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', margin: 0 }}>Assaggia & Passeggia</p>
        </div>
        <Link href="/admin" style={{ fontSize: '0.85rem', color: 'var(--blue-500)', textDecoration: 'none' }}>Torna ad Admin</Link>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        
        {/* Hidden input for hardware scanners */}
        <input 
          ref={inputRef}
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ opacity: 0, position: 'absolute', top: -1000 }}
          autoFocus
          autoComplete="off"
        />

        <div style={{ width: '100%', maxWidth: '500px' }}>
          
          {scanResult.status === 'idle' && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--neutral-900)', borderRadius: '1.5rem', border: '1px solid var(--neutral-800)' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <QrCode size={40} style={{ color: 'var(--neutral-400)' }} />
              </div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--white)', marginBottom: '0.5rem' }}>Pronto per la scansione</h2>
              <p style={{ color: 'var(--neutral-400)', fontSize: '0.9rem' }}>Usa il lettore di codici a barre o QR per scansionare un biglietto.</p>
            </div>
          )}

          {scanResult.status === 'scanning' && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--neutral-900)', borderRadius: '1.5rem', border: '1px solid var(--neutral-800)' }}>
              <div className="animate-spin" style={{ width: 60, height: 60, border: '4px solid var(--neutral-800)', borderTopColor: 'var(--blue-500)', borderRadius: '50%', margin: '0 auto 1.5rem' }} />
              <h2 style={{ fontSize: '1.25rem', color: 'var(--white)' }}>Verifica in corso...</h2>
            </div>
          )}

          {scanResult.status === 'success' && (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#064e3b', borderRadius: '1.5rem', border: '1px solid #059669', boxShadow: '0 20px 40px rgba(5,150,105,0.2)' }}>
              <CheckCircle2 size={64} style={{ color: '#34d399', margin: '0 auto 1.5rem' }} />
              <h2 style={{ fontSize: '1.75rem', color: 'white', marginBottom: '0.5rem', fontWeight: 600 }}>BIGLIETTO VALIDO</h2>
              <p style={{ color: '#a7f3d0', fontSize: '1.1rem', marginBottom: '2rem' }}>{scanResult.message}</p>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'white' }}>
                  <Ticket size={20} style={{ color: '#34d399' }} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{scanResult.ticket?.type}</span>
                </div>
              </div>
              <p style={{ color: '#6ee7b7', fontSize: '0.85rem', marginTop: '1.5rem', fontStyle: 'italic' }}>Pronto per il prossimo biglietto...</p>
            </div>
          )}

          {scanResult.status === 'already_used' && (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#78350f', borderRadius: '1.5rem', border: '1px solid #d97706', boxShadow: '0 20px 40px rgba(217,119,6,0.2)' }}>
              <AlertTriangle size={64} style={{ color: '#fbbf24', margin: '0 auto 1.5rem' }} />
              <h2 style={{ fontSize: '1.75rem', color: 'white', marginBottom: '0.5rem', fontWeight: 600 }}>ATTENZIONE</h2>
              <p style={{ color: '#fde68a', fontSize: '1.1rem', marginBottom: '2rem' }}>{scanResult.message}</p>
              
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'white' }}>
                  <Ticket size={20} style={{ color: '#fbbf24' }} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{scanResult.ticket?.type}</span>
                </div>
              </div>
              <p style={{ color: '#fcd34d', fontSize: '0.85rem', marginTop: '1.5rem', fontStyle: 'italic' }}>Pronto per il prossimo biglietto...</p>
            </div>
          )}

          {scanResult.status === 'error' && (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#7f1d1d', borderRadius: '1.5rem', border: '1px solid #dc2626', boxShadow: '0 20px 40px rgba(220,38,38,0.2)' }}>
              <XCircle size={64} style={{ color: '#f87171', margin: '0 auto 1.5rem' }} />
              <h2 style={{ fontSize: '1.75rem', color: 'white', marginBottom: '0.5rem', fontWeight: 600 }}>NON VALIDO</h2>
              <p style={{ color: '#fecaca', fontSize: '1.1rem' }}>{scanResult.message}</p>
              <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginTop: '2.5rem', fontStyle: 'italic' }}>Pronto per il prossimo biglietto...</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
