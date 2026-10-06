'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CashierOrder,
  DepartmentStatus
} from '@/lib/data/cashier';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Filter,
  Wine,
  IceCream,
  Flame,
  Utensils,
  Check,
  PackageCheck,
  Radio,
  Trash2
} from 'lucide-react';

// Audio feedback helper
function playAlertSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.15, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  } catch { /* ignore */ }
}

export default function StandClient() {
  const [orders, setOrders] = useState<CashierOrder[]>([]);
  const [availableDepts, setAvailableDepts] = useState<string[]>([]);
  const [enableDepartments, setEnableDepartments] = useState<boolean>(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lightMode, setLightMode] = useState(false);
  const [lastCount, setLastCount] = useState(0);
  const [sseConnected, setSseConnected] = useState(false);

  const fetchComande = useCallback(async () => {
    try {
      const res = await fetch('/api/cashier/stand');
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        const fetchedOrders: CashierOrder[] = data.orders;
        setEnableDepartments(!!data.enableDepartments);
        
        // Extract all departments present across products
        const deptsSet = new Set<string>();
        if (Array.isArray(data.departments)) {
          data.departments.forEach((d: string) => deptsSet.add(d));
        }
        fetchedOrders.forEach(o => {
          o.items.forEach(it => {
            if (it.department) deptsSet.add(it.department);
            else if (it.category) deptsSet.add(it.category);
          });
        });
        setAvailableDepts(Array.from(deptsSet));

        // Sound alert if new orders arrive
        if (soundEnabled && lastCount > 0 && fetchedOrders.length > lastCount) {
          playAlertSound();
        }
        setLastCount(fetchedOrders.length);
        setOrders(fetchedOrders);
      }
    } catch (err) {
      console.error('Failed to fetch stand orders:', err);
    } finally {
      setLoading(false);
    }
  }, [lastCount, soundEnabled]);

  // Initial fetch and polling fallback
  useEffect(() => {
    fetchComande();
    const interval = setInterval(fetchComande, 6000); // Polling fallback
    return () => clearInterval(interval);
  }, [fetchComande]);

  // Connect to SSE stream for Instant Realtime updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/cashier/realtime');
      
      eventSource.addEventListener('connected', () => {
        setSseConnected(true);
      });

      eventSource.addEventListener('order_created', () => {
        if (soundEnabled) playAlertSound();
        fetchComande();
      });

      eventSource.addEventListener('status_updated', () => {
        fetchComande();
      });

      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch (err) {
      console.error('SSE connection error:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [fetchComande, soundEnabled]);

  const updateStatus = async (orderId: string, dept: string, status: DepartmentStatus) => {
    try {
      // Optimistic update
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          const updated = { ...(o.departmentStatuses || {}) };
          if (dept === 'ALL_DEPARTMENTS') {
            Object.keys(updated).forEach(k => { updated[k] = status; });
          } else {
            updated[dept] = status;
          }
          return { ...o, departmentStatuses: updated };
        }
        return o;
      }));

      await fetch('/api/cashier/stand', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, department: dept, status }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
      fetchComande();
    }
  };

  const voidOrder = async (orderId: string, orderNumber: number) => {
    if (!confirm(`Sei sicuro di voler ANNULLARE ed ELIMINARE la comanda #${orderNumber}?`)) return;
    try {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      await fetch('/api/cashier/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
    } catch (err) {
      console.error('Failed to void order:', err);
      fetchComande();
    }
  };

  // Filter orders
  const displayOrders = useMemo(() => {
    return orders.filter(order => {
      const items = selectedDept === 'all' || !enableDepartments
        ? order.items
        : order.items.filter(it => (it.department || it.category || 'Generale') === selectedDept);

      if (items.length === 0) return false;

      // Status filter
      if (statusFilter === 'ACTIVE') {
        const statuses = Object.values(order.departmentStatuses || {});
        // In Totem mode or selected dept, check if all delivered
        const allDelivered = statuses.length > 0 && statuses.every(s => s === 'DELIVERED');
        return !allDelivered;
      }
      return true;
    }).sort((a, b) => a.orderNumber - b.orderNumber); // Ascending order
  }, [orders, selectedDept, statusFilter, enableDepartments]);

  const getDeptIcon = (dept: string) => {
    const d = dept.toLowerCase();
    if (d.includes('panin') || d.includes('grigli')) return <Flame size={18} style={{ color: '#f97316' }} />;
    if (d.includes('bibit') || d.includes('bar') || d.includes('bev')) return <Wine size={18} style={{ color: '#38bdf8' }} />;
    if (d.includes('dolc')) return <IceCream size={18} style={{ color: '#ec4899' }} />;
    return <Utensils size={18} style={{ color: '#eab308' }} />;
  };

  const bg = lightMode ? '#f8fafc' : '#090d16';
  const cardBg = lightMode ? '#ffffff' : '#131b2e';
  const cardBorder = lightMode ? '#e2e8f0' : '#1e293b';
  const textColor = lightMode ? '#0f172a' : '#f8fafc';
  const textMuted = lightMode ? '#64748b' : '#94a3b8';

  return (
    <div style={{ minHeight: '100vh', background: bg, color: textColor, padding: '1.25rem', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' }}>
      
      {/* Top Header */}
      <header style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        paddingBottom: '1.25rem',
        borderBottom: `1px solid ${cardBorder}`,
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #ea580c, #c2410c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(234,88,12,0.35)',
          }}>
            <ChefHat size={26} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              {enableDepartments ? 'Monitor Comande Stand & Reparti 🍳' : 'Totem Generale Comande Food & Bevande 🍱'}
            </h1>
            <div style={{ fontSize: '0.82rem', color: textMuted, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
              <span>{enableDepartments ? 'Display Multi-Stand' : 'Totem Unico Cassa / Cucina'}</span>
              <span>•</span>
              <span style={{ color: sseConnected ? '#22c55e' : '#eab308', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Radio size={12} className={sseConnected ? 'animate-pulse' : ''} /> {sseConnected ? 'Realtime Live' : 'Polling Sync'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          {/* Dept Selector (only if enableDepartments is true) */}
          {enableDepartments && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: cardBg, border: `1px solid ${cardBorder}`, padding: '0.35rem 0.75rem', borderRadius: '12px' }}>
              <Filter size={16} style={{ color: '#f97316' }} />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: textColor,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">Tutti i Reparti ({availableDepts.length})</option>
                {availableDepts.map(d => (
                  <option key={d} value={d}>Stand: {d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div style={{ display: 'flex', background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '12px', padding: '3px' }}>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '9px',
                border: 'none',
                background: statusFilter === 'ACTIVE' ? '#ea580c' : 'transparent',
                color: statusFilter === 'ACTIVE' ? '#ffffff' : textMuted,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Da Evadere ({orders.filter(o => o.status === 'COMPLETED' && Object.values(o.departmentStatuses || {}).some(s => s !== 'DELIVERED')).length})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '9px',
                border: 'none',
                background: statusFilter === 'ALL' ? '#ea580c' : 'transparent',
                color: statusFilter === 'ALL' ? '#ffffff' : textMuted,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Tutti
            </button>
          </div>

          {/* Audio toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              padding: '0.55rem',
              borderRadius: '10px',
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              color: soundEnabled ? '#22c55e' : textMuted,
              cursor: 'pointer',
            }}
            title={soundEnabled ? 'Suono attivo' : 'Suono disattivato'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setLightMode(!lightMode)}
            style={{
              padding: '0.55rem',
              borderRadius: '10px',
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              color: lightMode ? '#ea580c' : '#fbbf24',
              cursor: 'pointer',
            }}
          >
            {lightMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button
            onClick={fetchComande}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '10px',
              background: '#ea580c',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Rinfresca
          </button>

        </div>
      </header>

      {/* Main Grid Orders */}
      {displayOrders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          background: cardBg,
          border: `1px dashed ${cardBorder}`,
          borderRadius: '24px',
          margin: '2rem auto',
          maxWidth: '500px',
        }}>
          <CheckCircle2 size={48} style={{ color: '#22c55e', margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.4rem 0' }}>Tutte le comande evase!</h2>
          <p style={{ fontSize: '0.88rem', color: textMuted, margin: 0 }}>
            Nessun ordine in attesa di preparazione o consegna.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
          gap: '1.25rem',
        }}>
          {displayOrders.map(order => {
            const timeAgo = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
            
            const isAllDelivered = Object.values(order.departmentStatuses || {}).length > 0 &&
              Object.values(order.departmentStatuses || {}).every(s => s === 'DELIVERED');

            return (
              <div
                key={order.id}
                style={{
                  background: cardBg,
                  border: isAllDelivered ? '2px solid rgba(34,197,94,0.4)' : `2px solid ${cardBorder}`,
                  borderRadius: '20px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: isAllDelivered ? 0.6 : 1,
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{
                        background: isAllDelivered ? '#22c55e' : '#ea580c',
                        color: '#ffffff',
                        fontSize: '1.35rem',
                        fontWeight: 900,
                        padding: '0.35rem 0.75rem',
                        borderRadius: '12px',
                        letterSpacing: '-0.02em',
                      }}>
                        #{order.orderNumber}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                          {order.cassaName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: textMuted, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Clock size={12} /> {timeAgo <= 0 ? 'Adesso' : `${timeAgo} min fa`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {order.omaggioNote && (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.5rem',
                          background: 'rgba(234,179,8,0.15)',
                          color: '#eab308',
                          borderRadius: '6px',
                          fontWeight: 700,
                        }}>
                          Note: {order.omaggioNote}
                        </span>
                      )}

                      <button
                        onClick={() => voidOrder(order.id, order.orderNumber)}
                        title="Annulla ed Elimina Comanda"
                        style={{
                          background: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444',
                          borderRadius: '8px',
                          padding: '0.35rem 0.55rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Annulla</span>
                      </button>
                    </div>
                  </div>

                  {/* List of items in order */}
                  <div style={{
                    background: lightMode ? '#f1f5f9' : '#0b1120',
                    border: `1px solid ${cardBorder}`,
                    borderRadius: '14px',
                    padding: '0.85rem',
                    marginBottom: '1rem',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {order.items.map(it => (
                        <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 750 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{
                              background: '#ea580c',
                              color: '#ffffff',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              fontWeight: 900
                            }}>
                              {it.quantity}x
                            </span>
                            <span>{it.name}</span>
                          </div>

                          {enableDepartments && it.department && (
                            <span style={{ fontSize: '0.72rem', color: textMuted, background: cardBg, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              {it.department}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer action button */}
                <div>
                  {!isAllDelivered ? (
                    <button
                      onClick={() => updateStatus(order.id, 'ALL_DEPARTMENTS', 'DELIVERED')}
                      style={{
                        width: '100%',
                        padding: '0.85rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #16a34a, #15803d)',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
                      }}
                    >
                      <PackageCheck size={20} /> EVADI & CONSEGNA ORDINE 📦
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(order.id, 'ALL_DEPARTMENTS', 'PENDING')}
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: '12px',
                        border: `1px solid ${cardBorder}`,
                        background: 'transparent',
                        color: textMuted,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Ripristina in attesa
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
