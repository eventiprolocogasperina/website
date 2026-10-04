'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  CashierItem,
  CashierOrder,
  CashierStats
} from '@/lib/data/cashier';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  CreditCard,
  Banknote,
  Gift,
  RefreshCw,
  LogOut,
  BarChart3,
  History,
  X,
  Search,
  AlertCircle,
  QrCode,
  ArrowRight,
  Maximize2,
  Minimize2,
  Lock,
  Sparkles,
  Printer
} from 'lucide-react';

// ─── Sound Feedback (Web Audio API) ──────────────────────────────────────────

function playSound(type: 'beep' | 'success' | 'delete') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      // Pleasant two-tone chime
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.12, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.25);
      });
    } else if (type === 'delete') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch {
    // Ignore audio autoplay restrictions
  }
}

// ─── Default Cassa Options ───────────────────────────────────────────────────

const CASSA_PRESETS = ['Cassa 1', 'Cassa 2', 'Cassa 3', 'Cassa Bar', 'Stand Dolci'];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CashierClient() {
  // Session State
  const [eventCode, setEventCode] = useState('');
  const [cassaName, setCassaName] = useState('Cassa 1');
  const [operatorName, setOperatorName] = useState('');
  const [session, setSession] = useState<{
    eventId: string;
    eventName: string;
    categories: string[];
    items: CashierItem[];
    notes?: string;
  } | null>(null);

  // UI State
  const [loadingSession, setLoadingSession] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('TUTTI');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CONTANTI' | 'POS' | 'OMAGGIO'>('CONTANTI');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [omaggioNote, setOmaggioNote] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  
  // Order Completed / QR Modal State
  const [completedOrder, setCompletedOrder] = useState<{
    order: CashierOrder;
    receiptUrl: string;
    qrCodeDataUrl: string;
  } | null>(null);

  // Closing Z-Report Modal State
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [zStats, setZStats] = useState<CashierStats | null>(null);
  const [loadingZStats, setLoadingZStats] = useState(false);
  const [zFilterCassa, setZFilterCassa] = useState<string>('all');

  // Recent Orders Drawer State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<CashierOrder[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── Initial Session Load from LocalStorage ────────────────────────────────

  useEffect(() => {
    const savedCode = localStorage.getItem('cashier_event_code');
    const savedCassa = localStorage.getItem('cashier_cassa_name') || 'Cassa 1';
    const savedOperator = localStorage.getItem('cashier_operator_name') || '';

    setCassaName(savedCassa);
    setOperatorName(savedOperator);

    if (savedCode) {
      setEventCode(savedCode);
      authenticateSession(savedCode, false);
    }
  }, []);

  const authenticateSession = async (codeToUse: string, isManualSubmit = true) => {
    if (!codeToUse.trim()) {
      if (isManualSubmit) setLoginError('Inserisci il codice evento');
      return;
    }

    setLoadingSession(true);
    setLoginError('');

    try {
      const res = await fetch('/api/cashier/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCode: codeToUse.trim() })
      });
      const data = await res.json();

      if (data.success && data.event) {
        setSession(data.event);
        localStorage.setItem('cashier_event_code', codeToUse.trim().toUpperCase());
        localStorage.setItem('cashier_cassa_name', cassaName);
        if (operatorName) {
          localStorage.setItem('cashier_operator_name', operatorName);
        }
      } else {
        setLoginError(data.error || 'Codice evento non valido');
        if (!isManualSubmit) {
          localStorage.removeItem('cashier_event_code');
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'Errore di connessione al server');
    } finally {
      setLoadingSession(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Vuoi davvero uscire dalla sessione cassa corrente?')) {
      localStorage.removeItem('cashier_event_code');
      setSession(null);
      setCart({});
      setCompletedOrder(null);
    }
  };

  const refreshMenu = async () => {
    if (!session) return;
    const savedCode = localStorage.getItem('cashier_event_code') || eventCode;
    if (savedCode) {
      await authenticateSession(savedCode, false);
    }
  };

  // ─── Cart Calculations ─────────────────────────────────────────────────────

  const cartList = useMemo(() => {
    if (!session) return [];
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const item = session.items.find(i => i.id === id);
        if (!item || quantity <= 0) return null;
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          price: item.price,
          quantity,
          subtotal: item.price * quantity
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        name: string;
        category: string;
        price: number;
        quantity: number;
        subtotal: number;
      }>;
  }, [cart, session]);

  const totalAmount = useMemo(() => {
    return cartList.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cartList]);

  const totalItemsCount = useMemo(() => {
    return cartList.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartList]);

  const addToCart = (item: CashierItem) => {
    if (!item.isAvailable) return;
    playSound('beep');
    setCart(prev => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1
    }));
  };

  const decreaseQuantity = (itemId: string) => {
    playSound('delete');
    setCart(prev => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: current - 1 };
    });
  };

  const clearCart = () => {
    if (totalItemsCount > 0 && confirm('Vuoi svuotare l\'intero carrello?')) {
      playSound('delete');
      setCart({});
    }
  };

  // Fast Sold Out Toggle on long press / right click
  const toggleItemAvailability = async (item: CashierItem, e: React.MouseEvent) => {
    e.preventDefault();
    if (!session) return;
    const newStatus = !item.isAvailable;
    const confirmMsg = newStatus
      ? `Rendere di nuovo DISPONIBILE "${item.name}"?`
      : `Segnare come ESAURITO / FINITO "${item.name}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/cashier/item-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: session.eventId,
          itemId: item.id,
          isAvailable: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        setSession(prev => prev ? {
          ...prev,
          items: prev.items.map(it => it.id === item.id ? { ...it, isAvailable: newStatus } : it)
        } : null);
      }
    } catch (err) {
      alert('Impossibile aggiornare lo stato del piatto');
    }
  };

  // ─── Filtered Items ────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    if (!session) return [];
    return session.items.filter(item => {
      const matchesCategory = activeCategory === 'TUTTI' || item.category === activeCategory;
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [session, activeCategory, searchQuery]);

  // ─── Change Calculator ─────────────────────────────────────────────────────

  const cashChange = useMemo(() => {
    if (paymentMethod !== 'CONTANTI' || typeof cashReceived !== 'number') return 0;
    return Math.max(0, cashReceived - totalAmount);
  }, [paymentMethod, cashReceived, totalAmount]);

  const isCashInsufficient = useMemo(() => {
    if (paymentMethod !== 'CONTANTI' || cashReceived === '') return false;
    return typeof cashReceived === 'number' && cashReceived < totalAmount;
  }, [paymentMethod, cashReceived, totalAmount]);

  const handleOpenCheckout = () => {
    if (totalItemsCount === 0) return;
    setPaymentMethod('CONTANTI');
    setCashReceived(totalAmount); // default to exact amount
    setOmaggioNote('');
    setIsCheckoutOpen(true);
  };

  // ─── Submit Cashier Order ──────────────────────────────────────────────────

  const handleSubmitOrder = async () => {
    if (!session || cartList.length === 0 || submittingOrder) return;

    if (paymentMethod === 'CONTANTI' && isCashInsufficient) {
      alert('L\'importo in contanti ricevuto è inferiore al totale del contributo!');
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await fetch('/api/cashier/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: session.eventId,
          eventName: session.eventName,
          cassaName,
          operatorName: operatorName || undefined,
          totalAmount,
          paymentMethod,
          cashReceived: paymentMethod === 'CONTANTI' ? (typeof cashReceived === 'number' ? cashReceived : totalAmount) : undefined,
          cashChange: paymentMethod === 'CONTANTI' ? cashChange : undefined,
          omaggioNote: paymentMethod === 'OMAGGIO' ? (omaggioNote || 'Omaggio Pro Loco') : undefined,
          items: cartList
        })
      });

      const data = await res.json();
      if (data.success && data.order) {
        playSound('success');
        setCompletedOrder({
          order: data.order,
          receiptUrl: data.receiptUrl,
          qrCodeDataUrl: data.qrCodeDataUrl
        });
        setIsCheckoutOpen(false);
        setCart({});
      } else {
        alert(data.error || 'Errore nella registrazione dell\'ordine');
      }
    } catch (err: any) {
      alert(err.message || 'Errore di connessione');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // ─── Fetch Stats (Chiusura Cassa) ──────────────────────────────────────────

  const fetchZStats = async (cassaFilter: string) => {
    if (!session) return;
    setLoadingZStats(true);
    try {
      const url = `/api/cashier/stats?eventId=${session.eventId}${cassaFilter !== 'all' ? `&cassaName=${encodeURIComponent(cassaFilter)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.stats) {
        setZStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingZStats(false);
    }
  };

  const handleOpenZReport = () => {
    setIsZReportOpen(true);
    fetchZStats(zFilterCassa);
  };

  // ─── Fetch Recent Orders ───────────────────────────────────────────────────

  const fetchRecentOrders = async () => {
    if (!session) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/cashier/orders?eventId=${session.eventId}&cassaName=${encodeURIComponent(cassaName)}`);
      const data = await res.json();
      if (data.success && data.orders) {
        setRecentOrders(data.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    setIsHistoryOpen(true);
    fetchRecentOrders();
  };

  // ─── Fullscreen Toggle ─────────────────────────────────────────────────────

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. LOGIN / ACCESS VIEW
  // ═════════════════════════════════════════════════════════════════════════════

  if (!session) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 30%, #1e293b 0%, #090d16 100%)',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: 'var(--font-body, system-ui, sans-serif)'
      }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          background: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '1.75rem',
          padding: '2.25rem 1.75rem',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.7)',
          textAlign: 'center'
        }}>
          {/* Pro Loco Header */}
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            borderRadius: '1rem',
            margin: '0 auto 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37,99,235,0.35)'
          }}>
            <Lock size={30} color="#ffffff" />
          </div>

          <div style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#38bdf8',
            marginBottom: '0.25rem'
          }}>
            Pro Loco Gasperina APS
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.5px' }}>
            Cassa Eventi & Sagre
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1.75rem', lineHeight: 1.4 }}>
            Inserisci il codice evento configurato nel CMS per sbloccare il registratore di cassa e il listino contributi.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); authenticateSession(eventCode); }}>
            {/* Input Codice Evento */}
            <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                🔑 Codice Evento (PIN)
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Es. FESTA2026"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '0.9rem 1rem',
                  borderRadius: '1rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Scelta Postazione Cassa (Multi-cassa) */}
            <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                🏷️ Postazione Cassa
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '0.4rem' }}>
                {CASSA_PRESETS.slice(0, 3).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCassaName(preset)}
                    style={{
                      padding: '0.55rem',
                      borderRadius: '0.75rem',
                      border: `1.5px solid ${cassaName === preset ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                      background: cassaName === preset ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                      color: cassaName === preset ? '#38bdf8' : '#cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                {CASSA_PRESETS.slice(3).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCassaName(preset)}
                    style={{
                      padding: '0.55rem',
                      borderRadius: '0.75rem',
                      border: `1.5px solid ${cassaName === preset ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                      background: cassaName === preset ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.5)',
                      color: cassaName === preset ? '#38bdf8' : '#cbd5e1',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome Operatore (Facoltativo) */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                👤 Nome Volontario / Operatore (Facoltativo)
              </label>
              <input
                type="text"
                placeholder="Es. Antonio"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '0.85rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {loginError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.7rem',
                borderRadius: '0.75rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}>
                <AlertCircle size={16} /> {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingSession}
              style={{
                width: '100%',
                padding: '0.95rem',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '1.05rem',
                cursor: loadingSession ? 'wait' : 'pointer',
                boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loadingSession ? 'Accesso in corso...' : <>ACCEDI ALLA CASSA <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. MAIN CASHIER INTERFACE
  // ═════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
      overflowX: 'hidden'
    }}>

      {/* ── Top Cashier Bar ── */}
      <header style={{
        background: '#0f172a',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.65rem',
        zIndex: 40
      }}>
        {/* Left: Event info & Cassa badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: 'white',
            padding: '0.35rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Sparkles size={14} style={{ color: '#fbbf24' }} /> Pro Loco
          </div>

          <div>
            <strong style={{ fontSize: '1rem', color: '#ffffff', display: 'block', lineHeight: 1.2 }}>
              {session.eventName}
            </strong>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ color: '#4ade80', fontWeight: 800 }}>● {cassaName}</span>
              {operatorName && <span>| Op: <strong>{operatorName}</strong></span>}
            </div>
          </div>
        </div>

        {/* Right: Actions (Chiusura cassa, Cronologia, Refresh, Fullscreen, Logout) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenZReport}
            title="Chiusura Cassa e Riepilogo Contributi"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.8rem',
              borderRadius: '0.75rem',
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#facc15',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <BarChart3 size={15} /> Chiusura Cassa
          </button>

          <button
            onClick={handleOpenHistory}
            title="Ultimi ordini emessi da questa cassa"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.8rem',
              borderRadius: '0.75rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <History size={15} /> Storico
          </button>

          <button
            onClick={refreshMenu}
            title="Ricarica menu dal CMS"
            style={{
              padding: '0.45rem',
              borderRadius: '0.75rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Schermo intero (POS mode)"
            style={{
              padding: '0.45rem',
              borderRadius: '0.75rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              cursor: 'pointer'
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button
            onClick={handleLogout}
            title="Cambia cassa o evento"
            style={{
              padding: '0.45rem',
              borderRadius: '0.75rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              cursor: 'pointer'
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── Main Content Area: Split 2 columns (Menu & Cart) ── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        overflow: 'hidden'
      }} className="cashier-grid">

        {/* LEFT COLUMN: CATEGORIES & DISHES */}
        <main style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem',
          overflowY: 'auto',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Category Tabs & Search */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.2rem', flex: 1 }}>
              {['TUTTI', ...session.categories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '0.85rem',
                    border: `1.5px solid ${activeCategory === cat ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                    background: activeCategory === cat ? '#0284c7' : 'rgba(30, 41, 59, 0.6)',
                    color: activeCategory === cat ? '#ffffff' : '#94a3b8',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div style={{ position: 'relative', width: '180px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Cerca piatto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem 0.5rem 2rem',
                  borderRadius: '0.75rem',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Dish Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: '0.75rem',
            alignContent: 'start'
          }}>
            {filteredItems.map(item => {
              const inCartQty = cart[item.id] || 0;
              const isAvailable = item.isAvailable;

              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  onContextMenu={(e) => toggleItemAvailability(item, e)}
                  disabled={!isAvailable}
                  style={{
                    position: 'relative',
                    background: !isAvailable
                      ? 'rgba(15, 23, 42, 0.4)'
                      : inCartQty > 0
                      ? 'rgba(14, 165, 233, 0.12)'
                      : 'rgba(30, 41, 59, 0.65)',
                    border: !isAvailable
                      ? '1.5px dashed rgba(239, 68, 68, 0.4)'
                      : inCartQty > 0
                      ? '2px solid #38bdf8'
                      : '1.5px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '1.25rem',
                    padding: '1.15rem 0.9rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: '140px',
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                    transition: 'all 0.12s ease-out',
                    textAlign: 'center',
                    boxShadow: inCartQty > 0 ? '0 8px 20px rgba(14, 165, 233, 0.2)' : 'none',
                    opacity: isAvailable ? 1 : 0.6
                  }}
                >
                  {/* Quantity In Cart Pill */}
                  {inCartQty > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#0284c7',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      borderRadius: '999px',
                      padding: '2px 8px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                    }}>
                      {inCartQty}x
                    </div>
                  )}

                  {/* Sold out Badge */}
                  {!isAvailable && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      borderRadius: '999px',
                      padding: '2px 6px',
                      textTransform: 'uppercase'
                    }}>
                      Esaurito
                    </div>
                  )}

                  {/* Emoji Icon */}
                  <span style={{ fontSize: '2.5rem', marginBottom: '0.4rem', lineHeight: 1 }}>
                    {item.icon || '🍽️'}
                  </span>

                  {/* Name */}
                  <div style={{
                    fontSize: '0.92rem',
                    fontWeight: 750,
                    color: isAvailable ? '#f1f5f9' : '#94a3b8',
                    lineHeight: 1.25,
                    marginBottom: '0.5rem',
                    textDecoration: isAvailable ? 'none' : 'line-through'
                  }}>
                    {item.name}
                  </div>

                  {/* Contribution Price Badge */}
                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 900,
                    color: inCartQty > 0 ? '#38bdf8' : '#34d399',
                    fontFamily: 'monospace'
                  }}>
                    €{Number(item.price).toFixed(2)}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Nessun piatto trovato per questa categoria o ricerca.
            </div>
          )}
        </main>

        {/* RIGHT COLUMN: CART / SCONTRINO CONTRIBUTI */}
        <aside style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#0b1120',
          padding: '1rem',
          height: 'calc(100vh - 60px)',
          boxSizing: 'border-box'
        }}>
          {/* Cart Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '0.75rem',
            marginBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} style={{ color: '#38bdf8' }} />
              <strong style={{ fontSize: '1rem', color: '#fff' }}>
                Riepilogo Ordine ({totalItemsCount})
              </strong>
            </div>

            {totalItemsCount > 0 && (
              <button
                onClick={clearCart}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Trash2 size={13} /> Svuota
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            paddingRight: '0.25rem'
          }}>
            {cartList.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                textAlign: 'center',
                padding: '2rem'
              }}>
                <ShoppingCart size={40} strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Il carrello è vuoto</p>
                <span style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>Tocca i piatti nel listino per iniziare l&apos;ordine</span>
              </div>
            ) : (
              cartList.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '0.85rem',
                    padding: '0.65rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      €{Number(item.price).toFixed(2)} cad.
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      onClick={() => decreaseQuantity(item.id)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: 'none',
                        color: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => addToCart(session.items.find(i => i.id === item.id)!)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '0.5rem',
                        background: '#0284c7',
                        border: 'none',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <strong style={{ minWidth: '60px', textAlign: 'right', fontWeight: 900, color: '#34d399', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                    €{Number(item.subtotal).toFixed(2)}
                  </strong>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          <div style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '0.85rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TOTALE CONTRIBUTO
              </span>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', lineHeight: 1 }}>
                €{Number(totalAmount).toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleOpenCheckout}
              disabled={totalItemsCount === 0}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '1rem',
                background: totalItemsCount > 0
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'rgba(255, 255, 255, 0.08)',
                color: totalItemsCount > 0 ? '#ffffff' : '#64748b',
                border: 'none',
                fontWeight: 900,
                fontSize: '1.15rem',
                cursor: totalItemsCount > 0 ? 'pointer' : 'not-allowed',
                boxShadow: totalItemsCount > 0 ? '0 8px 24px rgba(16, 185, 129, 0.4)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s'
              }}
            >
              REGISTRA CONTRIBUTO <ArrowRight size={20} />
            </button>
          </div>
        </aside>

      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. CHECKOUT / VERSAMENTO MODAL (with Calcolatore Resto Rapido)
      ═══════════════════════════════════════════════════════════════════════ */}
      {isCheckoutOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#0f172a',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: '1.75rem',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                  Modalità di Versamento
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Registrazione contributo per {session.eventName}
                </span>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Total Display */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.7)',
              borderRadius: '1.25rem',
              padding: '1rem 1.25rem',
              textAlign: 'center',
              marginBottom: '1.25rem',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                Importo Contributo da Versare
              </span>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                €{Number(totalAmount).toFixed(2)}
              </div>
            </div>

            {/* 3 Payment Methods Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => { setPaymentMethod('CONTANTI'); setCashReceived(totalAmount); }}
                style={{
                  padding: '0.85rem 0.5rem',
                  borderRadius: '1rem',
                  border: `2px solid ${paymentMethod === 'CONTANTI' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                  background: paymentMethod === 'CONTANTI' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                  color: paymentMethod === 'CONTANTI' ? '#34d399' : '#cbd5e1',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Banknote size={22} />
                <span>Contanti</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('POS')}
                style={{
                  padding: '0.85rem 0.5rem',
                  borderRadius: '1rem',
                  border: `2px solid ${paymentMethod === 'POS' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                  background: paymentMethod === 'POS' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                  color: paymentMethod === 'POS' ? '#38bdf8' : '#cbd5e1',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <CreditCard size={22} />
                <span>Carta / POS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('OMAGGIO')}
                style={{
                  padding: '0.85rem 0.5rem',
                  borderRadius: '1rem',
                  border: `2px solid ${paymentMethod === 'OMAGGIO' ? '#fb923c' : 'rgba(255,255,255,0.1)'}`,
                  background: paymentMethod === 'OMAGGIO' ? 'rgba(251, 146, 60, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                  color: paymentMethod === 'OMAGGIO' ? '#fb923c' : '#cbd5e1',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Gift size={22} />
                <span>Omaggio</span>
              </button>
            </div>

            {/* CONTANTI: CALCOLATORE RESTO RAPIDO */}
            {paymentMethod === 'CONTANTI' && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                borderRadius: '1.25rem',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '1.15rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '0.65rem' }}>
                  🪙 CALCOLATORE RESTO RAPIDO
                </div>

                {/* Quick denomination buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {[
                    { label: 'Esatto', val: totalAmount },
                    { label: '€10', val: 10 },
                    { label: '€20', val: 20 },
                    { label: '€50', val: 50 },
                    { label: '€100', val: 100 }
                  ].map(btn => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => setCashReceived(btn.val)}
                      style={{
                        padding: '0.55rem 0.2rem',
                        borderRadius: '0.65rem',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: cashReceived === btn.val ? '#0284c7' : 'rgba(30, 41, 59, 0.8)',
                        color: cashReceived === btn.val ? '#fff' : '#cbd5e1',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* Input contanti ricevuti */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                      Denaro ricevuto (€)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      min={0}
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.7rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(0,0,0,0.4)',
                        border: `1.5px solid ${isCashInsufficient ? '#ef4444' : '#38bdf8'}`,
                        color: '#fff',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Resto da dare */}
                  <div style={{
                    flex: 1,
                    background: isCashInsufficient ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: `1.5px solid ${isCashInsufficient ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                    borderRadius: '0.75rem',
                    padding: '0.7rem',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isCashInsufficient ? '#ef4444' : '#34d399', textTransform: 'uppercase' }}>
                      {isCashInsufficient ? 'Mancano' : 'Resto da Dare'}
                    </span>
                    <div style={{
                      fontSize: '1.45rem',
                      fontWeight: 900,
                      color: isCashInsufficient ? '#ef4444' : '#34d399',
                      fontFamily: 'monospace',
                      marginTop: '0.1rem'
                    }}>
                      {isCashInsufficient && typeof cashReceived === 'number'
                        ? `-€${(totalAmount - cashReceived).toFixed(2)}`
                        : `€${cashChange.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OMAGGIO: NOTE RAPIDE */}
            {paymentMethod === 'OMAGGIO' && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                borderRadius: '1.25rem',
                border: '1px solid rgba(251, 146, 60, 0.3)',
                padding: '1.15rem',
                marginBottom: '1.25rem'
              }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fb923c', display: 'block', marginBottom: '0.4rem' }}>
                  Motivazione Omaggio (Facoltativa)
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                  {['Staff / Volontari', 'Ospite d\'Onore', 'Sponsor', 'Associazione'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setOmaggioNote(tag)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '999px',
                        background: omaggioNote === tag ? '#fb923c' : 'rgba(255,255,255,0.08)',
                        color: omaggioNote === tag ? '#000' : '#cbd5e1',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Es. Tavolo Giuria, Presidente, ecc."
                  value={omaggioNote}
                  onChange={(e) => setOmaggioNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {/* Confirm Order Button */}
            <button
              onClick={handleSubmitOrder}
              disabled={submittingOrder || (paymentMethod === 'CONTANTI' && isCashInsufficient)}
              style={{
                width: '100%',
                padding: '1.1rem',
                borderRadius: '1rem',
                background: (paymentMethod === 'CONTANTI' && isCashInsufficient)
                  ? '#475569'
                  : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 900,
                fontSize: '1.15rem',
                cursor: (paymentMethod === 'CONTANTI' && isCashInsufficient) ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {submittingOrder ? 'Emissione Ricevuta...' : <>CONFERMA E STACCA RICEVUTA <CheckCircle2 size={20} /></>}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          4. ORDER COMPLETED / QR CODE RECEIPT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {completedOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '1.75rem',
            padding: '2rem 1.5rem',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
            textAlign: 'center',
            position: 'relative'
          }}>
            <button
              onClick={() => setCompletedOrder(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(0,0,0,0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            {/* Checkmark Banner */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#16a34a',
              margin: '0 auto 0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Ordine Concluso con Successo
            </div>

            {/* GIANT PROGRESSIVE NUMBER */}
            <div style={{
              background: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: '1.25rem',
              padding: '1rem',
              margin: '1rem 0'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                Numero Progressivo
              </span>
              <div style={{
                fontSize: '4.5rem',
                fontWeight: 900,
                color: '#1e3a8a',
                lineHeight: 1,
                fontFamily: 'monospace',
                margin: '0.25rem 0'
              }}>
                #{String(completedOrder.order.orderNumber).padStart(3, '0')}
              </div>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 750,
                background: '#e2e8f0',
                color: '#334155',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px'
              }}>
                {completedOrder.order.cassaName}
              </span>
            </div>

            {/* GIANT QR CODE FOR CUSTOMER TO SCAN */}
            {completedOrder.qrCodeDataUrl && (
              <div style={{ margin: '1.25rem 0' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '0.75rem',
                  background: 'white',
                  borderRadius: '1rem',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0'
                }}>
                  <Image
                    src={completedOrder.qrCodeDataUrl}
                    alt="QR Code Ricevuta Digitale"
                    width={180}
                    height={180}
                    unoptimized
                    style={{ display: 'block' }}
                  />
                </div>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#475569',
                  marginTop: '0.65rem'
                }}>
                  📱 Inquadra con il telefono per la ricevuta digitale
                </div>
              </div>
            )}

            {/* Summary info */}
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Totale Contributo: <strong>€{Number(completedOrder.order.totalAmount).toFixed(2)}</strong> ({completedOrder.order.paymentMethod})
              {completedOrder.order.cashChange !== undefined && completedOrder.order.cashChange > 0 && (
                <div style={{ color: '#16a34a', fontWeight: 800, marginTop: '0.2rem' }}>
                  Resto dato al cliente: €{Number(completedOrder.order.cashChange).toFixed(2)}
                </div>
              )}
            </div>

            {/* Next Customer Button */}
            <button
              onClick={() => setCompletedOrder(null)}
              style={{
                width: '100%',
                padding: '0.95rem',
                borderRadius: '1rem',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 900,
                fontSize: '1.1rem',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(37,99,235,0.35)'
              }}
            >
              PROSSIMO CLIENTE <ArrowRight size={18} style={{ verticalAlign: 'middle', marginLeft: '0.4rem' }} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          5. CHIUSURA CASSA / Z-REPORT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {isZReportOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            maxWidth: '650px',
            width: '100%',
            background: '#0f172a',
            border: '1.5px solid rgba(255,255,255,0.15)',
            borderRadius: '1.75rem',
            padding: '1.75rem',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#facc15', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={22} /> Chiusura Cassa (Z-Report)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Riepilogo contributi raccolti per {session.eventName}
                </span>
              </div>
              <button
                onClick={() => setIsZReportOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Filter by Cassa */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
              {['all', ...CASSA_PRESETS].map(c => (
                <button
                  key={c}
                  onClick={() => { setZFilterCassa(c); fetchZStats(c); }}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: '999px',
                    border: `1px solid ${zFilterCassa === c ? '#facc15' : 'rgba(255,255,255,0.1)'}`,
                    background: zFilterCassa === c ? 'rgba(250, 204, 21, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: zFilterCassa === c ? '#facc15' : '#cbd5e1',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {c === 'all' ? 'Tutte le Casse' : c}
                </button>
              ))}
            </div>

            {loadingZStats || !zStats ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                Caricamento dati di cassa in tempo reale...
              </div>
            ) : (
              <div>
                {/* 4 Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'rgba(30,41,59,0.7)', borderRadius: '1rem', padding: '0.85rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>TOTALE GENERALE</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                      €{zStats.totalAmount.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{zStats.completedOrders} ordini</span>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '1rem', padding: '0.85rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>CONTANTI</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
                      €{zStats.cashAmount.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', borderRadius: '1rem', padding: '0.85rem', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>CARTA / POS</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                      €{zStats.posAmount.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(251, 146, 60, 0.1)', borderRadius: '1rem', padding: '0.85rem', border: '1px solid rgba(251, 146, 60, 0.3)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#fb923c', fontWeight: 700 }}>OMAGGI</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fb923c', fontFamily: 'monospace' }}>
                      €{zStats.omaggioAmount.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Items Sold Breakdown */}
                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '0.65rem' }}>
                  🍽️ Dettaglio Piatti e Quantità Vendute
                </h4>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left', color: '#94a3b8' }}>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Piatto</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>Q.tà</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Totale Contributo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(zStats.itemsBreakdown).length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
                            Nessun articolo battuto al momento
                          </td>
                        </tr>
                      ) : (
                        Object.values(zStats.itemsBreakdown)
                          .sort((a, b) => b.quantity - a.quantity)
                          .map((item, idx) => (
                            <tr key={idx} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.55rem 0.8rem', fontWeight: 650 }}>{item.name}</td>
                              <td style={{ padding: '0.55rem 0.8rem', textAlign: 'center', fontWeight: 800, color: '#38bdf8' }}>
                                {item.quantity}x
                              </td>
                              <td style={{ padding: '0.55rem 0.8rem', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>
                                €{item.totalAmount.toFixed(2)}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Print button */}
                <button
                  onClick={() => window.print()}
                  style={{
                    width: '100%',
                    marginTop: '1.25rem',
                    padding: '0.85rem',
                    borderRadius: '1rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    fontWeight: 750,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Printer size={16} /> Stampa o Salva PDF Chiusura
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          6. RECENT ORDERS DRAWER
      ═══════════════════════════════════════════════════════════════════════ */}
      {isHistoryOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            background: '#0f172a',
            height: '100%',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                  Storico Ordini Recenti
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {cassaName} - Ultimi 50 ordini
                </span>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  Caricamento storico...
                </div>
              ) : recentOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  Nessun ordine registrato da questa cassa.
                </div>
              ) : (
                recentOrders.map(ord => (
                  <div
                    key={ord.id}
                    style={{
                      background: 'rgba(30,41,59,0.5)',
                      borderRadius: '0.85rem',
                      padding: '0.85rem',
                      border: '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 900, color: '#38bdf8', fontSize: '1.1rem', fontFamily: 'monospace' }}>
                        #{String(ord.orderNumber).padStart(3, '0')}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(ord.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem' }}>
                      <span style={{ color: '#94a3b8' }}>{ord.paymentMethod}</span>
                      <strong style={{ color: '#34d399', fontWeight: 800 }}>€{Number(ord.totalAmount).toFixed(2)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Responsive layout styles */}
      <style jsx>{`
        @media (max-width: 900px) {
          .cashier-grid {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
        }
      `}</style>

    </div>
  );
}
