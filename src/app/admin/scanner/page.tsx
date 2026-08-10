'use client';

import { useState, useEffect, useRef } from 'react';
import { QrCode, CheckCircle2, XCircle, AlertTriangle, User, Ticket, Clock } from 'lucide-react';
import type { Ticket as TicketType } from '@/lib/data/tickets';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'already_used' | 'order_found';

interface ScanResult {
  status: ScanStatus;
  message: string;
  ticket?: TicketType;
  order?: any;
  orderTickets?: TicketType[];
}

interface RecentScan {
  id: string;
  timestamp: string;
  status: ScanStatus;
  message: string;
  ticketType?: string;
  buyerName?: string;
}

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle', message: 'In attesa di scansione...' });
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [stats, setStats] = useState<{ totalTickets: number; totalRevenue: number; checkedIn: number } | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch stats', e);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Load recent scans from localStorage
    try {
      const saved = localStorage.getItem('recentScans');
      if (saved) {
        setRecentScans(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse recent scans', e);
    }
  }, []);

  // Save recent scans to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('recentScans', JSON.stringify(recentScans));
  }, [recentScans]);

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
      
      if (data.stats) {
        setStats(data.stats);
      }
      
      const newStatus = data.success ? 'success' : (
        data.message.includes('già utilizzato') ? 'already_used' : 
        data.message.includes('Ordine trovato') ? 'order_found' : 'error'
      );

      setScanResult({ 
        status: newStatus as ScanStatus, 
        message: data.message, 
        ticket: data.ticket, 
        order: data.order, 
        orderTickets: data.orderTickets 
      });

      if (newStatus === 'success' || newStatus === 'already_used') {
        setRecentScans(prev => [{
          id: data.ticket?.id || Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          status: newStatus as ScanStatus,
          message: data.message,
          ticketType: data.ticket?.type,
          buyerName: data.order?.buyerName
        }, ...prev].slice(0, 10));
      }
    } catch (err) {
      setScanResult({ status: 'error', message: 'Errore di connessione. Riprova.' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = e.currentTarget.value;
      handleScan(val);
      setInputValue(''); // Clear for next scan
      e.currentTarget.value = '';
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
        
        {stats && (
          <div style={{ display: 'flex', gap: '1.5rem', background: 'var(--neutral-950)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--neutral-800)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--neutral-400)', textTransform: 'uppercase' }}>Ingressi</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--blue-400)' }}>{stats.checkedIn} <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>/ {stats.totalTickets}</span></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--neutral-400)', textTransform: 'uppercase' }}>Rimanenti</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--white)' }}>{stats.totalTickets - stats.checkedIn}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ThemeToggle />
          <Link href="/admin" style={{ fontSize: '0.85rem', color: 'var(--blue-500)', textDecoration: 'none' }}>Torna ad Admin</Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        
        <div style={{ width: '100%', maxWidth: '500px' }}>
          
          {/* Manual Input Form */}
          <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--neutral-900)', borderRadius: '1rem', border: '1px solid var(--neutral-800)' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--neutral-400)', fontSize: '0.9rem' }}>Inserimento Manuale o Scansione Rapida</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                ref={inputRef}
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--neutral-700)', background: 'var(--neutral-950)', color: 'white', fontFamily: 'monospace' }}
                placeholder="Scannerizza o digita l'ID del biglietto"
                autoFocus
                autoComplete="off"
              />
              <button 
                onClick={() => { handleScan(inputValue); setInputValue(''); }}
                style={{ padding: '0 1.5rem', borderRadius: '0.5rem', background: 'var(--blue-500)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Verifica
              </button>
            </div>
          </div>

          {scanResult.status === 'idle' && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--neutral-900)', borderRadius: '1.5rem', border: '1px solid var(--neutral-800)' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <QrCode size={40} style={{ color: 'var(--neutral-400)' }} />
              </div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--white)', marginBottom: '0.5rem' }}>Pronto per la scansione</h2>
              <p style={{ color: 'var(--neutral-400)', fontSize: '0.9rem' }}>Usa il lettore di codici a barre, QR, oppure digita manualmente il codice del biglietto.</p>
            </div>
          )}

          {scanResult.status === 'scanning' && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--neutral-900)', borderRadius: '1.5rem', border: '1px solid var(--neutral-800)' }}>
              <div className="animate-spin" style={{ width: 60, height: 60, border: '4px solid var(--neutral-800)', borderTopColor: 'var(--blue-500)', borderRadius: '50%', margin: '0 auto 1.5rem' }} />
              <h2 style={{ fontSize: '1.25rem', color: 'var(--white)' }}>Verifica in corso...</h2>
            </div>
          )}

          {(scanResult.status === 'success' || scanResult.status === 'already_used' || scanResult.status === 'order_found') && (
            <div style={{ 
              textAlign: 'center', padding: '2rem', 
              background: scanResult.status === 'success' ? '#064e3b' : scanResult.status === 'order_found' ? '#1e3a8a' : '#78350f', 
              borderRadius: '1.5rem', 
              border: `1px solid ${scanResult.status === 'success' ? '#059669' : scanResult.status === 'order_found' ? '#3b82f6' : '#d97706'}`, 
              boxShadow: `0 20px 40px ${scanResult.status === 'success' ? 'rgba(5,150,105,0.2)' : scanResult.status === 'order_found' ? 'rgba(59,130,246,0.2)' : 'rgba(217,119,6,0.2)'}` 
            }}>
              {scanResult.status === 'success' ? (
                <CheckCircle2 size={64} style={{ color: '#34d399', margin: '0 auto 1.5rem' }} />
              ) : scanResult.status === 'order_found' ? (
                <User size={64} style={{ color: '#60a5fa', margin: '0 auto 1.5rem' }} />
              ) : (
                <AlertTriangle size={64} style={{ color: '#fbbf24', margin: '0 auto 1.5rem' }} />
              )}
              
              <h2 style={{ fontSize: '1.75rem', color: 'white', marginBottom: '0.5rem', fontWeight: 600 }}>
                {scanResult.status === 'success' ? 'BIGLIETTO VALIDO' : scanResult.status === 'order_found' ? 'ORDINE TROVATO' : 'ATTENZIONE'}
              </h2>
              <p style={{ color: scanResult.status === 'success' ? '#a7f3d0' : scanResult.status === 'order_found' ? '#bfdbfe' : '#fde68a', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                {scanResult.message}
              </p>
              
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'left', marginBottom: '1rem' }}>
                {scanResult.ticket && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'white' }}>
                    <Ticket size={20} style={{ color: scanResult.status === 'success' ? '#34d399' : '#fbbf24' }} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{scanResult.ticket.type}</span>
                  </div>
                )}
                {scanResult.order && (
                  <div style={{ borderTop: scanResult.ticket ? '1px solid rgba(255,255,255,0.1)' : 'none', paddingTop: scanResult.ticket ? '1rem' : 0, marginTop: scanResult.ticket ? '1rem' : 0 }}>
                    <div style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Dettagli Ordine</div>
                    <div style={{ color: 'white', fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={16} /> {scanResult.order.buyerName}
                    </div>
                    <div style={{ color: 'var(--neutral-400)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      Stato Pagamento: <strong style={{ color: scanResult.order.status === 'PAID' ? '#4ade80' : '#f87171' }}>{scanResult.order.status}</strong>
                    </div>
                  </div>
                )}
                {scanResult.orderTickets && scanResult.orderTickets.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <div style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Tutti i biglietti dell'ordine ({scanResult.orderTickets.length})</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {scanResult.orderTickets.map(t => (
                        <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white', fontSize: '0.9rem', marginBottom: '0.5rem', background: t.id === scanResult.ticket?.id ? 'rgba(255,255,255,0.1)' : 'transparent', padding: '0.5rem', borderRadius: '0.25rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Ticket size={14} style={{ color: 'var(--neutral-400)' }} />
                            {t.type} {t.id === scanResult.ticket?.id && '(Questo)'}
                          </span>
                          <span style={{ color: t.isCheckedIn ? '#4ade80' : '#f87171' }}>
                             {t.isCheckedIn ? 'Validato' : 'Non Validato'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <p style={{ color: scanResult.status === 'success' ? '#6ee7b7' : '#fcd34d', fontSize: '0.85rem', marginTop: '1.5rem', fontStyle: 'italic' }}>
                Pronto per il prossimo biglietto... (puoi scannerizzare subito)
              </p>
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

        {/* Recent Scans Log */}
        <div style={{ width: '100%', maxWidth: '500px', marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--white)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} style={{ color: 'var(--neutral-400)' }} />
            Scansioni Recenti
          </h3>
          
          {recentScans.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-500)', background: 'var(--neutral-900)', borderRadius: '1rem', border: '1px dashed var(--neutral-800)' }}>
              Nessuna scansione recente.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentScans.map((scan, i) => (
                <div key={i} style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', 
                  background: 'var(--neutral-900)', borderRadius: '0.5rem', 
                  borderLeft: `4px solid ${scan.status === 'success' ? 'var(--green-500)' : 'var(--yellow-500)'}` 
                }}>
                  <div style={{ color: 'var(--neutral-400)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    {scan.timestamp}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500 }}>
                      {scan.buyerName} <span style={{ color: 'var(--neutral-400)', fontWeight: 400 }}>- {scan.ticketType}</span>
                    </div>
                    <div style={{ color: scan.status === 'success' ? 'var(--green-400)' : 'var(--yellow-400)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      {scan.status === 'success' ? '✅ Verificato' : '⚠️ Già utilizzato'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
