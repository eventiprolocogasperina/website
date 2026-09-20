'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Download, CheckCircle2, XCircle, 
  Phone, Mail, FileText, Loader2, Plus, MailOpen, Trash2, Edit,
  TrendingUp, Users, Calendar, Ticket as TicketIcon, BarChart3,
  Sparkles, Wine, ArrowUpRight
} from 'lucide-react';
import { type OrderWithTickets, parseOrderNotes } from '@/lib/data/tickets';

// ─── Helpers ──────────────────────────────────────────────────────────────────


function getOrderEventId(order: OrderWithTickets): 'zuccaland-2026' | 'assaggia-passeggia' {
  if (order.tickets && order.tickets.some(t => t.eventId?.includes('zuccaland'))) {
    return 'zuccaland-2026';
  }
  return 'assaggia-passeggia';
}

export default function OrderManager() {
  const [orders, setOrders] = useState<OrderWithTickets[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Navigation tabs: 'all' | 'zuccaland-2026' | 'assaggia-passeggia'
  const [activeTab, setActiveTab] = useState<'all' | 'zuccaland-2026' | 'assaggia-passeggia'>('all');
  
  // Day filter for Zuccaland (multi-date: 10 vs 11 Ottobre)
  const [zuccalandDayFilter, setZuccalandDayFilter] = useState<'all' | '10' | '11'>('all');

  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [testingOrder, setTestingOrder] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  
  // Manual order modal (for Assaggia & Passeggia)
  const [showManualOrderModal, setShowManualOrderModal] = useState(false);
  const [manualOrderForm, setManualOrderForm] = useState({
    buyerName: '',
    buyerEmail: '',
    buyerPhone: '',
    ticketsInteri: 0,
    ticketsExtra: 0,
    note: ''
  });
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Edit order modal
  const [editingOrder, setEditingOrder] = useState<OrderWithTickets | null>(null);
  const [editForm, setEditForm] = useState({ buyerName: '', buyerEmail: '', buyerPhone: '', notes: '' });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const endpoint = viewMode === 'archived' ? '/api/admin/orders/archived' : '/api/admin/orders';
      const res = await fetch(endpoint);
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [viewMode]);

  const handleMarkPaid = async (orderId: string) => {
    if (!confirm('Vuoi segnare questo ordine come pagato? Verrà inviata una email con i biglietti.')) return;
    try {
      await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'MARK_PAID' }),
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Errore');
    }
  };
  
  const handleResendEmail = async (orderId: string) => {
    if (!confirm('Inviare nuovamente la email con i biglietti?')) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'RESEND_EMAIL' }),
      });
      if (res.ok) {
        alert('Email inviata con successo');
      } else {
        alert('Errore invio email');
      }
    } catch (err) {
      console.error(err);
      alert('Errore');
    }
  };

  const handleDeleteOrder = async (orderId: string, status: string) => {
    if (status === 'PAID') {
      if (!confirm('ATTENZIONE: L\'ordine risulta PAGATO. Confermi di aver effettuato lo storno o il rimborso (se necessario) prima di procedere con l\'eliminazione?')) {
        return;
      }
    } else {
      if (!confirm('Sei sicuro di voler eliminare questo ordine? Verrà spostato nel Cestino.')) {
        return;
      }
    }

    try {
      const res = await fetch(`/api/admin/orders?id=${orderId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Errore eliminazione');
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione');
    }
  };

  const handleRestoreOrder = async (orderId: string) => {
    try {
      const res = await fetch('/api/admin/orders/archived', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action: 'RESTORE' })
      });
      if (!res.ok) throw new Error('Errore ripristino');
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Errore durante il ripristino');
    }
  };

  const handleCreateTestOrder = async () => {
    if (!confirm('Vuoi creare un Ordine di Test per Zuccaland? Invierà un\'email a vono.niccolo@gmail.com con ricevuta, logo Zuccaland e QR code.')) return;
    setTestingOrder(true);
    try {
      const res = await fetch('/api/admin/orders/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: 'zuccaland-2026' })
      });
      if (!res.ok) throw new Error('Errore creazione ordine di test');
      alert('Ordine di test Zuccaland creato e inviato con successo!');
      if (viewMode === 'active') fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Errore durante la creazione');
    } finally {
      setTestingOrder(false);
    }
  };

  const handleEditClick = (o: OrderWithTickets) => {
    setEditingOrder(o);
    setEditForm({ buyerName: o.buyerName, buyerEmail: o.buyerEmail, buyerPhone: o.buyerPhone || '', notes: o.notes || '' });
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: editingOrder.id, action: 'UPDATE_DETAILS', ...editForm }),
      });
      if (res.ok) {
        setEditingOrder(null);
        fetchOrders();
      } else {
        alert('Errore durante il salvataggio');
      }
    } catch (err) {
      console.error(err);
      alert('Errore durante il salvataggio');
    }
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingOrder(true);
    try {
      const cart = [];
      if (manualOrderForm.ticketsInteri > 0) cart.push({ type: 'Ticket Intero', price: 0, quantity: manualOrderForm.ticketsInteri });
      if (manualOrderForm.ticketsExtra > 0) cart.push({ type: 'Extra wine', price: 0, quantity: manualOrderForm.ticketsExtra });
      
      const res = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName: manualOrderForm.buyerName,
          buyerEmail: manualOrderForm.buyerEmail,
          buyerPhone: manualOrderForm.buyerPhone,
          totalAmount: 0,
          note: manualOrderForm.note,
          cart
        }),
      });
      if (!res.ok) throw new Error('Errore creazione');
      setShowManualOrderModal(false);
      setManualOrderForm({ buyerName: '', buyerEmail: '', buyerPhone: '', ticketsInteri: 0, ticketsExtra: 0, note: '' });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert('Errore durante la creazione');
    } finally {
      setCreatingOrder(false);
    }
  };

  // ─── Filtered Orders Calculation ──────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Search filter
      const matchesSearch = 
        o.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
      
      // Event tab filter
      const evId = getOrderEventId(o);
      const matchesTab = activeTab === 'all' || evId === activeTab;

      // Zuccaland Day filter
      let matchesDay = true;
      if (activeTab === 'zuccaland-2026' && zuccalandDayFilter !== 'all') {
        const parsed = parseOrderNotes(o.notes);
        if (zuccalandDayFilter === '10') {
          matchesDay = parsed.eventDate ? parsed.eventDate.includes('10') : true;
        } else if (zuccalandDayFilter === '11') {
          matchesDay = parsed.eventDate ? parsed.eventDate.includes('11') : false;
        }
      }

      return matchesSearch && matchesStatus && matchesTab && matchesDay;
    });
  }, [orders, searchTerm, filterStatus, activeTab, zuccalandDayFilter]);

  // ─── Global Stats Calculations ────────────────────────────────────────────

  const globalStats = useMemo(() => {
    const paid = orders.filter(o => o.status === 'PAID');
    const totalRev = paid.reduce((s, o) => s + o.totalAmount, 0);
    const totalTix = paid.reduce((s, o) => s + o.tickets.length, 0);
    const paidCount = paid.length;
    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    const failedCount = orders.filter(o => o.status === 'FAILED').length;
    const freeCount = paid.filter(o => o.totalAmount === 0).length;

    // Per-event breakdown
    const zuccalandOrders = paid.filter(o => getOrderEventId(o) === 'zuccaland-2026');
    const assaggiaOrders = paid.filter(o => getOrderEventId(o) === 'assaggia-passeggia');

    const zuccalandRev = zuccalandOrders.reduce((s, o) => s + o.totalAmount, 0);
    const assaggiaRev = assaggiaOrders.reduce((s, o) => s + o.totalAmount, 0);

    const zuccalandAdmissionTix = zuccalandOrders.reduce((s, o) => s + o.tickets.filter(t => !t.type.toLowerCase().includes('you pick') && !t.type.toLowerCase().includes('laboratorio')).length, 0);
    const zuccalandYouPickTix = zuccalandOrders.reduce((s, o) => s + o.tickets.filter(t => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio')).length, 0);
    const zuccalandTix = zuccalandOrders.reduce((s, o) => s + o.tickets.length, 0);
    const assaggiaTix = assaggiaOrders.reduce((s, o) => s + o.tickets.length, 0);

    // Ticket types
    const ticketTypesCount: Record<string, number> = {};
    paid.forEach(o => {
      o.tickets.forEach(t => {
        ticketTypesCount[t.type] = (ticketTypesCount[t.type] || 0) + 1;
      });
    });

    return {
      totalRevenue: totalRev,
      totalTickets: totalTix,
      paidOrdersCount: paidCount,
      pendingCount,
      failedCount,
      freeCount,
      aov: paidCount > 0 ? (totalRev / paidCount).toFixed(2) : '0.00',
      zuccaland: {
        revenue: zuccalandRev,
        tickets: zuccalandTix,
        admissionTickets: zuccalandAdmissionTix,
        youPickTickets: zuccalandYouPickTix,
        orders: zuccalandOrders.length,
      },
      assaggia: {
        revenue: assaggiaRev,
        tickets: assaggiaTix,
        orders: assaggiaOrders.length,
      },
      ticketTypesCount,
    };
  }, [orders]);

  // ─── Zuccaland-Specific Stats ─────────────────────────────────────────────

  const zuccalandStats = useMemo(() => {
    const zuccalandPaid = orders.filter(o => {
      if (o.status !== 'PAID' || getOrderEventId(o) !== 'zuccaland-2026') return false;
      if (zuccalandDayFilter === 'all') return true;
      const parsed = parseOrderNotes(o.notes);
      return zuccalandDayFilter === '10' 
        ? (parsed.eventDate ? parsed.eventDate.includes('10') : true)
        : (parsed.eventDate ? parsed.eventDate.includes('11') : false);
    });

    const revenue = zuccalandPaid.reduce((s, o) => s + o.totalAmount, 0);
    const totalTickets = zuccalandPaid.reduce((s, o) => s + o.tickets.length, 0);
    const freeOrders = zuccalandPaid.filter(o => o.totalAmount === 0).length;

    let admissionTickets = 0;
    let youPickTickets = 0;

    zuccalandPaid.forEach(o => {
      o.tickets.forEach(t => {
        const isLab = t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio');
        if (isLab) {
          youPickTickets++;
        } else {
          admissionTickets++;
        }
      });
    });

    let kidsCount = 0;
    const activityStats: Record<string, number> = {};

    zuccalandPaid.forEach(o => {
      const parsed = parseOrderNotes(o.notes);
      if (parsed.children !== null) {
        kidsCount += parsed.children;
      }
      if (parsed.activities.length > 0) {
        const orderAdmission = o.tickets.filter(t => !t.type.toLowerCase().includes('you pick') && !t.type.toLowerCase().includes('laboratorio')).length || 1;
        const attendees = (parsed.target?.toLowerCase().includes('bambini') && parsed.children !== null && parsed.children > 0)
          ? parsed.children
          : orderAdmission;

        parsed.activities.forEach(act => {
          activityStats[act] = (activityStats[act] || 0) + attendees;
        });
      }
    });

    const ticketTypes: Record<string, number> = {};
    zuccalandPaid.forEach(o => {
      o.tickets.forEach(t => {
        ticketTypes[t.type] = (ticketTypes[t.type] || 0) + 1;
      });
    });

    return {
      revenue,
      totalTickets,
      admissionTickets,
      youPickTickets,
      freeOrders,
      ordersCount: zuccalandPaid.length,
      kidsCount,
      activityStats,
      ticketTypes
    };
  }, [orders, zuccalandDayFilter]);

  // ─── Assaggia & Passeggia Specific Stats ───────────────────────────────────

  const assaggiaStats = useMemo(() => {
    const apPaid = orders.filter(o => o.status === 'PAID' && getOrderEventId(o) === 'assaggia-passeggia');
    const revenue = apPaid.reduce((s, o) => s + o.totalAmount, 0);
    const totalTickets = apPaid.reduce((s, o) => s + o.tickets.length, 0);
    const freeOrders = apPaid.filter(o => o.totalAmount === 0).length;

    const ticketTypes: Record<string, number> = {};
    apPaid.forEach(o => {
      o.tickets.forEach(t => {
        ticketTypes[t.type] = (ticketTypes[t.type] || 0) + 1;
      });
    });

    return {
      revenue,
      totalTickets,
      freeOrders,
      ordersCount: apPaid.length,
      ticketTypes
    };
  }, [orders]);

  // ─── CSV Export ───────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ['ID', 'Evento', 'Data Evento', 'Nome', 'Email', 'Telefono', 'Biglietti/Ingressi', 'Totale', 'Stato', 'Data Ordine', 'Note/Attività'];
    const rows = filteredOrders.map(o => {
      const parsed = parseOrderNotes(o.notes);
      const ev = getOrderEventId(o) === 'zuccaland-2026' ? 'Zuccaland' : 'Assaggia & Passeggia';
      const isZucc = ev === 'Zuccaland';
      const admTix = isZucc ? o.tickets.filter(t => !t.type.toLowerCase().includes('you pick') && !t.type.toLowerCase().includes('laboratorio')).length : o.tickets.length;
      const youPickTix = isZucc ? o.tickets.filter(t => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio')).length : 0;
      const ticketsStr = isZucc
        ? `${admTix} Ingressi${youPickTix > 0 ? ` + ${youPickTix} You Pick Lab` : ''} (${o.tickets.map(t => t.type).join('; ')})`
        : o.tickets.map(t => t.type).join('; ');
      return [
        o.id,
        ev,
        parsed.eventDate || 'N/D',
        `"${o.buyerName.replace(/"/g, '""')}"`,
        o.buyerEmail,
        o.buyerPhone || '',
        `"${ticketsStr}"`,
        o.totalAmount.toFixed(2),
        o.status,
        new Date(o.createdAt).toLocaleString(),
        `"${(o.notes || '').replace(/"/g, '""')}"`
      ];
    });
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const label = activeTab === 'all' ? 'tutti_gli_eventi' : activeTab;
    link.download = `ordini_${label}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

      {/* TOP NAVIGATION TABS (Tutti gli eventi, Zuccaland, Assaggia & Passeggia) */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        background: 'var(--neutral-900)',
        padding: '0.65rem 0.85rem',
        borderRadius: '1.25rem',
        border: '1px solid var(--neutral-800)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        {/* Main Tab Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', padding: '2px' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '999px',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'all' ? 'linear-gradient(135deg, var(--blue-600), var(--blue-700))' : 'transparent',
              color: activeTab === 'all' ? 'white' : 'var(--neutral-400)',
              boxShadow: activeTab === 'all' ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <BarChart3 size={16} />
            <span>🌐 Tutti gli Eventi</span>
            <span style={{
              background: activeTab === 'all' ? 'rgba(255,255,255,0.25)' : 'var(--neutral-800)',
              padding: '0.1rem 0.5rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}>
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('zuccaland-2026')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '999px',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'zuccaland-2026' ? 'linear-gradient(135deg, #ea580c, #c2410c)' : 'transparent',
              color: activeTab === 'zuccaland-2026' ? 'white' : 'var(--neutral-400)',
              boxShadow: activeTab === 'zuccaland-2026' ? '0 4px 14px rgba(234,88,12,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <span>🎃 Zuccaland 2026</span>
            <span style={{
              background: activeTab === 'zuccaland-2026' ? 'rgba(255,255,255,0.25)' : 'var(--neutral-800)',
              padding: '0.1rem 0.5rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: activeTab === 'zuccaland-2026' ? 'white' : '#fdba74',
            }}>
              {globalStats.zuccaland.orders}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('assaggia-passeggia')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '999px',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'assaggia-passeggia' ? 'linear-gradient(135deg, #1e3a8a, #1B4BAA)' : 'transparent',
              color: activeTab === 'assaggia-passeggia' ? 'white' : 'var(--neutral-400)',
              boxShadow: activeTab === 'assaggia-passeggia' ? '0 4px 14px rgba(27,75,170,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <span>🍷 Assaggia & Passeggia</span>
            <span style={{
              background: activeTab === 'assaggia-passeggia' ? 'rgba(255,255,255,0.25)' : 'var(--neutral-800)',
              padding: '0.1rem 0.5rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: activeTab === 'assaggia-passeggia' ? 'white' : 'var(--gold-400)',
            }}>
              {globalStats.assaggia.orders}
            </span>
          </button>
        </div>

        {/* View Mode (Active / Bin) & Quick Export */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button 
            className={`btn ${viewMode === 'active' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} 
            onClick={() => setViewMode('active')}
          >
            Attivi
          </button>
          <button 
            className={`btn ${viewMode === 'archived' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} 
            onClick={() => setViewMode('archived')}
          >
            <Trash2 size={14} /> Cestino
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 1: TUTTI GLI EVENTI (EXECUTIVE SUMMARY, PLOTS, ANALYTICS)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Executive KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Incasso Complessivo</span>
                <span style={{ background: 'rgba(234, 179, 8, 0.12)', color: 'var(--gold-400)', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800 }}>Tutti gli Eventi</span>
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--gold-400)', lineHeight: 1.1 }}>
                €{globalStats.totalRevenue.toFixed(2)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--neutral-400)', marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--neutral-800)' }}>
                <span>Zuccaland: <b style={{ color: '#fdba74' }}>€{globalStats.zuccaland.revenue.toFixed(0)}</b></span>
                <span>A&P: <b style={{ color: '#93c5fd' }}>€{globalStats.assaggia.revenue.toFixed(0)}</b></span>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Biglietti Emessi</span>
                <TicketIcon size={16} style={{ color: 'var(--blue-400)' }} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-heading)', lineHeight: 1.1 }}>
                {globalStats.totalTickets}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--neutral-400)', marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--neutral-800)' }}>
                <span>Zuccaland: <b style={{ color: '#fdba74' }}>{globalStats.zuccaland.admissionTickets} ing.</b>{globalStats.zuccaland.youPickTickets > 0 ? ` + ${globalStats.zuccaland.youPickTickets} lab` : ''}</span>
                <span>A&P: <b style={{ color: '#93c5fd' }}>{globalStats.assaggia.tickets}</b></span>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Ordini Pagati</span>
                <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#4ade80', lineHeight: 1.1 }}>
                {globalStats.paidOrdersCount}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--neutral-400)', marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--neutral-800)' }}>
                <span>In attesa: <b style={{ color: '#fbbf24' }}>{globalStats.pendingCount}</b></span>
                <span>Omaggio: <b style={{ color: 'var(--blue-400)' }}>{globalStats.freeCount}</b></span>
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Scontrino Medio</span>
                <TrendingUp size={16} style={{ color: 'var(--blue-400)' }} />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--blue-400)', lineHeight: 1.1 }}>
                €{globalStats.aov}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--neutral-400)', marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--neutral-800)' }}>
                Media transazione per ordine pagato
              </div>
            </div>
          </div>

          {/* Visual Charts & Plots Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            
            {/* Chart 1: Revenue Comparison by Event */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--white)' }}>
                    Confronto Incassi per Evento
                  </h4>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--neutral-400)' }}>
                    Quota di ricavi generati dalle vendite online
                  </p>
                </div>
                <span style={{ fontSize: '1.1rem' }}>📊</span>
              </div>

              {globalStats.totalRevenue === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--neutral-500)', fontSize: '0.85rem' }}>
                  Nessun incasso registrato al momento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Visual Bar Proportion */}
                  <div style={{ height: '14px', background: 'var(--neutral-800)', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                    <div 
                      style={{ 
                        width: `${Math.round((globalStats.zuccaland.revenue / globalStats.totalRevenue) * 100)}%`, 
                        background: 'linear-gradient(90deg, #ea580c, #f97316)',
                        transition: 'width 0.6s ease'
                      }} 
                      title={`Zuccaland: €${globalStats.zuccaland.revenue.toFixed(2)}`}
                    />
                    <div 
                      style={{ 
                        width: `${Math.round((globalStats.assaggia.revenue / globalStats.totalRevenue) * 100)}%`, 
                        background: 'linear-gradient(90deg, #1B4BAA, #3b82f6)',
                        transition: 'width 0.6s ease'
                      }} 
                      title={`A&P: €${globalStats.assaggia.revenue.toFixed(2)}`}
                    />
                  </div>

                  {/* Legend Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.25)', borderRadius: '0.75rem', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#fdba74', fontWeight: 700 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c' }} />
                        🎃 Zuccaland
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ea580c', marginTop: '0.2rem' }}>
                        €{globalStats.zuccaland.revenue.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.15rem' }}>
                        {Math.round((globalStats.zuccaland.revenue / globalStats.totalRevenue) * 100)}% dell'incasso totale
                      </div>
                    </div>

                    <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: '0.75rem', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#93c5fd', fontWeight: 700 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
                        🍷 Assaggia & Passeggia
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.2rem' }}>
                        €{globalStats.assaggia.revenue.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.15rem' }}>
                        {Math.round((globalStats.assaggia.revenue / globalStats.totalRevenue) * 100)}% dell'incasso totale
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Ticket Type Distribution */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--white)' }}>
                    Ripartizione Biglietti per Tipologia
                  </h4>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--neutral-400)' }}>
                    Volumi di vendita per singolo formato
                  </p>
                </div>
                <span style={{ fontSize: '1.1rem' }}>🎟️</span>
              </div>

              {Object.keys(globalStats.ticketTypesCount).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--neutral-500)', fontSize: '0.85rem' }}>
                  Nessun biglietto emesso.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {Object.entries(globalStats.ticketTypesCount).map(([type, count]) => {
                    const pct = Math.round((count / Math.max(1, globalStats.totalTickets)) * 100);
                    const isZuccaland = type.toLowerCase().includes('zucca') || type.toLowerCase().includes('laboratorio') || type.toLowerCase().includes('you pick');
                    const barColor = isZuccaland ? 'linear-gradient(90deg, #ea580c, #f97316)' : 'linear-gradient(90deg, #1B4BAA, #3b82f6)';
                    
                    return (
                      <div key={type}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                          <span style={{ color: 'var(--neutral-200)', fontWeight: 600 }}>{type}</span>
                          <span style={{ color: 'var(--neutral-400)', fontWeight: 700 }}>
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--neutral-800)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chart 3: Order Status Ratio */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--white)' }}>
                    Tasso di Conversione & Stato Ordini
                  </h4>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--neutral-400)' }}>
                    Rapporto tra ordini completati, in attesa o non andati a buon fine
                  </p>
                </div>
                <span style={{ fontSize: '1.1rem' }}>📈</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', height: '10px', borderRadius: '999px', overflow: 'hidden', background: 'var(--neutral-800)' }}>
                  <div style={{ width: `${(globalStats.paidOrdersCount / Math.max(1, orders.length)) * 100}%`, background: '#4ade80' }} title="Pagati" />
                  <div style={{ width: `${(globalStats.pendingCount / Math.max(1, orders.length)) * 100}%`, background: '#fbbf24' }} title="In attesa" />
                  <div style={{ width: `${(globalStats.failedCount / Math.max(1, orders.length)) * 100}%`, background: '#f87171' }} title="Falliti" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div style={{ textAlign: 'center', padding: '0.6rem', background: 'rgba(74,222,128,0.06)', borderRadius: '0.6rem', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>{globalStats.paidOrdersCount}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--neutral-400)' }}>Pagati ({Math.round((globalStats.paidOrdersCount / Math.max(1, orders.length)) * 100)}%)</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '0.6rem', background: 'rgba(251,191,36,0.06)', borderRadius: '0.6rem', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>{globalStats.pendingCount}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--neutral-400)' }}>In attesa ({Math.round((globalStats.pendingCount / Math.max(1, orders.length)) * 100)}%)</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '0.6rem', background: 'rgba(248,113,113,0.06)', borderRadius: '0.6rem', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f87171' }}>{globalStats.failedCount}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--neutral-400)' }}>Falliti ({Math.round((globalStats.failedCount / Math.max(1, orders.length)) * 100)}%)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--white)' }}>
                  Gestione Dettagliata per Evento
                </h4>
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.78rem', color: 'var(--neutral-400)' }}>
                  Accedi direttamente ai pannelli specifici con metriche e filtri dedicati:
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={() => setActiveTab('zuccaland-2026')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'rgba(234,88,12,0.1)',
                    border: '1.5px solid rgba(234,88,12,0.3)',
                    borderRadius: '0.85rem',
                    color: '#fdba74',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🎃 Vai a Zuccaland (Bambini, Laboratori, Filtro Date)
                  </span>
                  <ArrowUpRight size={16} />
                </button>

                <button
                  onClick={() => setActiveTab('assaggia-passeggia')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'rgba(37,99,235,0.1)',
                    border: '1.5px solid rgba(37,99,235,0.3)',
                    borderRadius: '0.85rem',
                    color: '#93c5fd',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🍷 Vai ad Assaggia & Passeggia (Calici, Degustazioni, Email)
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 2: ZUCCALAND 2026 (MULTI-DATE FILTER, CHILDREN, WORKSHOPS)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'zuccaland-2026' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Zuccaland Event Banner & Day Filter Bar */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(234,88,12,0.15) 0%, rgba(124,45,18,0.2) 100%)',
            border: '1.5px solid rgba(234,88,12,0.35)',
            borderRadius: '1.25rem',
            padding: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🎃</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#fed7aa' }}>
                  Zuccaland 2026 · Gasperina
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#fdba74' }}>
                Il villaggio delle zucche · Sabato 10 e Domenica 11 Ottobre 2026
              </p>
            </div>

            {/* Multi-Date Filter Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#fed7aa', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800 }}>
                📅 Filtra per Giorno Evento:
              </span>
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '999px', border: '1px solid rgba(234,88,12,0.3)' }}>
                <button
                  onClick={() => setZuccalandDayFilter('all')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: zuccalandDayFilter === 'all' ? '#ea580c' : 'transparent',
                    color: zuccalandDayFilter === 'all' ? 'white' : '#fdba74',
                    transition: 'all 0.2s',
                  }}
                >
                  Tutte le Date
                </button>
                <button
                  onClick={() => setZuccalandDayFilter('10')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: zuccalandDayFilter === '10' ? '#ea580c' : 'transparent',
                    color: zuccalandDayFilter === '10' ? 'white' : '#fdba74',
                    transition: 'all 0.2s',
                  }}
                >
                  🎃 Sab 10 Ott
                </button>
                <button
                  onClick={() => setZuccalandDayFilter('11')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '999px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: zuccalandDayFilter === '11' ? '#ea580c' : 'transparent',
                    color: zuccalandDayFilter === '11' ? 'white' : '#fdba74',
                    transition: 'all 0.2s',
                  }}
                >
                  🎃 Dom 11 Ott
                </button>
              </div>
            </div>
          </div>

          {/* Zuccaland KPI Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(234,88,12,0.35)' }}>
              <div style={{ fontSize: '0.8rem', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                Ingressi Ordinari
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fed7aa', lineHeight: 1 }}>
                {zuccalandStats.admissionTickets}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.5rem' }}>
                {zuccalandStats.ordersCount} ordini ({zuccalandStats.admissionTickets} ingressi + {zuccalandStats.youPickTickets} You Pick)
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(234,88,12,0.35)' }}>
              <div style={{ fontSize: '0.8rem', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                Incasso Zuccaland
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f97316', lineHeight: 1 }}>
                €{zuccalandStats.revenue.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.5rem' }}>
                Omaggio: {zuccalandStats.freeOrders}
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(234,88,12,0.4)', background: 'rgba(234,88,12,0.04)' }}>
              <div style={{ fontSize: '0.8rem', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                👶 Bambini Registrati
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ea580c', lineHeight: 1 }}>
                {zuccalandStats.kidsCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.5rem' }}>
                Quota minori registrati nei moduli
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(234,88,12,0.35)' }}>
              <div style={{ fontSize: '0.8rem', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                You Pick Lab
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fdba74', lineHeight: 1 }}>
                {zuccalandStats.youPickTickets}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.5rem' }}>
                Attività extra (+€3 · 1 zucca ciascuno)
              </div>
            </div>
          </div>

          {/* Workshop & Activities Participation */}
          <div className="card" style={{ padding: '1.5rem', borderColor: 'rgba(234,88,12,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fed7aa' }}>
                  🎨 Partecipazione Laboratori Gratuiti
                </h4>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--neutral-400)' }}>
                  Iscrizioni registrate tramite checkout {zuccalandDayFilter !== 'all' ? `(${zuccalandDayFilter === '10' ? 'Sabato 10' : 'Domenica 11'})` : 'sull\'intero evento'}
                </p>
              </div>
              <span style={{ fontSize: '1.1rem' }}>🎃</span>
            </div>

            {Object.keys(zuccalandStats.activityStats).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--neutral-500)', fontSize: '0.85rem' }}>
                Nessuna attività prenotata con i filtri attuali.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {Object.entries(zuccalandStats.activityStats).map(([act, count]) => (
                  <div key={act} style={{ background: 'rgba(234,88,12,0.06)', border: '1px solid rgba(234,88,12,0.2)', borderRadius: '0.75rem', padding: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fed7aa', marginBottom: '0.25rem' }}>
                      {act}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ea580c' }}>
                      {count} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fdba74' }}>partecipanti</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions Bar for Zuccaland */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-outline" 
              style={{ fontSize: '0.85rem', color: '#ea580c', borderColor: '#fdba74' }} 
              onClick={handleCreateTestOrder} 
              disabled={testingOrder}
            >
              {testingOrder ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} 
              Invia Ordine Test Zuccaland
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={exportCSV}>
              <Download size={16} /> Esporta CSV Zuccaland
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          TAB 3: ASSAGGIA & PASSEGGIA (NO CHILDREN / NO WORKSHOPS, CLEAN & FOCUSED)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'assaggia-passeggia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Assaggia & Passeggia Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(27,75,170,0.18) 0%, rgba(30,58,138,0.25) 100%)',
            border: '1.5px solid rgba(27,75,170,0.4)',
            borderRadius: '1.25rem',
            padding: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🍷</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#93c5fd' }}>
                  Assaggia & Passeggia · Edizione 2026
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#bfdbfe' }}>
                Itinerario Enogastronomico tra le rughe di Gasperina · 10 Agosto 2026
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={async () => {
                  if (!confirm(`Vuoi inviare l'email di ringraziamento a tutti gli acquirenti di Assaggia & Passeggia? (Verrà inviata solo a chi non l'ha ancora ricevuta).`)) return;
                  setSendingEmails(true);
                  try {
                    const res = await fetch('/api/admin/orders/thankyou', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ eventId: 'assaggia-passeggia' })
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert(data.message);
                      fetchOrders();
                    } else {
                      alert('Errore: ' + data.error);
                    }
                  } catch (e) {
                    alert('Errore di rete durante l\'invio');
                  } finally {
                    setSendingEmails(false);
                  }
                }}
                disabled={sendingEmails}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', borderColor: 'var(--blue-500)', color: 'var(--blue-400)' }}
              >
                {sendingEmails ? <Loader2 size={16} className="animate-spin" style={{ marginRight: '0.5rem', display: 'inline-block' }} /> : null}
                {sendingEmails ? 'Invio in corso...' : 'Invia Email Ringraziamento'}
              </button>
              
              <a
                href="/admin/email-preview"
                target="_blank"
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', borderColor: 'var(--neutral-600)', color: 'var(--neutral-400)' }}
              >
                Anteprima Email
              </a>
            </div>
          </div>

          {/* A&P KPI Stats (Notice: NO CHILDREN / NO WORKSHOPS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(27,75,170,0.35)' }}>
              <div style={{ fontSize: '0.8rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                Biglietti Interi
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#93c5fd', lineHeight: 1 }}>
                {assaggiaStats.ticketTypes['Ticket Intero'] || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.5rem' }}>
                Accesso a tutte le tappe enogastronomiche
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(27,75,170,0.35)' }}>
              <div style={{ fontSize: '0.8rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                Extra Wine / Calici
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gold-400)', lineHeight: 1 }}>
                {assaggiaStats.ticketTypes['Extra wine'] || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.5rem' }}>
                Degustazioni e calici aggiuntivi
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(27,75,170,0.35)' }}>
              <div style={{ fontSize: '0.8rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                Incasso Totale A&P
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80', lineHeight: 1 }}>
                €{assaggiaStats.revenue.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.5rem' }}>
                Da {assaggiaStats.ordersCount} ordini pagati
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(27,75,170,0.35)' }}>
              <div style={{ fontSize: '0.8rem', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                Ordini Omaggio
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--blue-400)', lineHeight: 1 }}>
                {assaggiaStats.freeOrders}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.5rem' }}>
                Rilasciati manualmente o con promo
              </div>
            </div>
          </div>

          {/* Quick Actions Bar for A&P */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => setShowManualOrderModal(true)}>
              <Plus size={16} /> Crea Ordine Manuale (Gratuito)
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={exportCSV}>
              <Download size={16} /> Esporta CSV Assaggia & Passeggia
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          SEARCH & FILTER TOOLBAR (APPLIES ACROSS ALL TABS)
      ────────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--neutral-900)',
        padding: '1rem',
        borderRadius: '1rem',
        border: '1px solid var(--neutral-800)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-500)' }} />
            <input 
              className="input" 
              placeholder="Cerca per nome, email o ID ordine..." 
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input" 
            style={{ width: 'auto', minWidth: '150px' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Tutti gli stati</option>
            <option value="PAID">Pagati</option>
            <option value="PENDING">In attesa</option>
            <option value="FAILED">Falliti</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--neutral-400)' }}>
            Mostrando <b>{filteredOrders.length}</b> di {orders.length} ordini
          </span>
          <button className="btn btn-outline" style={{ fontSize: '0.82rem' }} onClick={exportCSV}>
            <Download size={15} /> CSV
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          ORDERS TABLE
      ────────────────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--blue-500)' }} />
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Ordine</th>
                <th>Evento</th>
                <th>Acquirente</th>
                <th>Biglietti & Dettagli</th>
                <th>Totale</th>
                <th>Stato</th>
                <th>Data</th>
                <th style={{ textAlign: 'right' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--neutral-500)' }}>
                    Nessun ordine trovato con i filtri selezionati.
                  </td>
                </tr>
              ) : filteredOrders.map(o => {
                const parsed = parseOrderNotes(o.notes);
                const isZuccaland = getOrderEventId(o) === 'zuccaland-2026';

                return (
                <tr key={o.id}>
                  <td>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--neutral-400)' }}>
                      #{o.id.substring(0,8).toUpperCase()}
                    </div>
                  </td>

                  <td>
                    {isZuccaland ? (
                      <span style={{
                        background: 'rgba(234, 88, 12, 0.12)',
                        color: '#fdba74',
                        border: '1px solid rgba(234, 88, 12, 0.3)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        🎃 Zuccaland
                      </span>
                    ) : (
                      <span style={{
                        background: 'rgba(27, 75, 170, 0.12)',
                        color: '#93c5fd',
                        border: '1px solid rgba(27, 75, 170, 0.3)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        🍷 Assaggia & P.
                      </span>
                    )}
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--white)', fontWeight: 600 }}>{o.buyerName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                        <Mail size={12} /> {o.buyerEmail}
                      </span>
                      {o.buyerPhone && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                          <Phone size={12} /> {o.buyerPhone}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {isZuccaland ? (
                        (() => {
                          const admissionTix = o.tickets.filter(t => !t.type.toLowerCase().includes('you pick') && !t.type.toLowerCase().includes('laboratorio'));
                          const youPickTix = o.tickets.filter(t => t.type.toLowerCase().includes('you pick') || t.type.toLowerCase().includes('laboratorio'));
                          return (
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--white)' }}>
                                {admissionTix.length} {admissionTix.length === 1 ? 'Ingresso' : 'Ingressi'}
                              </div>
                              {youPickTix.length > 0 && (
                                <div style={{ marginTop: '0.2rem' }}>
                                  <span style={{
                                    background: 'rgba(249, 115, 22, 0.18)',
                                    color: '#fdba74',
                                    border: '1px solid rgba(249, 115, 22, 0.4)',
                                    padding: '0.12rem 0.45rem',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 750,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}>
                                    🎨 {youPickTix.length}x You Pick Lab
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--white)' }}>
                          {o.tickets.length} {o.tickets.length === 1 ? 'biglietto' : 'biglietti'}
                        </div>
                      )}

                      {/* Day of Event badge (Zuccaland) */}
                      {isZuccaland && parsed.eventDate && (
                        <div>
                          <span style={{
                            background: 'rgba(251, 191, 36, 0.12)',
                            color: '#fef08a',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            📅 {parsed.eventDate}
                          </span>
                        </div>
                      )}

                      {/* Children count badge (Zuccaland only) */}
                      {isZuccaland && parsed.children !== null && (
                        <div>
                          <span style={{
                            background: 'rgba(234, 88, 12, 0.15)',
                            color: '#fdba74',
                            border: '1px solid rgba(234, 88, 12, 0.3)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            👶 {parsed.children} {parsed.children === 1 ? 'Bambino' : 'Bambini'}
                          </span>
                        </div>
                      )}

                      {/* Workshops badges (Zuccaland only) */}
                      {isZuccaland && parsed.activities.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.1rem' }}>
                          {parsed.activities.map((act, i) => (
                            <span key={i} style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#93c5fd',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}>
                              🎨 {act}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Generic notes if no activities or children */}
                      {o.notes && parsed.activities.length === 0 && parsed.children === null && !parsed.eventDate && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--blue-400)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <FileText size={12} /> {o.notes}
                        </div>
                      )}
                    </div>
                  </td>

                  <td>
                    <div style={{ fontSize: '1rem', color: 'var(--white)', fontWeight: 600 }}>
                      {o.totalAmount === 0 && o.status === 'PAID' ? (
                        <span style={{ color: 'var(--blue-400)' }}>OMAGGIO</span>
                      ) : (
                        `€${o.totalAmount.toFixed(2)}`
                      )}
                    </div>
                  </td>

                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                      background: o.status === 'PAID' ? 'rgba(74,222,128,0.1)' : o.status === 'PENDING' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
                      color: o.status === 'PAID' ? '#4ade80' : o.status === 'PENDING' ? '#fbbf24' : '#f87171'
                    }}>
                      {o.status}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                      {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {o.status === 'PENDING' && (
                        <button 
                          onClick={() => handleMarkPaid(o.id)}
                          style={{ color: 'var(--blue-400)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                          title="Segna come pagato (invia email)"
                        >
                          <CheckCircle2 size={16} /> Conferma
                        </button>
                      )}
                      {o.status === 'PAID' && (
                        <>
                          <a href={`/api/tickets/download?orderId=${o.id}`} target="_blank" style={{ color: 'var(--neutral-400)' }} title="Scarica PDF">
                            <Download size={16} />
                          </a>
                          <button onClick={() => handleResendEmail(o.id)} style={{ color: 'var(--neutral-400)', background: 'none', border: 'none', cursor: 'pointer' }} title="Reinvia Email">
                            <MailOpen size={16} />
                          </button>
                        </>
                      )}
                      {viewMode === 'archived' ? (
                        <button 
                          onClick={() => handleRestoreOrder(o.id)} 
                          style={{ color: 'var(--green-400)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }} 
                          title="Ripristina Ordine"
                        >
                          Ripristina
                        </button>
                      ) : (
                        <>
                          <button onClick={() => handleEditClick(o)} style={{ color: 'var(--neutral-400)', background: 'none', border: 'none', cursor: 'pointer' }} title="Modifica Ordine">
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteOrder(o.id, o.status)} 
                            style={{ color: 'var(--red-400)', background: 'none', border: 'none', cursor: 'pointer' }} 
                            title="Elimina Ordine"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          MANUAL ORDER MODAL (FOR ASSAGGIA & PASSEGGIA)
      ────────────────────────────────────────────────────────────────────────── */}
      {showManualOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Crea Ordine Manuale A&P (Gratuito)</h3>
              <button onClick={() => setShowManualOrderModal(false)} style={{ background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer' }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateManualOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Nome e Cognome</label>
                <input required type="text" className="input" value={manualOrderForm.buyerName} onChange={e => setManualOrderForm({...manualOrderForm, buyerName: e.target.value})} />
              </div>
              <div>
                <label className="label">Email (per invio biglietti)</label>
                <input required type="email" className="input" value={manualOrderForm.buyerEmail} onChange={e => setManualOrderForm({...manualOrderForm, buyerEmail: e.target.value})} />
              </div>
              <div>
                <label className="label">Telefono</label>
                <input required type="tel" className="input" value={manualOrderForm.buyerPhone} onChange={e => setManualOrderForm({...manualOrderForm, buyerPhone: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Ticket Interi (Gratuiti)</label>
                  <input required type="number" min="0" className="input" value={manualOrderForm.ticketsInteri} onChange={e => setManualOrderForm({...manualOrderForm, ticketsInteri: parseInt(e.target.value) || 0})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Extra Wine (Gratuiti)</label>
                  <input required type="number" min="0" className="input" value={manualOrderForm.ticketsExtra} onChange={e => setManualOrderForm({...manualOrderForm, ticketsExtra: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              
              <button type="submit" disabled={creatingOrder || (manualOrderForm.ticketsInteri === 0 && manualOrderForm.ticketsExtra === 0)} className="btn btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                {creatingOrder ? 'Creazione...' : 'Crea Ordine e Invia Biglietti'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          EDIT ORDER MODAL
      ────────────────────────────────────────────────────────────────────────── */}
      {editingOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'white', margin: 0 }}>Modifica Ordine #{editingOrder.id.substring(0,8).toUpperCase()}</h2>
              <button onClick={() => setEditingOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer' }}>
                <XCircle size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--neutral-400)', marginBottom: '0.5rem' }}>Nome Acquirente</label>
                <input 
                  className="input" 
                  value={editForm.buyerName}
                  onChange={e => setEditForm(f => ({ ...f, buyerName: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--neutral-400)', marginBottom: '0.5rem' }}>Email</label>
                <input 
                  className="input" 
                  type="email"
                  value={editForm.buyerEmail}
                  onChange={e => setEditForm(f => ({ ...f, buyerEmail: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--neutral-400)', marginBottom: '0.5rem' }}>Telefono</label>
                <input 
                  className="input" 
                  value={editForm.buyerPhone}
                  onChange={e => setEditForm(f => ({ ...f, buyerPhone: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--neutral-400)', marginBottom: '0.5rem' }}>Note sull'ordine</label>
                <textarea 
                  className="input" 
                  rows={3}
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              
              <button 
                className="btn btn-primary" 
                onClick={handleSaveEdit}
                style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
              >
                Salva Modifiche
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
