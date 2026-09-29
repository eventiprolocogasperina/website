'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, CheckCircle2, XCircle, AlertTriangle, User, Ticket, Clock, Users, Activity, Sparkles, Plus, Volume2, VolumeX, Camera, RotateCcw, WifiOff } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
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

interface ParsedNotes {
  date: string;
  adults: number;
  children: number;
  activities: string[];
}

function parseOrderNotes(notes: string): ParsedNotes {
  const result: ParsedNotes = { date: '', adults: 0, children: 0, activities: [] };
  if (!notes) return result;

  const parts = notes.split('|').map(s => s.trim());
  
  parts.forEach(part => {
    if (part.startsWith('Data:')) {
      result.date = part.replace('Data:', '').trim();
    } else if (part.startsWith('Bambini:')) {
      const match = part.match(/Bambini:\s*(\d+)\/(\d+)/);
      if (match) {
        result.children = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        result.adults = Math.max(0, total - result.children);
      }
    } else if (part.startsWith('Attività')) {
      const partsAct = part.split(':');
      if (partsAct.length > 1) {
        result.activities = partsAct[1].split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  });

  return result;
}



export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<ScanResult>({ status: 'idle', message: 'In attesa di scansione...' });
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [stats, setStats] = useState<{ totalTickets: number; totalRevenue: number; checkedIn: number } | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [validatingAll, setValidatingAll] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  // Extra states
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraDesc, setExtraDesc] = useState('');
  const [extraAmount, setExtraAmount] = useState('0');
  const [extraPaymentMethod, setExtraPaymentMethod] = useState<'CONTANTI' | 'POS'>('CONTANTI');
  const [addingExtra, setAddingExtra] = useState(false);

  const EXTRA_SUGGESTIONS = [
    { label: '+1 Adulto', defaultPrice: '5' },
    { label: '+1 Bambino', defaultPrice: '5' },
    { label: '+1 You-Pick Lab', defaultPrice: '5' },
    { label: '+1 Truccabimbi', defaultPrice: '5' }
  ];

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
    
    try {
      const saved = localStorage.getItem('recentScans');
      if (saved) {
        setRecentScans(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    localStorage.setItem('recentScans', JSON.stringify(recentScans));
  }, [recentScans]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const focusInput = () => {
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        inputRef.current?.focus();
      }
    };
    
    focusInput();
    window.addEventListener('click', focusInput);
    return () => {
      window.removeEventListener('click', focusInput);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const playBeep = useCallback((type: 'success' | 'error') => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {}
  }, [isMuted]);

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
        (data.message.includes('già stato utilizzato') || data.message.includes('già stati utilizzati') || data.message.includes('già utilizzato')) ? 'already_used' : 
        data.message.includes('Ordine trovato') ? 'order_found' : 'error'
      );

      setScanResult({ 
        status: newStatus as ScanStatus, 
        message: data.message, 
        ticket: data.ticket, 
        order: data.order, 
        orderTickets: data.orderTickets 
      });

      if (newStatus === 'success') {
        playBeep('success');
      } else {
        playBeep('error');
      }

      if (newStatus === 'success' || newStatus === 'already_used' || newStatus === 'order_found') {
        setRecentScans(prev => [{
          id: data.ticket?.id || Math.random().toString(),
          timestamp: new Date().toLocaleTimeString(),
          status: newStatus as ScanStatus,
          message: data.message,
          ticketType: data.ticket?.type || 'Ordine Multiplo',
          buyerName: data.order?.buyerName
        }, ...prev].slice(0, 10));
      }
    } catch (err) {
      playBeep('error');
      setScanResult({ status: 'error', message: 'Errore di connessione. Riprova.' });
    }
  };

  const handleValidateSingle = async (ticketId: string) => {
    try {
      const res = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeData: ticketId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          playBeep('success');
          // Refresh seamlessly
          setScanResult(prev => {
            if (!prev.orderTickets) return prev;
            return {
              ...prev,
              orderTickets: prev.orderTickets.map(t => t.id === ticketId ? { ...t, isCheckedIn: true } : t)
            };
          });
          if (data.stats) setStats(data.stats);
        } else {
          playBeep('error');
          alert(data.message);
        }
      }
    } catch(e) {
      alert('Errore di connessione.');
    }
  };

  const handleUnverifySingle = async (ticketId: string) => {
    try {
      const res = await fetch('/api/tickets/unverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId })
      });
      if (res.ok) {
        setScanResult(prev => {
          if (!prev.orderTickets) return prev;
          return {
            ...prev,
            orderTickets: prev.orderTickets.map(t => t.id === ticketId ? { ...t, isCheckedIn: false } : t)
          };
        });
        fetchStats();
      } else {
        alert('Errore durante l\'annullamento.');
      }
    } catch(e) {
      alert('Errore di connessione.');
    }
  };

  const handleValidateAll = async (tickets: TicketType[]) => {
    if (validatingAll) return;
    setValidatingAll(true);
    
    const unverified = tickets.filter(t => !t.isCheckedIn);
    let anySuccess = false;

    for (const t of unverified) {
      try {
        const res = await fetch('/api/tickets/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ qrCodeData: t.id })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) anySuccess = true;
        }
      } catch (e) {}
    }

    setValidatingAll(false);
    
    if (anySuccess) {
      playBeep('success');
      handleScan(scanResult.ticket?.id || scanResult.order?.id);
    }
  };

  const handleAddExtra = async () => {
    if (!scanResult.order || !extraDesc.trim()) {
      alert('Inserisci la descrizione del servizio extra.');
      return;
    }
    setAddingExtra(true);
    try {
      const res = await fetch('/api/orders/add-extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: scanResult.order.id, amount: extraAmount, description: `${extraDesc.trim()} (Pagamento: ${extraPaymentMethod})` })
      });
      if (res.ok) {
        alert('Servizio/Pagamento extra registrato!');
        setShowExtraForm(false);
        setExtraDesc('');
        setExtraAmount('0');
        setExtraPaymentMethod('CONTANTI');
        // Rescan to fetch new notes
        handleScan(scanResult.ticket?.id || scanResult.order.id);
      } else {
        alert('Errore durante il salvataggio.');
      }
    } catch (e) {
      alert('Errore di connessione.');
    }
    setAddingExtra(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = e.currentTarget.value;
      handleScan(val);
      setInputValue('');
      e.currentTarget.value = '';
    }
  };

  const parsedNotes = scanResult.order?.notes ? parseOrderNotes(scanResult.order.notes) : null;
  const labCount = scanResult.orderTickets?.filter(t => t.type.toLowerCase().includes('lab') || t.type.toLowerCase().includes('pick')).length || 0;
  const totalAdults = parsedNotes?.adults ?? 0;
  const totalChildren = parsedNotes?.children ?? 0;
  const activities = parsedNotes?.activities ?? [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--neutral-950)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--neutral-800)', background: 'var(--neutral-900)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--white)', margin: 0 }}>Scanner Biglietti</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', margin: 0 }}>Assaggia & Passeggia / Zuccaland</p>
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
          <button onClick={() => setIsMuted(!isMuted)} style={{ background: 'var(--neutral-800)', border: 'none', color: 'var(--white)', padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Silenzia Audio">
             {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button onClick={() => setShowCamera(!showCamera)} style={{ background: showCamera ? 'var(--blue-600)' : 'var(--neutral-800)', border: 'none', color: 'var(--white)', padding: '0.4rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Usa Fotocamera">
             <Camera size={18} />
          </button>
          <ThemeToggle />
          <Link href="/admin" style={{ fontSize: '0.85rem', color: 'var(--blue-500)', textDecoration: 'none' }}>Torna ad Admin</Link>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>

          {isOffline && (
            <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
               <WifiOff size={18} />
               Connessione di rete assente. Lo scanner potrebbe non funzionare.
            </div>
          )}

          {showCamera && (
             <div style={{ marginBottom: '1.5rem', borderRadius: '1rem', overflow: 'hidden', border: '2px solid var(--neutral-700)' }}>
               <Scanner 
                  onScan={(result) => {
                    if (result && result.length > 0) {
                       handleScan(result[0].rawValue);
                       setShowCamera(false); // Nascondi dopo una lettura di successo
                    }
                  }}
               />
             </div>
          )}
          
          <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'var(--neutral-900)', borderRadius: '1rem', border: '1px solid var(--neutral-800)' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                ref={inputRef}
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--neutral-700)', background: 'var(--neutral-950)', color: 'white', fontFamily: 'monospace' }}
                placeholder="Scannerizza QR o digita ID..."
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
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--neutral-900)', borderRadius: '1.5rem', border: '1px dashed var(--neutral-700)' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <QrCode size={40} style={{ color: 'var(--neutral-400)' }} />
              </div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--white)', marginBottom: '0.5rem' }}>Pronto per la scansione</h2>
              <p style={{ color: 'var(--neutral-400)', fontSize: '0.9rem' }}>Punta il lettore sul codice QR. La lettura è automatica.</p>
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
              padding: '1.5rem', 
              background: scanResult.status === 'success' ? '#064e3b' : scanResult.status === 'order_found' ? '#1e3a8a' : '#78350f', 
              borderRadius: '1.5rem', 
              border: `2px solid ${scanResult.status === 'success' ? '#10b981' : scanResult.status === 'order_found' ? '#3b82f6' : '#f59e0b'}`, 
              boxShadow: `0 20px 40px ${scanResult.status === 'success' ? 'rgba(5,150,105,0.2)' : scanResult.status === 'order_found' ? 'rgba(59,130,246,0.2)' : 'rgba(217,119,6,0.2)'}` 
            }}>
              
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                {scanResult.status === 'success' ? (
                  <CheckCircle2 size={56} style={{ color: '#34d399', margin: '0 auto 1rem' }} />
                ) : scanResult.status === 'order_found' ? (
                  <Users size={56} style={{ color: '#60a5fa', margin: '0 auto 1rem' }} />
                ) : (
                  <AlertTriangle size={56} style={{ color: '#fbbf24', margin: '0 auto 1rem' }} />
                )}
                <h2 style={{ fontSize: '1.8rem', color: 'white', margin: '0 0 0.5rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                  {scanResult.status === 'success' ? 'BIGLIETTO VALIDO' : scanResult.status === 'order_found' ? 'ORDINE TROVATO' : 'GIÀ UTILIZZATO'}
                </h2>
                <p style={{ color: scanResult.status === 'success' ? '#a7f3d0' : scanResult.status === 'order_found' ? '#bfdbfe' : '#fde68a', fontSize: '1.1rem', fontWeight: 500, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {scanResult.message}
                </p>
              </div>
              
              {/* === SMART PARSED BADGES === */}
              {parsedNotes && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    {parsedNotes.date && (
                      <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.1)', padding: '0.75rem 1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>Data Prenotata</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{parsedNotes.date}</span>
                      </div>
                    )}
                    
                    <div style={{ background: 'rgba(59, 130, 246, 0.25)', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.2rem', lineHeight: 1 }}>👨</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#bfdbfe', display: 'block', lineHeight: 1 }}>{totalAdults}</span>
                      <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 800 }}>Adulti</span>
                    </div>

                    <div style={{ background: 'rgba(236, 72, 153, 0.25)', border: '1px solid rgba(236, 72, 153, 0.4)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.2rem', lineHeight: 1 }}>🧒</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbcfe8', display: 'block', lineHeight: 1 }}>{totalChildren}</span>
                      <span style={{ fontSize: '0.75rem', color: '#f9a8d4', textTransform: 'uppercase', fontWeight: 800 }}>Bambini</span>
                    </div>

                    {labCount > 0 && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.25)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.2rem', lineHeight: 1 }}>🎃</span>
                        <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fde68a', display: 'block', lineHeight: 1 }}>{labCount}</span>
                        <span style={{ fontSize: '0.75rem', color: '#fcd34d', textTransform: 'uppercase', fontWeight: 800 }}>You-Pick Lab</span>
                      </div>
                    )}
                  </div>

                  {activities.length > 0 && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6ee7b7', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Activity size={14} /> Attività Confermate
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {activities.map((act, i) => (
                          <span key={i} style={{ background: 'rgba(16, 185, 129, 0.3)', color: '#fff', padding: '0.4rem 0.85rem', borderRadius: '999px', fontSize: '0.9rem', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.5)' }}>
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
              {/* === END SMART BADGES === */}

              {/* Collapsible Buyer Info */}
              {scanResult.order && (
                <details style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '0.75rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <summary style={{ padding: '1rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', cursor: 'pointer', outline: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={16} /> Mostra dettagli acquirente e pagamento
                  </summary>
                  <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Ordine</span>
                      <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.78rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', fontFamily: 'monospace' }}>
                        #{scanResult.order.id ? scanResult.order.id.replace(/-/g, '').substring(0, 8).toUpperCase() : ''}
                      </span>
                    </div>
                    <div style={{ color: 'white', fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {scanResult.order.buyerName}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.35rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                      {scanResult.order.buyerEmail && <span>📧 {scanResult.order.buyerEmail}</span>}
                      {scanResult.order.buyerPhone && <span>📱 {scanResult.order.buyerPhone}</span>}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.6rem' }}>
                      Pagamento: <strong style={{ color: scanResult.order.status === 'PAID' ? '#4ade80' : '#f87171' }}>{scanResult.order.status}</strong>
                    </div>
                  </div>
                </details>
              )}

              {/* Extra Services/Payments */}
              {scanResult.order && (
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '0.75rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  {showExtraForm ? (
                    <div style={{ padding: '1rem' }}>
                      <h4 style={{ color: 'white', margin: '0 0 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={16} color="#fbbf24" /> Aggiungi Servizio Extra
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {EXTRA_SUGGESTIONS.map(s => (
                            <button 
                              key={s.label} 
                              type="button" 
                              onClick={() => { setExtraDesc(s.label); setExtraAmount(s.defaultPrice); }} 
                              style={{ 
                                background: extraDesc === s.label ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)', 
                                color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' 
                              }}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <input 
                          type="text" 
                          placeholder="Descrizione (es: +1 Laboratorio Extra)"
                          value={extraDesc}
                          onChange={(e) => setExtraDesc(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.9rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ color: 'var(--neutral-400)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Importo (€):</span>
                          <input 
                            type="number" 
                            min="0"
                            step="0.5"
                            value={extraAmount}
                            onChange={(e) => setExtraAmount(e.target.value)}
                            style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input type="radio" name="paymethod" value="CONTANTI" checked={extraPaymentMethod === 'CONTANTI'} onChange={() => setExtraPaymentMethod('CONTANTI')} /> Contanti
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white', fontSize: '0.85rem', cursor: 'pointer' }}>
                            <input type="radio" name="paymethod" value="POS" checked={extraPaymentMethod === 'POS'} onChange={() => setExtraPaymentMethod('POS')} /> POS / Carta
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button onClick={() => setShowExtraForm(false)} style={{ flex: 1, padding: '0.6rem', background: 'transparent', color: 'var(--neutral-400)', border: '1px solid var(--neutral-600)', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>Annulla</button>
                          <button onClick={handleAddExtra} disabled={addingExtra} style={{ flex: 2, padding: '0.6rem', background: 'var(--blue-600)', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                            {addingExtra ? 'Salvataggio...' : 'Conferma & Salva'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowExtraForm(true)} style={{ width: '100%', padding: '1rem', color: '#fbbf24', fontSize: '0.85rem', cursor: 'pointer', border: 'none', outline: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent' }}>
                      <Plus size={16} /> Aggiungi Servizi Extra (Pagamento in loco)
                    </button>
                  )}
                </div>
              )}

              {/* Order Tickets Validation */}
              {scanResult.orderTickets && scanResult.orderTickets.length > 0 && (
                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '0.75rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: '0.9rem' }}>
                      Biglietti Ordine ({scanResult.orderTickets.filter(t => t.isCheckedIn).length}/{scanResult.orderTickets.length} validati)
                    </span>
                    
                    {scanResult.orderTickets.filter(t => !t.isCheckedIn).length > 0 && (
                      <button 
                        onClick={() => handleValidateAll(scanResult.orderTickets!)}
                        disabled={validatingAll}
                        style={{ 
                          background: 'white', color: '#064e3b', border: 'none', 
                          padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.85rem', 
                          fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}
                      >
                        {validatingAll ? (
                          <span className="animate-spin" style={{ width: 14, height: 14, border: '2px solid #064e3b', borderTopColor: 'transparent', borderRadius: '50%' }} />
                        ) : (
                          <Sparkles size={16} />
                        )}
                        Valida tutti i rimanenti
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {scanResult.orderTickets.map(t => (
                      <div key={t.id} style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        color: 'white', fontSize: '0.85rem', 
                        background: t.isCheckedIn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', 
                        border: t.id === scanResult.ticket?.id ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                        padding: '0.6rem 0.8rem', borderRadius: '0.5rem' 
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: t.id === scanResult.ticket?.id ? 700 : 500 }}>
                          <Ticket size={14} style={{ color: t.isCheckedIn ? '#34d399' : 'rgba(255,255,255,0.4)' }} />
                          {t.type} {t.id === scanResult.ticket?.id && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>Scansionato ora</span>}
                        </span>
                        {t.isCheckedIn ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Entrato</span>
                            <button onClick={() => handleUnverifySingle(t.id)} title="Annulla Validazione" style={{ background: 'transparent', color: '#f87171', border: '1px solid #f87171', padding: '0.2rem 0.4rem', borderRadius: '0.35rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                               <RotateCcw size={12} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleValidateSingle(t.id)} style={{ background: '#059669', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                            Valida
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {scanResult.status === 'error' && (
            <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#7f1d1d', borderRadius: '1.5rem', border: '2px solid #ef4444', boxShadow: '0 20px 40px rgba(220,38,38,0.3)' }}>
              <XCircle size={72} style={{ color: '#fca5a5', margin: '0 auto 1.5rem' }} />
              <h2 style={{ fontSize: '2rem', color: 'white', marginBottom: '0.5rem', fontWeight: 800 }}>NON VALIDO</h2>
              <p style={{ color: '#fecaca', fontSize: '1.1rem', fontWeight: 500 }}>{scanResult.message}</p>
            </div>
          )}

        </div>

        {/* Recent Scans Log */}
        <div style={{ width: '100%', maxWidth: '600px', marginTop: '3rem' }}>
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
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1rem', 
                  background: 'var(--neutral-900)', borderRadius: '0.75rem', 
                  borderLeft: `4px solid ${scan.status === 'success' ? 'var(--green-500)' : scan.status === 'order_found' ? 'var(--blue-500)' : 'var(--yellow-500)'}` 
                }}>
                  <div style={{ color: 'var(--neutral-500)', fontSize: '0.75rem', fontFamily: 'monospace', minWidth: '65px' }}>
                    {scan.timestamp}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                      {scan.buyerName || 'Sconosciuto'} <span style={{ color: 'var(--neutral-400)', fontWeight: 400, fontSize: '0.8rem' }}>• {scan.ticketType}</span>
                    </div>
                  </div>
                  <div style={{ color: scan.status === 'success' ? 'var(--green-400)' : scan.status === 'order_found' ? 'var(--blue-400)' : 'var(--yellow-400)', fontSize: '0.8rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem' }}>
                    {scan.status === 'success' ? 'Verificato' : scan.status === 'order_found' ? 'Ordine' : 'Già usato'}
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
