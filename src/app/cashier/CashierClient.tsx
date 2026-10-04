'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  ArrowRight,
  Maximize2,
  Minimize2,
  Lock,
  Sparkles,
  Printer,
  Sun,
  Moon,
  Ban,
  Copy,
  FileText,
  ChevronRight
} from 'lucide-react';

// ─── Sound Feedback ───────────────────────────────────────────────────────────

function playSound(type: 'beep' | 'success' | 'delete') {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (type === 'beep') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'success') {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.12, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(now + i * 0.07); osc.stop(now + i * 0.07 + 0.25);
      });
    } else if (type === 'delete') {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    }
  } catch { /* ignore */ }
}

// ─── Presets ─────────────────────────────────────────────────────────────────

const CASSA_PRESETS = ['Cassa 1', 'Cassa 2', 'Cassa 3', 'Cassa Bar', 'Stand Dolci'];

// ─── Theme tokens ─────────────────────────────────────────────────────────────

function getThemeTokens(light: boolean) {
  return light ? {
    bg: '#f1f5f9',
    bgHeader: '#ffffff',
    bgSidebar: '#f8fafc',
    bgCard: '#ffffff',
    bgInput: '#f1f5f9',
    bgCartItem: '#f8fafc',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.14)',
    text: '#0f172a',
    textMuted: '#64748b',
    textSubtle: '#94a3b8',
    textInverted: '#ffffff',
    accent: '#0284c7',
    accentBright: '#38bdf8',
    success: '#059669',
    successMuted: 'rgba(5,150,105,0.1)',
    danger: '#dc2626',
    dangerMuted: 'rgba(220,38,38,0.1)',
    overlay: 'rgba(0,0,0,0.5)',
    modalBg: '#ffffff',
    shadow: '0 4px 24px rgba(0,0,0,0.1)',
    shadowModal: '0 25px 60px rgba(0,0,0,0.25)',
    categoryActive: '#0284c7',
    categoryActiveBg: '#eff6ff',
    categoryBg: '#f1f5f9',
    categoryText: '#475569',
    dishBg: '#ffffff',
    dishBgActive: '#eff6ff',
    dishBorder: 'rgba(0,0,0,0.07)',
    dishBorderActive: '#0284c7',
    price: '#059669',
    priceActive: '#0284c7',
    qrBg: '#0f172a',
    qrLight: '#ffffff',
  } : {
    bg: '#090d16',
    bgHeader: '#0f172a',
    bgSidebar: '#0b1120',
    bgCard: '#1e293b',
    bgInput: 'rgba(15,23,42,0.7)',
    bgCartItem: 'rgba(30,41,59,0.5)',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.14)',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    textSubtle: '#64748b',
    textInverted: '#ffffff',
    accent: '#0284c7',
    accentBright: '#38bdf8',
    success: '#10b981',
    successMuted: 'rgba(16,185,129,0.15)',
    danger: '#ef4444',
    dangerMuted: 'rgba(239,68,68,0.15)',
    overlay: 'rgba(0,0,0,0.75)',
    modalBg: '#0f172a',
    shadow: '0 4px 24px rgba(0,0,0,0.5)',
    shadowModal: '0 25px 60px rgba(0,0,0,0.8)',
    categoryActive: '#0284c7',
    categoryActiveBg: 'rgba(2,132,199,0.18)',
    categoryBg: 'rgba(30,41,59,0.6)',
    categoryText: '#94a3b8',
    dishBg: 'rgba(30,41,59,0.65)',
    dishBgActive: 'rgba(14,165,233,0.12)',
    dishBorder: 'rgba(255,255,255,0.08)',
    dishBorderActive: '#38bdf8',
    price: '#34d399',
    priceActive: '#38bdf8',
    qrBg: '#0f172a',
    qrLight: '#ffffff',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CashierClient() {
  // Session
  const [eventCode, setEventCode] = useState('');
  const [cassaName, setCassaName] = useState('Cassa 1');
  const [operatorName, setOperatorName] = useState('');
  const [session, setSession] = useState<{
    id?: string; eventId: string; name?: string; eventName: string;
    categories: string[]; items: CashierItem[]; notes?: string;
  } | null>(null);

  // UI
  const [loadingSession, setLoadingSession] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('TUTTI');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Light mode
  const [isLight, setIsLight] = useState(false);

  // Checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CONTANTI' | 'POS' | 'OMAGGIO'>('CONTANTI');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [omaggioNote, setOmaggioNote] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Completed order modal
  const [completedOrder, setCompletedOrder] = useState<{
    order: CashierOrder; receiptUrl: string; qrCodeDataUrl: string;
  } | null>(null);

  // Z-Report
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [zStats, setZStats] = useState<CashierStats | null>(null);
  const [loadingZStats, setLoadingZStats] = useState(false);
  const [zFilterCassa, setZFilterCassa] = useState<string>('all');

  // History
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<CashierOrder[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [voidingOrderId, setVoidingOrderId] = useState<string | null>(null);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  const T = useMemo(() => getThemeTokens(isLight), [isLight]);

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const savedCode = localStorage.getItem('cashier_event_code');
    const savedCassa = localStorage.getItem('cashier_cassa_name') || 'Cassa 1';
    const savedOperator = localStorage.getItem('cashier_operator_name') || '';
    const savedLight = localStorage.getItem('cashier_light_mode') === 'true';
    setCassaName(savedCassa);
    setOperatorName(savedOperator);
    setIsLight(savedLight);
    if (savedCode) { setEventCode(savedCode); authenticateSession(savedCode, false); }
  }, []);

  const toggleLight = () => {
    setIsLight(v => {
      localStorage.setItem('cashier_light_mode', String(!v));
      return !v;
    });
  };

  const authenticateSession = async (codeToUse: string, isManualSubmit = true) => {
    if (!codeToUse.trim()) { if (isManualSubmit) setLoginError('Inserisci il codice evento'); return; }
    setLoadingSession(true); setLoginError('');
    try {
      const res = await fetch('/api/cashier/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCode: codeToUse.trim() })
      });
      const data = await res.json();
      if (data.success && data.event) {
        const ev = data.event;
        setSession({ ...ev, id: ev.id || ev.eventId, eventId: ev.eventId || ev.id, name: ev.name || ev.eventName, eventName: ev.eventName || ev.name });
        localStorage.setItem('cashier_event_code', codeToUse.trim().toUpperCase());
        localStorage.setItem('cashier_cassa_name', cassaName);
        if (operatorName) localStorage.setItem('cashier_operator_name', operatorName);
      } else {
        setLoginError(data.error || 'Codice evento non valido');
        if (!isManualSubmit) localStorage.removeItem('cashier_event_code');
      }
    } catch (err: any) { setLoginError(err.message || 'Errore di connessione'); }
    finally { setLoadingSession(false); }
  };

  const handleLogout = () => {
    if (confirm('Vuoi davvero uscire dalla sessione cassa corrente?')) {
      localStorage.removeItem('cashier_event_code');
      setSession(null); setCart({}); setCompletedOrder(null);
    }
  };

  const refreshMenu = async () => {
    if (!session) return;
    const savedCode = localStorage.getItem('cashier_event_code') || eventCode;
    if (savedCode) await authenticateSession(savedCode, false);
  };

  // ─── Cart ──────────────────────────────────────────────────────────────────

  const cartList = useMemo(() => {
    if (!session) return [];
    return Object.entries(cart).map(([id, quantity]) => {
      const item = session.items.find(i => i.id === id);
      if (!item || quantity <= 0) return null;
      return { id: item.id, name: item.name, category: item.category, price: item.price, quantity, subtotal: item.price * quantity };
    }).filter(Boolean) as Array<{ id: string; name: string; category: string; price: number; quantity: number; subtotal: number }>;
  }, [cart, session]);

  const totalAmount = useMemo(() => cartList.reduce((s, i) => s + i.subtotal, 0), [cartList]);
  const totalItemsCount = useMemo(() => cartList.reduce((s, i) => s + i.quantity, 0), [cartList]);

  const addToCart = (item: CashierItem) => {
    if (!item.isAvailable) return;
    playSound('beep');
    setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  };

  const decreaseQuantity = (itemId: string) => {
    playSound('delete');
    setCart(prev => {
      const cur = prev[itemId] || 0;
      if (cur <= 1) { const n = { ...prev }; delete n[itemId]; return n; }
      return { ...prev, [itemId]: cur - 1 };
    });
  };

  const clearCart = () => {
    if (totalItemsCount > 0 && confirm('Svuotare il carrello?')) {
      playSound('delete'); setCart({}); setIsMobileCartOpen(false);
    }
  };

  const toggleItemAvailability = async (item: CashierItem, e: React.MouseEvent) => {
    e.preventDefault(); if (!session) return;
    const newStatus = !item.isAvailable;
    if (!confirm(newStatus ? `Rendere DISPONIBILE "${item.name}"?` : `Segnare come ESAURITO "${item.name}"?`)) return;
    try {
      const res = await fetch('/api/cashier/item-status', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: session.eventId || session.id, itemId: item.id, isAvailable: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setSession(prev => prev ? { ...prev, items: prev.items.map(it => it.id === item.id ? { ...it, isAvailable: newStatus } : it) } : null);
      }
    } catch { alert('Impossibile aggiornare lo stato del piatto'); }
  };

  // ─── Filtered Items ────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    if (!session) return [];
    return session.items.filter(item => {
      const matchesCat = activeCategory === 'TUTTI' || item.category === activeCategory;
      const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
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
    setIsMobileCartOpen(false);
    setPaymentMethod('CONTANTI');
    setCashReceived(totalAmount);
    setOmaggioNote('');
    setOrderNote('');
    setIsCheckoutOpen(true);
  };

  // ─── Submit Order ──────────────────────────────────────────────────────────

  const handleSubmitOrder = async () => {
    if (!session || cartList.length === 0 || submittingOrder) return;
    if (paymentMethod === 'CONTANTI' && isCashInsufficient) {
      alert("L'importo ricevuto è inferiore al totale!"); return;
    }
    setSubmittingOrder(true);
    try {
      const res = await fetch('/api/cashier/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: session.eventId || session.id,
          eventName: session.eventName || session.name,
          cassaName, operatorName: operatorName || undefined, totalAmount, paymentMethod,
          cashReceived: paymentMethod === 'CONTANTI' ? (typeof cashReceived === 'number' ? cashReceived : totalAmount) : undefined,
          cashChange: paymentMethod === 'CONTANTI' ? cashChange : undefined,
          omaggioNote: paymentMethod === 'OMAGGIO' ? (omaggioNote || 'Omaggio Pro Loco') : undefined,
          orderNote: orderNote || undefined,
          items: cartList
        })
      });
      const data = await res.json();
      if (data.success && data.order) {
        playSound('success');
        setCompletedOrder({ order: data.order, receiptUrl: data.receiptUrl, qrCodeDataUrl: data.qrCodeDataUrl });
        setIsCheckoutOpen(false); setCart({});
      } else { alert(data.error || 'Errore nella registrazione dell\'ordine'); }
    } catch (err: any) { alert(err.message || 'Errore di connessione'); }
    finally { setSubmittingOrder(false); }
  };

  // ─── Z-Report ─────────────────────────────────────────────────────────────

  const fetchZStats = async (cassaFilter: string) => {
    if (!session) return; setLoadingZStats(true);
    try {
      const url = `/api/cashier/stats?eventId=${session.eventId || session.id}${cassaFilter !== 'all' ? `&cassaName=${encodeURIComponent(cassaFilter)}` : ''}`;
      const res = await fetch(url); const data = await res.json();
      if (data.success && data.stats) setZStats(data.stats);
    } catch (err) { console.error(err); }
    finally { setLoadingZStats(false); }
  };

  // ─── History & Void ───────────────────────────────────────────────────────

  const fetchRecentOrders = async () => {
    if (!session) return; setLoadingHistory(true);
    try {
      const res = await fetch(`/api/cashier/orders?eventId=${session.eventId || session.id}&cassaName=${encodeURIComponent(cassaName)}`);
      const data = await res.json();
      if (data.success && data.orders) setRecentOrders(data.orders);
    } catch (err) { console.error(err); }
    finally { setLoadingHistory(false); }
  };

  const handleVoidOrder = async (ord: CashierOrder) => {
    if (!confirm(`Vuoi ANNULLARE l'ordine #${String(ord.orderNumber).padStart(3, '0')} (${ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')} - €${Number(ord.totalAmount).toFixed(2)})?\n\nQuesta operazione NON può essere annullata.`)) return;
    setVoidingOrderId(ord.id);
    try {
      const res = await fetch('/api/cashier/orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: ord.id })
      });
      const data = await res.json();
      if (data.success) {
        playSound('delete');
        setRecentOrders(prev => prev.map(o => o.id === ord.id ? { ...o, status: 'VOIDED' } : o));
      } else { alert(data.error || 'Errore nell\'annullamento'); }
    } catch (err: any) { alert(err.message || 'Errore di connessione'); }
    finally { setVoidingOrderId(null); }
  };

  const handleDuplicateOrder = (ord: CashierOrder) => {
    if (ord.status === 'VOIDED') { alert('Impossibile duplicare un ordine annullato.'); return; }
    if (!confirm(`Vuoi riportare nel carrello l'ordine #${String(ord.orderNumber).padStart(3, '0')}?`)) return;
    const newCart: Record<string, number> = {};
    for (const item of ord.items) {
      const sessionItem = session?.items.find(i => i.name === item.name);
      if (sessionItem) newCart[sessionItem.id] = (newCart[sessionItem.id] || 0) + item.quantity;
    }
    setCart(newCart);
    setIsHistoryOpen(false);
    playSound('beep');
  };

  // ─── Fullscreen ───────────────────────────────────────────────────────────

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. LOGIN VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (!session) {
    return (
      <div style={{
        minHeight: '100vh',
        background: isLight
          ? 'linear-gradient(135deg, #e0f2fe 0%, #f8fafc 60%, #ede9fe 100%)'
          : 'radial-gradient(ellipse at 50% 30%, #1e293b 0%, #090d16 100%)',
        color: T.text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', fontFamily: 'system-ui, sans-serif',
        transition: 'background 0.3s'
      }}>
        {/* Theme toggle */}
        <button onClick={toggleLight} style={{
          position: 'fixed', top: '1rem', right: '1rem',
          background: T.bgCard, border: `1px solid ${T.border}`,
          borderRadius: '999px', padding: '0.5rem 0.85rem',
          color: T.textMuted, cursor: 'pointer', fontSize: '0.82rem',
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          boxShadow: T.shadow
        }}>
          {isLight ? <Moon size={15} /> : <Sun size={15} />}
          {isLight ? 'Tema Scuro' : 'Tema Chiaro'}
        </button>

        <div style={{
          maxWidth: '440px', width: '100%',
          background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(30,41,59,0.75)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: `1.5px solid ${T.border}`,
          borderRadius: '1.75rem', padding: '2.25rem 1.75rem',
          boxShadow: T.shadowModal, textAlign: 'center'
        }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            borderRadius: '1rem', margin: '0 auto 1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37,99,235,0.35)'
          }}>
            <Lock size={30} color="#ffffff" />
          </div>

          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#38bdf8', marginBottom: '0.25rem' }}>
            Pro Loco Gasperina APS
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem', color: T.text }}>
            Cassa Eventi & Sagre
          </h1>
          <p style={{ fontSize: '0.85rem', color: T.textMuted, margin: '0 0 1.75rem', lineHeight: 1.4 }}>
            Inserisci il codice evento configurato nel CMS per sbloccare il registratore di cassa.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); authenticateSession(eventCode); }}>
            <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: T.textMuted, marginBottom: '0.4rem' }}>
                🔑 Codice Evento (PIN)
              </label>
              <input
                type="text" autoFocus placeholder="Es. FESTA2026"
                value={eventCode} onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                style={{
                  width: '100%', padding: '0.9rem 1rem', borderRadius: '1rem',
                  background: T.bgInput, border: `1.5px solid ${T.border}`,
                  color: T.text, fontSize: '1.15rem', fontWeight: 800,
                  letterSpacing: '2px', textAlign: 'center', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: T.textMuted, marginBottom: '0.4rem' }}>
                🏷️ Postazione Cassa
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', marginBottom: '0.4rem' }}>
                {CASSA_PRESETS.slice(0, 3).map(preset => (
                  <button key={preset} type="button" onClick={() => setCassaName(preset)} style={{
                    padding: '0.55rem', borderRadius: '0.75rem',
                    border: `1.5px solid ${cassaName === preset ? '#38bdf8' : T.border}`,
                    background: cassaName === preset ? 'rgba(56,189,248,0.15)' : T.bgInput,
                    color: cassaName === preset ? '#38bdf8' : T.textMuted,
                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer'
                  }}>{preset}</button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                {CASSA_PRESETS.slice(3).map(preset => (
                  <button key={preset} type="button" onClick={() => setCassaName(preset)} style={{
                    padding: '0.55rem', borderRadius: '0.75rem',
                    border: `1.5px solid ${cassaName === preset ? '#38bdf8' : T.border}`,
                    background: cassaName === preset ? 'rgba(56,189,248,0.15)' : T.bgInput,
                    color: cassaName === preset ? '#38bdf8' : T.textMuted,
                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer'
                  }}>{preset}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: T.textMuted, marginBottom: '0.4rem' }}>
                👤 Operatore (Facoltativo)
              </label>
              <input
                type="text" placeholder="Es. Antonio"
                value={operatorName} onChange={(e) => setOperatorName(e.target.value)}
                style={{
                  width: '100%', padding: '0.7rem 0.9rem', borderRadius: '0.85rem',
                  background: T.bgInput, border: `1px solid ${T.border}`,
                  color: T.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            {loginError && (
              <div style={{
                background: T.dangerMuted, border: `1px solid ${T.danger}40`,
                color: T.danger, padding: '0.7rem', borderRadius: '0.75rem',
                fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
              }}>
                <AlertCircle size={16} /> {loginError}
              </div>
            )}

            <button type="submit" disabled={loadingSession} style={{
              width: '100%', padding: '0.95rem', borderRadius: '1rem',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: 'white', border: 'none', fontWeight: 800, fontSize: '1.05rem',
              cursor: loadingSession ? 'wait' : 'pointer',
              boxShadow: '0 8px 24px rgba(37,99,235,0.4)', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}>
              {loadingSession ? 'Accesso in corso...' : <>ACCEDI ALLA CASSA <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MAIN CASHIER INTERFACE
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.text,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif', overflowX: 'hidden',
      transition: 'background 0.25s, color 0.25s'
    }}>

      {/* ── Top Bar ── */}
      <header className="cashier-header" style={{ background: T.bgHeader, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: 'white', padding: '0.3rem 0.6rem', borderRadius: '999px',
            fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0
          }}>
            <Sparkles size={13} style={{ color: '#fbbf24' }} /> Pro Loco
          </div>
          <div style={{ minWidth: 0 }}>
            <strong className="cashier-header-title" style={{ fontSize: '0.92rem', color: T.text, display: 'block', lineHeight: 1.2 }}>
              {session.eventName}
            </strong>
            <div style={{ fontSize: '0.7rem', color: T.textMuted, display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#4ade80', fontWeight: 800 }}>● {cassaName}</span>
              {operatorName && <span className="hide-mobile">| {operatorName}</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          {/* Mobile cart badge */}
          <button onClick={() => setIsMobileCartOpen(true)} className="mobile-cart-btn-header" title="Apri carrello" style={{
            padding: '0.45rem 0.65rem', borderRadius: '0.75rem',
            background: totalItemsCount > 0 ? '#0284c7' : T.bgCard,
            border: totalItemsCount > 0 ? '1.5px solid #38bdf8' : `1px solid ${T.border}`,
            color: T.text, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
          }}>
            <ShoppingCart size={15} />
            {totalItemsCount > 0 && <span>{totalItemsCount}</span>}
          </button>

          <button onClick={() => { setIsZReportOpen(true); fetchZStats(zFilterCassa); }} title="Chiusura Cassa" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.45rem 0.65rem', borderRadius: '0.75rem',
            background: isLight ? 'rgba(234,179,8,0.1)' : 'rgba(234,179,8,0.12)',
            border: '1px solid rgba(234,179,8,0.3)',
            color: '#ca8a04', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
          }}>
            <BarChart3 size={15} />
            <span className="hide-mobile">Chiusura</span>
          </button>

          <button onClick={() => { setIsHistoryOpen(true); fetchRecentOrders(); }} title="Storico ordini" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.45rem 0.65rem', borderRadius: '0.75rem',
            background: T.bgCard, border: `1px solid ${T.border}`,
            color: T.textMuted, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
          }}>
            <History size={15} />
            <span className="hide-mobile">Storico</span>
          </button>

          <button onClick={refreshMenu} title="Ricarica menu" style={{
            padding: '0.45rem', borderRadius: '0.75rem',
            background: T.bgCard, border: `1px solid ${T.border}`,
            color: T.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}>
            <RefreshCw size={15} />
          </button>

          <button onClick={toggleLight} title="Cambia tema" style={{
            padding: '0.45rem', borderRadius: '0.75rem',
            background: T.bgCard, border: `1px solid ${T.border}`,
            color: T.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}>
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          <button onClick={toggleFullscreen} className="hide-mobile" title="Schermo intero" style={{
            padding: '0.45rem', borderRadius: '0.75rem',
            background: T.bgCard, border: `1px solid ${T.border}`,
            color: T.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}>
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <button onClick={handleLogout} title="Esci" style={{
            padding: '0.45rem', borderRadius: '0.75rem',
            background: T.dangerMuted, border: `1px solid ${T.danger}40`,
            color: T.danger, cursor: 'pointer', display: 'flex', alignItems: 'center'
          }}>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ── Grid ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden' }} className="cashier-grid">

        {/* LEFT: Menu */}
        <main className="cashier-main" style={{
          display: 'flex', flexDirection: 'column', padding: '1rem',
          overflowY: 'auto', borderRight: `1px solid ${T.border}`
        }}>
          <div className="cashier-controls-row">
            <div className="cashier-cat-scroll">
              {['TUTTI', ...session.categories].map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  padding: '0.55rem 1rem', borderRadius: '0.85rem',
                  border: `1.5px solid ${activeCategory === cat ? T.categoryActive : T.border}`,
                  background: activeCategory === cat ? T.categoryActiveBg : T.categoryBg,
                  color: activeCategory === cat ? T.categoryActive : T.categoryText,
                  fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s'
                }}>{cat}</button>
              ))}
            </div>
            <div className="cashier-search-wrapper" style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: T.textSubtle }} />
              <input
                type="text" placeholder="Cerca piatto..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '0.55rem 0.65rem 0.55rem 2.2rem',
                  borderRadius: '0.75rem', background: T.bgInput,
                  border: `1px solid ${T.border}`, color: T.text,
                  fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div className="cashier-dishes-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: '0.75rem', alignContent: 'start'
          }}>
            {filteredItems.map(item => {
              const inCartQty = cart[item.id] || 0;
              const isAvailable = item.isAvailable;
              return (
                <button
                  key={item.id} onClick={() => addToCart(item)} onContextMenu={(e) => toggleItemAvailability(item, e)}
                  disabled={!isAvailable} className="cashier-dish-card"
                  style={{
                    position: 'relative',
                    background: !isAvailable ? (isLight ? '#f1f5f9' : 'rgba(15,23,42,0.4)') : inCartQty > 0 ? T.dishBgActive : T.dishBg,
                    border: !isAvailable ? `1.5px dashed ${T.danger}50` : inCartQty > 0 ? `2px solid ${T.dishBorderActive}` : `1.5px solid ${T.dishBorder}`,
                    borderRadius: '1.25rem', padding: '1.15rem 0.9rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                    minHeight: '135px', cursor: isAvailable ? 'pointer' : 'not-allowed',
                    transition: 'all 0.12s ease-out', textAlign: 'center',
                    boxShadow: inCartQty > 0 ? `0 8px 20px ${T.accent}30` : T.shadow, opacity: isAvailable ? 1 : 0.6
                  }}
                >
                  {inCartQty > 0 && (
                    <div style={{
                      position: 'absolute', top: '6px', right: '6px',
                      background: T.accent, color: 'white', fontSize: '0.72rem', fontWeight: 900,
                      borderRadius: '999px', padding: '2px 7px', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', zIndex: 2
                    }}>{inCartQty}x</div>
                  )}
                  {!isAvailable && (
                    <div style={{
                      position: 'absolute', top: '6px', right: '6px',
                      background: T.danger, color: 'white', fontSize: '0.62rem', fontWeight: 900,
                      borderRadius: '999px', padding: '2px 5px', textTransform: 'uppercase', zIndex: 2
                    }}>Esaurito</div>
                  )}
                  <span className="cashier-dish-emoji" style={{ fontSize: '2.4rem', marginBottom: '0.35rem', lineHeight: 1 }}>
                    {item.icon || '🍽️'}
                  </span>
                  <div className="cashier-dish-name" style={{
                    fontSize: '0.9rem', fontWeight: 750, color: isAvailable ? T.text : T.textSubtle,
                    lineHeight: 1.25, marginBottom: '0.4rem', textDecoration: isAvailable ? 'none' : 'line-through'
                  }}>{item.name}</div>
                  <div className="cashier-dish-price" style={{
                    fontSize: '1.02rem', fontWeight: 900,
                    color: inCartQty > 0 ? T.priceActive : T.price, fontFamily: 'monospace'
                  }}>€{Number(item.price).toFixed(2)}</div>
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: T.textSubtle }}>
              Nessun piatto trovato per questa categoria.
            </div>
          )}
        </main>

        {/* RIGHT: Cart (Desktop) */}
        <aside className="desktop-cart-aside" style={{
          display: 'flex', flexDirection: 'column', background: T.bgSidebar,
          padding: '1rem', height: 'calc(100vh - 60px)', boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: `1px solid ${T.border}`, paddingBottom: '0.75rem', marginBottom: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingCart size={18} style={{ color: T.accentBright }} />
              <strong style={{ fontSize: '1rem', color: T.text }}>Ordine ({totalItemsCount})</strong>
            </div>
            {totalItemsCount > 0 && (
              <button onClick={clearCart} style={{
                background: 'none', border: 'none', color: T.danger, fontSize: '0.75rem',
                fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
              }}>
                <Trash2 size={13} /> Svuota
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
            {cartList.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: T.textSubtle, textAlign: 'center', padding: '2rem' }}>
                <ShoppingCart size={40} strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: T.textMuted }}>Il carrello è vuoto</p>
                <span style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>Tocca i piatti nel listino</span>
              </div>
            ) : (
              cartList.map(item => (
                <div key={item.id} style={{
                  background: T.bgCartItem, border: `1px solid ${T.border}`,
                  borderRadius: '0.85rem', padding: '0.65rem 0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: T.textMuted }}>€{Number(item.price).toFixed(2)} cad.</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button onClick={() => decreaseQuantity(item.id)} style={{
                      width: '28px', height: '28px', borderRadius: '0.5rem',
                      background: T.bgCard, border: `1px solid ${T.border}`,
                      color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}><Minus size={14} /></button>
                    <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: T.text }}>{item.quantity}</span>
                    <button onClick={() => addToCart(session.items.find(i => i.id === item.id)!)} style={{
                      width: '28px', height: '28px', borderRadius: '0.5rem',
                      background: T.accent, border: 'none',
                      color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}><Plus size={14} /></button>
                  </div>
                  <strong style={{ minWidth: '60px', textAlign: 'right', fontWeight: 900, color: T.price, fontSize: '0.95rem', fontFamily: 'monospace' }}>
                    €{Number(item.subtotal).toFixed(2)}
                  </strong>
                </div>
              ))
            )}
          </div>

          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: '0.85rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TOTALE CONTRIBUTO
              </span>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: T.accentBright, fontFamily: 'monospace', lineHeight: 1 }}>
                €{Number(totalAmount).toFixed(2)}
              </span>
            </div>
            <button onClick={handleOpenCheckout} disabled={totalItemsCount === 0} style={{
              width: '100%', padding: '1rem', borderRadius: '1rem',
              background: totalItemsCount > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)'),
              color: totalItemsCount > 0 ? '#ffffff' : T.textSubtle,
              border: 'none', fontWeight: 900, fontSize: '1.15rem',
              cursor: totalItemsCount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: totalItemsCount > 0 ? '0 8px 24px rgba(16,185,129,0.4)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.15s'
            }}>
              REGISTRA CONTRIBUTO <ArrowRight size={20} />
            </button>
          </div>
        </aside>
      </div>

      {/* ── Mobile Floating Cart Bar ── */}
      {totalItemsCount > 0 && (
        <div className="mobile-cart-bar" style={{
          position: 'fixed', bottom: '12px', left: '12px', right: '12px',
          background: isLight
            ? 'rgba(255,255,255,0.95)'
            : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: `1.5px solid ${T.accentBright}80`,
          borderRadius: '1.25rem', padding: '0.65rem 0.9rem',
          alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)', zIndex: 45, backdropFilter: 'blur(12px)'
        }}>
          <button type="button" onClick={() => setIsMobileCartOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'none', border: 'none', color: T.text, cursor: 'pointer', padding: 0, textAlign: 'left'
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '0.85rem', background: T.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0
            }}>
              <ShoppingCart size={20} color="white" />
              <span style={{
                position: 'absolute', top: '-5px', right: '-5px',
                background: '#10b981', color: 'white', fontSize: '0.7rem', fontWeight: 900,
                borderRadius: '999px', padding: '1px 5px'
              }}>{totalItemsCount}</span>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: T.textMuted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {totalItemsCount === 1 ? '1 piatto' : `${totalItemsCount} piatti`}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: T.accentBright, fontFamily: 'monospace', lineHeight: 1.1 }}>
                €{Number(totalAmount).toFixed(2)}
              </div>
            </div>
          </button>
          <button type="button" onClick={handleOpenCheckout} style={{
            padding: '0.7rem 1.15rem', borderRadius: '0.9rem',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white', border: 'none', fontWeight: 900, fontSize: '0.92rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
            boxShadow: '0 4px 14px rgba(16,185,129,0.4)', flexShrink: 0
          }}>
            INCASSA <ArrowRight size={17} />
          </button>
        </div>
      )}

      {/* ── Mobile Cart Drawer ── */}
      {isMobileCartOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: T.overlay,
          backdropFilter: 'blur(8px)', zIndex: 90, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: T.bgHeader, borderTop: `2px solid ${T.accentBright}60`,
            borderRadius: '1.5rem 1.5rem 0 0', maxHeight: '85vh',
            display: 'flex', flexDirection: 'column', padding: '1.25rem 1rem 1.5rem',
            boxShadow: '0 -20px 40px rgba(0,0,0,0.5)', animation: 'slideUp 0.22s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: `1px solid ${T.border}`, paddingBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={20} style={{ color: T.accentBright }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: T.text }}>Carrello ({totalItemsCount})</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {totalItemsCount > 0 && (
                  <button onClick={() => { clearCart(); setIsMobileCartOpen(false); }} style={{
                    background: 'none', border: 'none', color: T.danger, fontSize: '0.8rem',
                    fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}>
                    <Trash2 size={14} /> Svuota
                  </button>
                )}
                <button onClick={() => setIsMobileCartOpen(false)} style={{
                  background: T.bgCard, border: 'none', color: T.textMuted, borderRadius: '50%',
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}><X size={18} /></button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '45vh', paddingRight: '0.2rem', marginBottom: '1rem' }}>
              {cartList.map(item => (
                <div key={item.id} style={{
                  background: T.bgCartItem, borderRadius: '0.85rem', padding: '0.65rem 0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                  border: `1px solid ${T.border}`
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: T.textMuted }}>€{Number(item.price).toFixed(2)} cad.</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button onClick={() => decreaseQuantity(item.id)} style={{
                      width: 32, height: 32, borderRadius: '0.6rem', background: T.bgCard,
                      border: `1px solid ${T.border}`, color: T.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}><Minus size={14} /></button>
                    <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 800, color: T.text, fontSize: '0.95rem' }}>{item.quantity}</span>
                    <button onClick={() => addToCart(session.items.find(i => i.id === item.id)!)} style={{
                      width: 32, height: 32, borderRadius: '0.6rem', background: T.accent,
                      border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}><Plus size={14} /></button>
                  </div>
                  <strong style={{ minWidth: '55px', textAlign: 'right', fontWeight: 900, color: T.price, fontSize: '0.95rem', fontFamily: 'monospace' }}>
                    €{Number(item.subtotal).toFixed(2)}
                  </strong>
                </div>
              ))}
            </div>

            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: T.textMuted, textTransform: 'uppercase' }}>TOTALE</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: T.accentBright, fontFamily: 'monospace' }}>€{Number(totalAmount).toFixed(2)}</span>
              </div>
              <button onClick={() => { setIsMobileCartOpen(false); handleOpenCheckout(); }} style={{
                width: '100%', padding: '0.95rem', borderRadius: '1rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff', border: 'none', fontWeight: 900, fontSize: '1.05rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 6px 20px rgba(16,185,129,0.4)'
              }}>
                PROCEDI AL PAGAMENTO (€{Number(totalAmount).toFixed(2)}) <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          3. CHECKOUT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {isCheckoutOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: T.overlay,
          backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="cashier-modal-inner" style={{
            maxWidth: '520px', width: '100%', background: T.modalBg,
            border: `1.5px solid ${T.border}`, borderRadius: '1.75rem', padding: '1.75rem',
            boxShadow: T.shadowModal, maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: T.text }}>Modalità di Versamento</h3>
                <span style={{ fontSize: '0.78rem', color: T.textMuted }}>Registrazione per {session.eventName}</span>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            {/* Totale */}
            <div style={{
              background: isLight ? '#f0f9ff' : 'rgba(30,41,59,0.7)',
              borderRadius: '1.25rem', padding: '1rem 1.25rem', textAlign: 'center',
              marginBottom: '1.25rem', border: `1px solid ${T.border}`
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: T.textMuted, textTransform: 'uppercase' }}>
                Importo Contributo
              </span>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: T.accentBright, fontFamily: 'monospace' }}>
                €{Number(totalAmount).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.72rem', color: T.textSubtle, marginTop: '0.1rem' }}>
                {cartList.map(i => `${i.quantity}x ${i.name}`).join(' · ')}
              </div>
            </div>

            {/* Payment Methods */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: '1.25rem' }}>
              {[
                { key: 'CONTANTI', icon: <Banknote size={22} />, label: 'Contanti', color: '#10b981', activeBg: T.successMuted },
                { key: 'POS', icon: <CreditCard size={22} />, label: 'Carta / POS', color: '#38bdf8', activeBg: 'rgba(56,189,248,0.15)' },
                { key: 'OMAGGIO', icon: <Gift size={22} />, label: 'Omaggio', color: '#fb923c', activeBg: 'rgba(251,146,60,0.15)' },
              ].map(({ key, icon, label, color, activeBg }) => (
                <button key={key} type="button" onClick={() => { setPaymentMethod(key as any); if (key === 'CONTANTI') setCashReceived(totalAmount); }} style={{
                  padding: '0.85rem 0.5rem', borderRadius: '1rem',
                  border: `2px solid ${paymentMethod === key ? color : T.border}`,
                  background: paymentMethod === key ? activeBg : T.bgCard,
                  color: paymentMethod === key ? color : T.textMuted,
                  fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', transition: 'all 0.15s'
                }}>
                  {icon}<span>{label}</span>
                </button>
              ))}
            </div>

            {/* Cash Calculator */}
            {paymentMethod === 'CONTANTI' && (
              <div style={{ background: isLight ? '#f8fafc' : 'rgba(15,23,42,0.9)', borderRadius: '1.25rem', border: `1px solid ${T.border}`, padding: '1.15rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: T.textMuted, marginBottom: '0.65rem' }}>🪙 CALCOLATORE RESTO RAPIDO</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {[{ label: 'Esatto', val: totalAmount }, { label: '€10', val: 10 }, { label: '€20', val: 20 }, { label: '€50', val: 50 }, { label: '€100', val: 100 }].map(btn => (
                    <button key={btn.label} type="button" onClick={() => setCashReceived(btn.val)} style={{
                      padding: '0.55rem 0.2rem', borderRadius: '0.65rem',
                      border: `1px solid ${T.border}`,
                      background: cashReceived === btn.val ? T.accent : T.bgCard,
                      color: cashReceived === btn.val ? '#fff' : T.textMuted,
                      fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer'
                    }}>{btn.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.75rem', color: T.textMuted, display: 'block', marginBottom: '0.2rem' }}>Denaro ricevuto (€)</label>
                    <input
                      type="number" step="0.50" min={0} value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      style={{
                        width: '100%', padding: '0.7rem', borderRadius: '0.75rem',
                        background: T.bgInput, border: `1.5px solid ${isCashInsufficient ? T.danger : T.accentBright}`,
                        color: T.text, fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace',
                        outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{
                    flex: 1, background: isCashInsufficient ? T.dangerMuted : T.successMuted,
                    border: `1.5px solid ${isCashInsufficient ? T.danger : T.success}60`,
                    borderRadius: '0.75rem', padding: '0.7rem', textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: isCashInsufficient ? T.danger : T.success, textTransform: 'uppercase' }}>
                      {isCashInsufficient ? 'Mancano' : 'Resto da Dare'}
                    </span>
                    <div style={{ fontSize: '1.45rem', fontWeight: 900, color: isCashInsufficient ? T.danger : T.success, fontFamily: 'monospace', marginTop: '0.1rem' }}>
                      {isCashInsufficient && typeof cashReceived === 'number' ? `-€${(totalAmount - cashReceived).toFixed(2)}` : `€${cashChange.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Omaggio note */}
            {paymentMethod === 'OMAGGIO' && (
              <div style={{ background: isLight ? '#fff7ed' : 'rgba(15,23,42,0.9)', borderRadius: '1.25rem', border: '1px solid rgba(251,146,60,0.3)', padding: '1.15rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fb923c', display: 'block', marginBottom: '0.4rem' }}>Motivazione Omaggio</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                  {['Staff / Volontari', "Ospite d'Onore", 'Sponsor', 'Associazione'].map(tag => (
                    <button key={tag} type="button" onClick={() => setOmaggioNote(tag)} style={{
                      padding: '0.35rem 0.65rem', borderRadius: '999px',
                      background: omaggioNote === tag ? '#fb923c' : T.bgCard,
                      color: omaggioNote === tag ? '#000' : T.textMuted, border: 'none',
                      fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                    }}>{tag}</button>
                  ))}
                </div>
                <input
                  type="text" placeholder="Es. Tavolo Giuria, Presidente..." value={omaggioNote}
                  onChange={(e) => setOmaggioNote(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '0.75rem', background: T.bgInput, border: `1px solid ${T.border}`, color: T.text, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Order Note */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: T.textMuted, display: 'block', marginBottom: '0.35rem' }}>
                📝 Nota Ordine (Facoltativa)
              </label>
              <input
                type="text" placeholder="Es. Tavolo 5, senza glutine, asporto..."
                value={orderNote} onChange={(e) => setOrderNote(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '0.75rem', background: T.bgInput, border: `1px solid ${T.border}`, color: T.text, fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={submittingOrder || (paymentMethod === 'CONTANTI' && isCashInsufficient)}
              style={{
                width: '100%', padding: '1.1rem', borderRadius: '1rem',
                background: (paymentMethod === 'CONTANTI' && isCashInsufficient) ? (isLight ? '#e2e8f0' : '#475569') : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: 'white', border: 'none', fontWeight: 900, fontSize: '1.15rem',
                cursor: (paymentMethod === 'CONTANTI' && isCashInsufficient) ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {submittingOrder ? 'Emissione...' : <><CheckCircle2 size={20} /> CONFERMA E STACCA RICEVUTA</>}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          4. COMPLETED ORDER / QR MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {completedOrder && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            maxWidth: '460px', width: '100%', background: '#ffffff', color: '#0f172a',
            borderRadius: '1.75rem', padding: '2rem 1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.8)', textAlign: 'center', position: 'relative'
          }}>
            <button onClick={() => setCompletedOrder(null)} style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              <X size={18} />
            </button>

            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', margin: '0 auto 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={32} />
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Ordine Concluso ✓
            </div>

            <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '1.25rem', padding: '1rem', margin: '1rem 0' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Numero Progressivo</span>
              <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1, fontFamily: 'monospace', margin: '0.25rem 0' }}>
                #{String(completedOrder.order.orderNumber).padStart(3, '0')}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 750, background: '#e2e8f0', color: '#334155', padding: '0.2rem 0.65rem', borderRadius: '999px' }}>
                {completedOrder.order.cassaName}
              </span>
            </div>

            {completedOrder.qrCodeDataUrl && (
              <div style={{ margin: '1.25rem 0' }}>
                <div style={{ display: 'inline-block', padding: '0.75rem', background: 'white', borderRadius: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                  <Image src={completedOrder.qrCodeDataUrl} alt="QR Ricevuta" width={180} height={180} unoptimized style={{ display: 'block' }} />
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginTop: '0.65rem' }}>
                  📱 Inquadra per la ricevuta digitale
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Totale: <strong>€{Number(completedOrder.order.totalAmount).toFixed(2)}</strong> · {completedOrder.order.paymentMethod}
              {completedOrder.order.cashChange !== undefined && completedOrder.order.cashChange > 0 && (
                <div style={{ color: '#16a34a', fontWeight: 800, marginTop: '0.2rem' }}>
                  Resto: €{Number(completedOrder.order.cashChange).toFixed(2)}
                </div>
              )}
              {completedOrder.order.omaggioNote && (
                <div style={{ color: '#ea580c', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Nota: {completedOrder.order.omaggioNote}
                </div>
              )}
            </div>

            <button onClick={() => setCompletedOrder(null)} style={{
              width: '100%', padding: '0.95rem', borderRadius: '1rem',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              color: 'white', border: 'none', fontWeight: 900, fontSize: '1.1rem',
              cursor: 'pointer', boxShadow: '0 8px 24px rgba(37,99,235,0.35)'
            }}>
              PROSSIMO CLIENTE <ArrowRight size={18} style={{ verticalAlign: 'middle', marginLeft: '0.4rem' }} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          5. CHIUSURA CASSA / Z-REPORT
      ═══════════════════════════════════════════════════════════════════════ */}
      {isZReportOpen && (
        <div style={{ position: 'fixed', inset: 0, background: T.overlay, backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{
            maxWidth: '650px', width: '100%', background: T.modalBg,
            border: `1.5px solid ${T.border}`, borderRadius: '1.75rem', padding: '1.75rem',
            boxShadow: T.shadowModal, maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#ca8a04', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={22} /> Chiusura Cassa (Z-Report)
                </h3>
                <span style={{ fontSize: '0.78rem', color: T.textMuted }}>Riepilogo contributi per {session.eventName}</span>
              </div>
              <button onClick={() => setIsZReportOpen(false)} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
              {['all', ...CASSA_PRESETS].map(c => (
                <button key={c} onClick={() => { setZFilterCassa(c); fetchZStats(c); }} style={{
                  padding: '0.45rem 0.8rem', borderRadius: '999px',
                  border: `1px solid ${zFilterCassa === c ? '#ca8a04' : T.border}`,
                  background: zFilterCassa === c ? 'rgba(202,138,4,0.15)' : T.bgCard,
                  color: zFilterCassa === c ? '#ca8a04' : T.textMuted,
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                }}>{c === 'all' ? 'Tutte le Casse' : c}</button>
              ))}
            </div>

            {loadingZStats || !zStats ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: T.textMuted }}>Caricamento...</div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'TOTALE', val: zStats.totalAmount, sub: `${zStats.completedOrders} ordini`, color: T.accentBright, bg: isLight ? '#eff6ff' : 'rgba(30,41,59,0.7)' },
                    { label: 'CONTANTI', val: zStats.cashAmount, sub: '', color: '#34d399', bg: T.successMuted },
                    { label: 'POS', val: zStats.posAmount, sub: '', color: T.accentBright, bg: 'rgba(56,189,248,0.1)' },
                    { label: 'OMAGGI', val: zStats.omaggioAmount, sub: '', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: '1rem', padding: '0.85rem', border: `1px solid ${s.color}40` }}>
                      <span style={{ fontSize: '0.72rem', color: s.color, fontWeight: 700 }}>{s.label}</span>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>€{s.val.toFixed(2)}</div>
                      {s.sub && <span style={{ fontSize: '0.7rem', color: T.textSubtle }}>{s.sub}</span>}
                    </div>
                  ))}
                </div>

                <h4 style={{ fontSize: '0.88rem', fontWeight: 800, color: T.textMuted, marginBottom: '0.65rem' }}>🍽️ Dettaglio Piatti</h4>
                <div style={{ background: T.bgCard, borderRadius: '1rem', border: `1px solid ${T.border}`, overflow: 'hidden', maxHeight: '220px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: T.bgCartItem, textAlign: 'left', color: T.textMuted }}>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Piatto</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>Q.tà</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Totale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(zStats.itemsBreakdown).length === 0 ? (
                        <tr><td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: T.textSubtle }}>Nessun articolo battuto</td></tr>
                      ) : (
                        Object.values(zStats.itemsBreakdown).sort((a, b) => b.quantity - a.quantity).map((item, idx) => (
                          <tr key={idx} style={{ borderTop: `1px solid ${T.border}` }}>
                            <td style={{ padding: '0.55rem 0.8rem', fontWeight: 650, color: T.text }}>{item.name}</td>
                            <td style={{ padding: '0.55rem 0.8rem', textAlign: 'center', fontWeight: 800, color: T.accentBright }}>{item.quantity}x</td>
                            <td style={{ padding: '0.55rem 0.8rem', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: T.text }}>€{item.totalAmount.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <button onClick={() => window.print()} style={{
                  width: '100%', marginTop: '1.25rem', padding: '0.85rem', borderRadius: '1rem',
                  background: T.bgCard, border: `1px solid ${T.border}`, color: T.text,
                  fontWeight: 750, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}>
                  <Printer size={16} /> Stampa / Salva PDF Chiusura
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          6. STORICO ORDINI (con void e duplica)
      ═══════════════════════════════════════════════════════════════════════ */}
      {isHistoryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: T.overlay, backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%', maxWidth: '440px', background: T.bgHeader,
            height: '100%', borderLeft: `1px solid ${T.border}`,
            padding: '1.5rem', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: T.text }}>Storico Ordini</h3>
                <span style={{ fontSize: '0.78rem', color: T.textMuted }}>{cassaName} · Ultimi 50 ordini</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button onClick={fetchRecentOrders} title="Ricarica" style={{ background: T.bgCard, border: `1px solid ${T.border}`, color: T.textMuted, borderRadius: '0.5rem', padding: '0.45rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <RefreshCw size={15} />
                </button>
                <button onClick={() => setIsHistoryOpen(false)} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.72rem', color: T.textSubtle }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Ban size={12} style={{ color: T.danger }} /> Annullato</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Copy size={12} style={{ color: T.accentBright }} /> Duplica nel carrello</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: T.textSubtle }}>Caricamento storico...</div>
              ) : recentOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: T.textSubtle }}>Nessun ordine registrato.</div>
              ) : (
                recentOrders.map(ord => {
                  const isVoided = ord.status === 'VOIDED';
                  const isVoiding = voidingOrderId === ord.id;
                  return (
                    <div key={ord.id} style={{
                      background: isVoided ? (isLight ? '#fef2f2' : 'rgba(239,68,68,0.06)') : T.bgCartItem,
                      borderRadius: '0.85rem', padding: '0.85rem',
                      border: `1px solid ${isVoided ? T.danger + '30' : T.border}`,
                      opacity: isVoided ? 0.75 : 1
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 900, color: isVoided ? T.danger : T.accentBright, fontSize: '1.05rem', fontFamily: 'monospace' }}>
                            #{String(ord.orderNumber).padStart(3, '0')}
                          </span>
                          {isVoided && (
                            <span style={{ background: T.danger + '20', color: T.danger, fontSize: '0.65rem', fontWeight: 800, borderRadius: '999px', padding: '1px 6px', textTransform: 'uppercase' }}>
                              Annullato
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: T.textMuted }}>
                          {new Date(ord.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: T.textMuted, marginBottom: '0.5rem' }}>
                        {ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>

                      {ord.omaggioNote && (
                        <div style={{ fontSize: '0.72rem', color: '#fb923c', marginBottom: '0.4rem' }}>📝 {ord.omaggioNote}</div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${T.border}`, paddingTop: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.75rem', color: T.textMuted }}>{ord.paymentMethod}</span>
                          <strong style={{ color: isVoided ? T.textSubtle : T.price, fontWeight: 800, fontSize: '0.9rem' }}>€{Number(ord.totalAmount).toFixed(2)}</strong>
                        </div>

                        {/* Actions */}
                        {!isVoided && (
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleDuplicateOrder(ord)}
                              title="Duplica nel carrello"
                              style={{
                                background: 'rgba(56,189,248,0.1)', border: `1px solid ${T.accentBright}40`,
                                color: T.accentBright, borderRadius: '0.5rem', padding: '0.35rem 0.55rem',
                                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                              }}
                            >
                              <Copy size={12} /> Duplica
                            </button>
                            <button
                              onClick={() => handleVoidOrder(ord)}
                              disabled={isVoiding}
                              title="Annulla ordine"
                              style={{
                                background: T.dangerMuted, border: `1px solid ${T.danger}40`,
                                color: T.danger, borderRadius: '0.5rem', padding: '0.35rem 0.55rem',
                                fontSize: '0.72rem', fontWeight: 700, cursor: isVoiding ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: isVoiding ? 0.6 : 1
                              }}
                            >
                              <Ban size={12} /> {isVoiding ? '...' : 'Annulla'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .cashier-header {
          padding: 0.65rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
          z-index: 40;
          position: sticky;
          top: 0;
        }

        .cashier-controls-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.85rem;
          align-items: center;
        }

        .cashier-cat-scroll {
          display: flex;
          gap: 0.35rem;
          overflow-x: auto;
          padding-bottom: 0.2rem;
          flex: 1;
          white-space: nowrap;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .cashier-cat-scroll::-webkit-scrollbar { display: none; }

        .cashier-search-wrapper {
          width: 180px;
          flex-shrink: 0;
        }

        @media (max-width: 900px) {
          .cashier-grid {
            grid-template-columns: 1fr !important;
          }
          .desktop-cart-aside {
            display: none !important;
          }
          .mobile-cart-bar {
            display: flex !important;
          }
          .mobile-cart-btn-header {
            display: inline-flex !important;
          }
          .cashier-main {
            padding: 0.65rem !important;
            padding-bottom: 110px !important;
          }
          .cashier-header {
            padding: 0.5rem 0.65rem !important;
            gap: 0.35rem !important;
          }
          .cashier-header-title {
            max-width: 140px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .hide-mobile {
            display: none !important;
          }
        }

        @media (min-width: 901px) {
          .mobile-cart-bar { display: none !important; }
          .mobile-cart-btn-header { display: none !important; }
        }

        @media (max-width: 640px) {
          .cashier-controls-row {
            flex-direction: column;
            align-items: stretch;
            gap: 0.4rem;
          }
          .cashier-search-wrapper {
            width: 100% !important;
          }
          .cashier-dishes-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }
          .cashier-dish-card {
            min-height: 112px !important;
            padding: 0.75rem 0.5rem !important;
            border-radius: 1rem !important;
          }
          .cashier-dish-emoji {
            font-size: 1.85rem !important;
            margin-bottom: 0.2rem !important;
          }
          .cashier-dish-name {
            font-size: 0.8rem !important;
            margin-bottom: 0.3rem !important;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .cashier-dish-price {
            font-size: 0.95rem !important;
          }
          .cashier-modal-inner {
            padding: 1.15rem !important;
            border-radius: 1.25rem !important;
            max-height: 94vh !important;
          }
        }
      `}</style>
    </div>
  );
}
