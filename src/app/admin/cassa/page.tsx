'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  CashierConfig,
  CashierEvent,
  CashierItem,
  CashierStats,
  DEFAULT_CASHIER_CONFIG
} from '@/lib/data/cashier';
import {
  Save,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  BarChart3,
  UtensilsCrossed,
  Layers,
  Key,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  ToggleLeft,
  ToggleRight,
  Store,
  CheckSquare,
  Square,
  Package,
  Settings
} from 'lucide-react';

const COMMON_EMOJIS = ['🍝', '🍲', '🍖', '🥩', '🥔', '🥪', '🥖', '🍕', '🍷', '🍾', '🍺', '💧', '🥤', '🍰', '☕'];

export default function AdminCashierPage() {
  const [config, setConfig] = useState<CashierConfig>(DEFAULT_CASHIER_CONFIG);
  const [stats, setStats] = useState<CashierStats | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab: 'menu' | 'cassas' | 'report' | 'events'
  const [activeTab, setActiveTab] = useState<'menu' | 'cassas' | 'report' | 'events'>('menu');
  const [selectedCassaForConfig, setSelectedCassaForConfig] = useState<string>('Cassa 1');

  // Load config & stats
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cashier');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        const activeId = data.config.activeEventId || data.config.events[0]?.id || '';
        setSelectedEventId(activeId);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const currentEvent = config.events.find(e => e.id === selectedEventId) || config.events[0];

  const handleSaveConfig = async (newConfig = config) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/cashier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig })
      });
      const data = await res.json();
      if (data.success) {
        setConfig(newConfig);
        setStatusMessage({ type: 'success', text: 'Configurazione cassa salvata con successo!' });
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Errore nel salvataggio' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Errore di connessione' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Dish / Item Management ────────────────────────────────────────────────

  const updateItem = (itemId: string, field: keyof CashierItem, val: any) => {
    if (!currentEvent) return;
    const updatedEvents = config.events.map(evt => {
      if (evt.id !== currentEvent.id) return evt;
      return {
        ...evt,
        items: evt.items.map(it => it.id === itemId ? { ...it, [field]: val } : it),
        updatedAt: new Date().toISOString()
      };
    });
    setConfig({ ...config, events: updatedEvents });
  };

  const addItem = () => {
    if (!currentEvent) return;
    const newItem: CashierItem = {
      id: 'itm_' + Date.now(),
      name: 'Nuovo Piatto / Prodotto',
      category: currentEvent.categories[0] || 'Primi',
      price: 5.00,
      isAvailable: true,
      stockQuantity: 100,
      icon: '🍽️'
    };
    const updatedEvents = config.events.map(evt => {
      if (evt.id !== currentEvent.id) return evt;
      return {
        ...evt,
        items: [...evt.items, newItem],
        updatedAt: new Date().toISOString()
      };
    });
    setConfig({ ...config, events: updatedEvents });
  };

  const removeItem = (itemId: string) => {
    if (!currentEvent) return;
    if (!confirm('Rimuovere questo piatto dal listino?')) return;
    const updatedEvents = config.events.map(evt => {
      if (evt.id !== currentEvent.id) return evt;
      return {
        ...evt,
        items: evt.items.filter(it => it.id !== itemId),
        updatedAt: new Date().toISOString()
      };
    });
    setConfig({ ...config, events: updatedEvents });
  };

  // ─── Category Management ───────────────────────────────────────────────────

  const addCategory = () => {
    if (!currentEvent) return;
    const catName = prompt('Nome della nuova categoria (es. Primi, Pizze, Bar):');
    if (!catName || !catName.trim()) return;
    if (currentEvent.categories.includes(catName.trim())) {
      alert('Categoria già esistente');
      return;
    }
    const updatedEvents = config.events.map(evt => {
      if (evt.id !== currentEvent.id) return evt;
      return {
        ...evt,
        categories: [...evt.categories, catName.trim()],
        updatedAt: new Date().toISOString()
      };
    });
    setConfig({ ...config, events: updatedEvents });
  };

  const removeCategory = (cat: string) => {
    if (!currentEvent) return;
    if (!confirm(`Rimuovere la categoria "${cat}"? (I piatti associati rimarranno ma dovranno essere riassegnati)`)) return;
    const updatedEvents = config.events.map(evt => {
      if (evt.id !== currentEvent.id) return evt;
      return {
        ...evt,
        categories: evt.categories.filter(c => c !== cat),
        updatedAt: new Date().toISOString()
      };
    });
    setConfig({ ...config, events: updatedEvents });
  };

  // ─── Cassa Item Assignment Helpers ─────────────────────────────────────────

  const knownCasses = currentEvent?.casses && currentEvent.casses.length > 0
    ? currentEvent.casses
    : Array.from(new Set([
        'Cassa 1',
        'Cassa 2',
        'Cassa Bar',
        'Stand Dolci',
        ...Object.keys(currentEvent?.cassaAssignments || {})
      ]));

  const toggleCassaItemAssignment = (cassaName: string, itemId: string) => {
    if (!currentEvent) return;
    const currentAssigned = currentEvent.cassaAssignments?.[cassaName] || [];
    const exists = currentAssigned.includes(itemId);
    const newAssigned = exists
      ? currentAssigned.filter(id => id !== itemId)
      : [...currentAssigned, itemId];

    const updatedEvents = config.events.map(evt => {
      if (evt.id !== currentEvent.id) return evt;
      return {
        ...evt,
        cassaAssignments: {
          ...(evt.cassaAssignments || {}),
          [cassaName]: newAssigned
        },
        updatedAt: new Date().toISOString()
      };
    });
    setConfig({ ...config, events: updatedEvents });
  };

  const setCassaAllItems = (cassaName: string, selectAll: boolean) => {
    if (!currentEvent) return;
    const newAssigned = selectAll ? currentEvent.items.map(i => i.id) : [];
    const updatedEvents = config.events.map(evt => {
      if (evt.id !== currentEvent.id) return evt;
      return {
        ...evt,
        cassaAssignments: {
          ...(evt.cassaAssignments || {}),
          [cassaName]: newAssigned
        },
        updatedAt: new Date().toISOString()
      };
    });
    setConfig({ ...config, events: updatedEvents });
  };

  const addCassaName = () => {
    if (!currentEvent) return;
    const name = prompt('Inserisci il nome della nuova cassa (es. "Cassa Bar", "Stand Dolci", "Cassa Griglia"):');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (knownCasses.includes(trimmed)) {
      alert('Esiste già una cassa configurata con questo nome!');
      return;
    }
    const newCassesList = [...knownCasses, trimmed];
    const updatedEvents = config.events.map(evt => {
      if (evt.id !== currentEvent.id) return evt;
      return {
        ...evt,
        casses: newCassesList,
        cassaAssignments: {
          ...(evt.cassaAssignments || {}),
          [trimmed]: []
        },
        updatedAt: new Date().toISOString()
      };
    });
    setConfig({ ...config, events: updatedEvents });
    setSelectedCassaForConfig(trimmed);
  };

  const removeCassaName = (cassaName: string) => {
    if (!currentEvent) return;
    if (!confirm(`Sei sicuro di voler eliminare definitivamente la cassa "${cassaName}"?`)) return;

    const newCassesList = knownCasses.filter(c => c !== cassaName);
    const currentAssignedMap = { ...(currentEvent.cassaAssignments || {}) };
    delete currentAssignedMap[cassaName];

    const updatedEvents = config.events.map(evt => {
      if (evt.id !== currentEvent.id) return evt;
      return {
        ...evt,
        casses: newCassesList,
        cassaAssignments: currentAssignedMap,
        updatedAt: new Date().toISOString()
      };
    });

    setConfig({ ...config, events: updatedEvents });
    if (selectedCassaForConfig === cassaName) {
      setSelectedCassaForConfig(newCassesList[0] || '');
    }
  };

  // ─── Event Management ──────────────────────────────────────────────────────

  const createNewEvent = () => {
    const name = prompt('Nome del nuovo Evento / Sagra (es. "Sagra del Fungo 2026"):');
    if (!name || !name.trim()) return;
    const code = prompt('Codice PIN/Accesso per i cassieri (es. "FUNGO2026"):') || 'EVENTO' + Math.floor(Math.random() * 900 + 100);

    const newEvt: CashierEvent = {
      id: 'evt_' + Date.now(),
      name: name.trim(),
      eventCode: code.trim().toUpperCase(),
      active: true,
      categories: ['Primi', 'Secondi', 'Bevande', 'Dolci'],
      items: [
        { id: 'itm_sample_1', name: 'Piatto Specialità', category: 'Primi', price: 6.00, isAvailable: true, stockQuantity: 100, icon: '🍝' },
        { id: 'itm_sample_2', name: 'Acqua Minerale (0.5L)', category: 'Bevande', price: 1.00, isAvailable: true, stockQuantity: 500, icon: '💧' },
        { id: 'itm_sample_3', name: 'Bicchiere di Vino', category: 'Bevande', price: 2.00, isAvailable: true, stockQuantity: 300, icon: '🍷' }
      ],
      startingNumber: 1,
      cassaAssignments: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newConfig = {
      ...config,
      events: [...config.events, newEvt],
      activeEventId: newEvt.id
    };
    setConfig(newConfig);
    setSelectedEventId(newEvt.id);
    handleSaveConfig(newConfig);
  };

  const handleResetReport = async () => {
    if (!currentEvent) return;
    const input = prompt(
      `⚠️ AZZERAMENTO TOTALE INCASSI & ORDINI\n\n` +
      `Questa azione cancellerà PERMANENTEMENTE tutti gli ordini registrati per l'evento "${currentEvent.name}" e riazzererà il report incassi (Z-Report) e la sequenza numerica ordini.\n\n` +
      `Per confermare l'azzeramento, digita la parola "conferma":`
    );

    if (input === null) return;

    if (input.trim().toLowerCase() !== 'conferma') {
      alert('❌ Parola di conferma errata. Operazione annullata.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/cashier/reset-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: currentEvent.id,
          confirmation: input.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Report incassi e ordini azzerati con successo!');
        fetchConfig();
      } else {
        alert(`❌ Errore: ${data.error || 'Impossibile azzerare il report'}`);
      }
    } catch (err: any) {
      alert('❌ Errore di connessione durante l’azzeramento.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Export CSV ────────────────────────────────────────────────────────────

  const exportCSV = () => {
    if (!stats) return;
    let csv = 'Tipo;Elemento;Quantita;Totale Contributo (€)\n';
    csv += `Riepilogo;Totale Generale;${stats.completedOrders} ordini;${stats.totalAmount.toFixed(2)}\n`;
    csv += `Riepilogo;Contanti;-;${stats.cashAmount.toFixed(2)}\n`;
    csv += `Riepilogo;POS Carta;-;${stats.posAmount.toFixed(2)}\n`;
    csv += `Riepilogo;Omaggi;-;${stats.omaggioAmount.toFixed(2)}\n\n`;

    csv += 'Cassa;Ordini;-;Totale (€)\n';
    Object.entries(stats.cassaBreakdown).forEach(([cassa, dat]) => {
      csv += `${cassa};${dat.count};-;${dat.total.toFixed(2)}\n`;
    });

    csv += '\nCategoria;Piatto;Porzioni Vendute;Totale Contributo (€)\n';
    Object.values(stats.itemsBreakdown).forEach(item => {
      csv += `${item.category};"${item.name.replace(/"/g, '""')}";${item.quantity};${item.totalAmount.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_cassa_${currentEvent?.name.replace(/\s+/g, '_') || 'evento'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--neutral-400)' }}>Caricamento modulo cassa...</div>;
  }

  return (
    <div>
      <AdminHeader
        title="Cassa & Eventi"
        subtitle="Gestisci il listino contributi, la disponibilità in stock per piatto e le casse dell'evento"
        actions={
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/cashier"
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--neutral-800)',
                border: '1px solid var(--neutral-700)',
                color: '#38bdf8',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            >
              Apri Cassa (/cashier) <ExternalLink size={15} />
            </Link>

            <button
              onClick={() => handleSaveConfig()}
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Save size={16} /> {saving ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
          </div>
        }
      />

      {statusMessage && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: statusMessage.type === 'success' ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
          color: statusMessage.type === 'success' ? '#4ade80' : '#ef4444',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {statusMessage.text}
        </div>
      )}

      {/* ── Event Selector & Quick Details ── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase' }}>
              Seleziona Evento Attivo
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setConfig({ ...config, activeEventId: e.target.value });
              }}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--neutral-800)',
                border: '1px solid var(--neutral-700)',
                color: 'var(--color-heading)',
                fontSize: '0.95rem',
                fontWeight: 700
              }}
            >
              {config.events.map(evt => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} {evt.active ? '(Attivo)' : '(Inattivo)'}
                </option>
              ))}
            </select>
          </div>

          {currentEvent && (
            <div style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '0.75rem',
              padding: '0.45rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Key size={16} color="#38bdf8" />
              <div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 800 }}>
                  Codice Accesso Cassa
                </span>
                <strong style={{ fontSize: '1.05rem', color: '#38bdf8', fontFamily: 'monospace', letterSpacing: '1px' }}>
                  {currentEvent.eventCode}
                </strong>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={createNewEvent}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Plus size={15} /> Nuovo Evento Cassa
          </button>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('menu')}
          style={{
            padding: '0.6rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'menu' ? 'var(--blue-600)' : 'transparent',
            color: activeTab === 'menu' ? '#fff' : 'var(--neutral-400)',
            fontWeight: 750,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <UtensilsCrossed size={16} /> Listino Piatti & Contributi
        </button>

        <button
          onClick={() => setActiveTab('cassas')}
          style={{
            padding: '0.6rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'cassas' ? 'var(--blue-600)' : 'transparent',
            color: activeTab === 'cassas' ? '#fff' : 'var(--neutral-400)',
            fontWeight: 750,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Store size={16} /> Configura Singole Casse
        </button>

        <button
          onClick={() => { setActiveTab('report'); fetchConfig(); }}
          style={{
            padding: '0.6rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'report' ? 'var(--blue-600)' : 'transparent',
            color: activeTab === 'report' ? '#fff' : 'var(--neutral-400)',
            fontWeight: 750,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <BarChart3 size={16} /> Report & Incassi Live
        </button>

        <button
          onClick={() => setActiveTab('events')}
          style={{
            padding: '0.6rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'events' ? 'var(--blue-600)' : 'transparent',
            color: activeTab === 'events' ? '#fff' : 'var(--neutral-400)',
            fontWeight: 750,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Layers size={16} /> Impostazioni Evento
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: MENU & DISHES LIST (WITH STOCK MANAGEMENT)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'menu' && currentEvent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Categories Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-heading)' }}>
                📂 Categorie Menu
              </h3>
              <button
                type="button"
                onClick={addCategory}
                style={{
                  background: 'var(--neutral-800)',
                  border: '1px solid var(--neutral-700)',
                  color: 'var(--neutral-300)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Plus size={14} /> Aggiungi Categoria
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {currentEvent.categories.map(cat => (
                <div
                  key={cat}
                  style={{
                    background: 'var(--neutral-850)',
                    border: '1px solid var(--neutral-700)',
                    borderRadius: '999px',
                    padding: '0.3rem 0.85rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(cat)}
                    style={{ background: 'none', border: 'none', color: 'var(--neutral-500)', cursor: 'pointer', padding: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Dishes Table Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-heading)' }}>
                  🍽️ Listino Articoli, Prezzi & Stock Quantità
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--neutral-400)' }}>
                  Imposta il contributo (€) ed il numero di porzioni disponibili in stock per ciascun piatto. Quando lo stock arriva a 0, il piatto si disattiva automaticamente in cassa.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
              >
                <Plus size={15} /> Aggiungi Piatto
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--neutral-850)', color: 'var(--neutral-400)', textAlign: 'left' }}>
                    <th style={{ padding: '0.65rem 0.75rem', width: '50px' }}>Icona</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Nome Piatto</th>
                    <th style={{ padding: '0.65rem 0.75rem', width: '150px' }}>Categoria</th>
                    <th style={{ padding: '0.65rem 0.75rem', width: '130px' }}>Contributo (€)</th>
                    <th style={{ padding: '0.65rem 0.75rem', width: '145px', textAlign: 'center' }}>Stock Quantità</th>
                    <th style={{ padding: '0.65rem 0.75rem', width: '140px', textAlign: 'center' }}>Disponibilità</th>
                    <th style={{ padding: '0.65rem 0.75rem', width: '50px', textAlign: 'center' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEvent.items.map((item) => (
                    <tr key={item.id} style={{ borderTop: '1px solid var(--neutral-800)' }}>
                      {/* Emoji Icon */}
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <select
                          value={item.icon || '🍽️'}
                          onChange={(e) => updateItem(item.id, 'icon', e.target.value)}
                          style={{
                            background: 'var(--neutral-800)',
                            border: '1px solid var(--neutral-700)',
                            borderRadius: '0.5rem',
                            padding: '0.3rem',
                            fontSize: '1.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          {COMMON_EMOJIS.map(em => (
                            <option key={em} value={em}>{em}</option>
                          ))}
                        </select>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.65rem',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--neutral-800)',
                            border: '1px solid var(--neutral-700)',
                            color: 'var(--color-heading)',
                            fontSize: '0.9rem',
                            fontWeight: 650
                          }}
                        />
                      </td>

                      {/* Category */}
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.65rem',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--neutral-800)',
                            border: '1px solid var(--neutral-700)',
                            color: 'var(--color-heading)',
                            fontSize: '0.85rem'
                          }}
                        >
                          {currentEvent.categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>

                      {/* Contribution Price */}
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <span style={{ color: 'var(--neutral-400)', fontWeight: 700 }}>€</span>
                          <input
                            type="number"
                            step="0.50"
                            min="0"
                            value={item.price}
                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            style={{
                              width: '90px',
                              padding: '0.45rem 0.5rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--neutral-800)',
                              border: '1px solid var(--neutral-700)',
                              color: 'var(--color-heading)',
                              fontSize: '0.95rem',
                              fontWeight: 800,
                              fontFamily: 'monospace'
                            }}
                          />
                        </div>
                      </td>

                      {/* Stock Quantity */}
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                          <input
                            type="number"
                            min="0"
                            placeholder="∞"
                            value={item.stockQuantity !== undefined ? item.stockQuantity : ''}
                            onChange={(e) => {
                              const valStr = e.target.value;
                              if (valStr === '') {
                                updateItem(item.id, 'stockQuantity', undefined);
                              } else {
                                const num = parseInt(valStr, 10);
                                const safeNum = isNaN(num) ? undefined : Math.max(0, num);
                                updateItem(item.id, 'stockQuantity', safeNum);
                                if (safeNum === 0) {
                                  updateItem(item.id, 'isAvailable', false);
                                } else if (safeNum && safeNum > 0 && !item.isAvailable) {
                                  updateItem(item.id, 'isAvailable', true);
                                }
                              }
                            }}
                            style={{
                              width: '75px',
                              padding: '0.45rem 0.5rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--neutral-800)',
                              border: '1px solid var(--neutral-700)',
                              color: item.stockQuantity === 0 ? '#ef4444' : item.stockQuantity !== undefined ? '#38bdf8' : 'var(--neutral-400)',
                              fontSize: '0.9rem',
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              textAlign: 'center'
                            }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 600 }}>
                            {item.stockQuantity !== undefined ? 'pz' : '∞'}
                          </span>
                        </div>
                      </td>

                      {/* Availability Toggle */}
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, 'isAvailable', !item.isAvailable)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '999px',
                            border: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: item.isAvailable ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: item.isAvailable ? '#4ade80' : '#ef4444'
                          }}
                        >
                          {item.isAvailable ? '🟢 Disponibile' : '🔴 Esaurito'}
                        </button>
                      </td>

                      {/* Delete */}
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--neutral-500)',
                            cursor: 'pointer',
                            padding: '0.3rem'
                          }}
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: CASSA-BY-CASSA PRODUCT ASSIGNMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'cassas' && currentEvent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Info Header Card */}
          <div className="card" style={{ padding: '1.25rem', background: 'rgba(30, 41, 59, 0.5)', borderColor: 'var(--neutral-700)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Store size={20} /> Configurazione Prodotti per Singola Cassa
            </h3>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--neutral-300)', lineHeight: 1.5 }}>
              Associa i prodotti del listino a ciascun punto cassa (es. <strong>Cassa Bar</strong> vede solo bevande e caffè, <strong>Stand Dolci</strong> vede solo dolci).<br />
              <span style={{ color: '#fb923c', fontWeight: 700 }}>Nota:</span> Se per una cassa non selezioni alcun prodotto (oppure clicchi &quot;Mostra Tutti&quot;), saranno visibili <strong>tutti i prodotti dell&apos;evento</strong>.
            </p>
          </div>

          {/* Cassa Selector Chips */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {knownCasses.map(cassaName => {
              const assignedIds = currentEvent.cassaAssignments?.[cassaName];
              const isSelected = selectedCassaForConfig === cassaName;
              const countStr = assignedIds && assignedIds.length > 0 ? `${assignedIds.length} prodotti` : 'Tutti i prodotti';

              return (
                <div
                  key={cassaName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'var(--neutral-850)',
                    border: `1px solid ${isSelected ? '#38bdf8' : 'var(--neutral-700)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.55rem 0.95rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedCassaForConfig(cassaName)}
                >
                  <Store size={16} color={isSelected ? '#38bdf8' : 'var(--neutral-400)'} />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: isSelected ? '#38bdf8' : 'var(--color-heading)', display: 'block' }}>
                      {cassaName}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--neutral-400)' }}>
                      {countStr}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCassaName(cassaName);
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#ef4444',
                      borderRadius: '0.35rem',
                      cursor: 'pointer',
                      marginLeft: '0.4rem',
                      padding: '0.25rem 0.4rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={`Elimina cassa "${cassaName}"`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={addCassaName}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--neutral-800)',
                border: '1px dashed var(--neutral-600)',
                color: 'var(--neutral-300)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Plus size={14} /> Nuova Cassa
            </button>
          </div>

          {/* Detailed Item Assignment Grid for Selected Cassa */}
          {selectedCassaForConfig && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-heading)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Store size={18} color="#38bdf8" /> Prodotti Abilitati per &quot;{selectedCassaForConfig}&quot;
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--neutral-400)' }}>
                    {(currentEvent.cassaAssignments?.[selectedCassaForConfig]?.length || 0) === 0
                      ? 'Attualmente questa cassa mostra TUTTI i prodotti del listino (Default).'
                      : `${currentEvent.cassaAssignments?.[selectedCassaForConfig]?.length} di ${currentEvent.items.length} prodotti selezionati.`}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setCassaAllItems(selectedCassaForConfig, true)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--neutral-800)',
                      border: '1px solid var(--neutral-700)',
                      color: '#38bdf8',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <CheckSquare size={14} /> Seleziona Tutti
                  </button>
                  <button
                    type="button"
                    onClick={() => setCassaAllItems(selectedCassaForConfig, false)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--neutral-800)',
                      border: '1px solid var(--neutral-700)',
                      color: 'var(--neutral-400)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Square size={14} /> Mostra Tutti (Default)
                  </button>
                </div>
              </div>

              {/* Items Grouped by Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {currentEvent.categories.map(cat => {
                  const catItems = currentEvent.items.filter(i => i.category === cat);
                  if (catItems.length === 0) return null;

                  const assignedForCassa = currentEvent.cassaAssignments?.[selectedCassaForConfig] || [];

                  return (
                    <div key={cat} style={{ background: 'var(--neutral-850)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--neutral-800)' }}>
                      <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 800, color: 'var(--neutral-300)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📁 {cat} ({catItems.length})
                      </h5>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.65rem' }}>
                        {catItems.map(item => {
                          const isAssigned = assignedForCassa.includes(item.id);

                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleCassaItemAssignment(selectedCassaForConfig, item.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.65rem',
                                padding: '0.65rem 0.85rem',
                                borderRadius: 'var(--radius-md)',
                                background: isAssigned ? 'rgba(56, 189, 248, 0.12)' : 'var(--neutral-800)',
                                border: `1.5px solid ${isAssigned ? '#38bdf8' : 'var(--neutral-700)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ color: isAssigned ? '#38bdf8' : 'var(--neutral-500)', display: 'flex', alignItems: 'center' }}>
                                {isAssigned ? <CheckSquare size={18} /> : <Square size={18} />}
                              </div>

                              <span style={{ fontSize: '1.2rem' }}>{item.icon || '🍽️'}</span>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 750, color: isAssigned ? '#fff' : 'var(--neutral-300)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {item.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', gap: '0.5rem' }}>
                                  <span>€{item.price.toFixed(2)}</span>
                                  {item.stockQuantity !== undefined && (
                                    <span style={{ color: item.stockQuantity === 0 ? '#ef4444' : '#38bdf8', fontWeight: 700 }}>
                                      📦 {item.stockQuantity} pz
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: REPORT & STATISTICHE LIVE (Z-REPORT)
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'report' && currentEvent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-heading)' }}>
                📊 Rendiconto Chiusura Cassa (Live)
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                Dati aggregati per tutte le casse dell&apos;evento <strong>{currentEvent.name}</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={fetchConfig}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--neutral-800)',
                  border: '1px solid var(--neutral-700)',
                  color: 'var(--neutral-300)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} /> Aggiorna Dati
              </button>

              <button
                type="button"
                onClick={exportCSV}
                disabled={!stats}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--blue-600)',
                  color: 'white',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Download size={14} /> Esporta CSV
              </button>

              <button
                type="button"
                onClick={handleResetReport}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#ef4444',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} /> Azzera Report Incassi ⚠️
              </button>
            </div>
          </div>

          {!stats ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>
              Nessun ordine registrato al momento per questo evento.
            </div>
          ) : (
            <>
              {/* 4 Cards Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--neutral-400)', textTransform: 'uppercase' }}>
                    TOTALE CONTRIBUTI
                  </span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', margin: '0.3rem 0' }}>
                    €{stats.totalAmount.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                    {stats.completedOrders} ordini emessi ({stats.voidedOrders} stornati)
                  </span>
                </div>

                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #34d399' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase' }}>
                    INCASSO CONTANTI
                  </span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399', fontFamily: 'monospace', margin: '0.3rem 0' }}>
                    €{stats.cashAmount.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                    Versati in contanti al banco
                  </span>
                </div>

                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #38bdf8' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                    INCASSO POS / CARTE
                  </span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', margin: '0.3rem 0' }}>
                    €{stats.posAmount.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                    Transati via POS elettronico
                  </span>
                </div>

                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #fb923c' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fb923c', textTransform: 'uppercase' }}>
                    VALORE OMAGGI
                  </span>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fb923c', fontFamily: 'monospace', margin: '0.3rem 0' }}>
                    €{stats.omaggioAmount.toFixed(2)}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                    Staff, volontari e sponsor
                  </span>
                </div>
              </div>

              {/* Breakdown By Cassa */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-heading)' }}>
                  🏷️ Rendiconto per Singola Cassa
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {Object.entries(stats.cassaBreakdown).map(([cassa, cData]) => (
                    <div
                      key={cassa}
                      style={{
                        background: 'var(--neutral-850)',
                        border: '1px solid var(--neutral-700)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem'
                      }}
                    >
                      <strong style={{ fontSize: '1rem', color: 'var(--color-heading)', display: 'block' }}>
                        {cassa}
                      </strong>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace', margin: '0.2rem 0' }}>
                        €{cData.total.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span>💵 Contanti: €{cData.cash.toFixed(2)}</span>
                        <span>💳 POS: €{cData.pos.toFixed(2)}</span>
                        <span>🎁 Omaggi: €{cData.omaggio.toFixed(2)}</span>
                        <span style={{ fontWeight: 700, color: 'var(--neutral-300)' }}>📦 Ordini: {cData.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown By Dish */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-heading)' }}>
                  🍽️ Classifica Piatti & Porzioni Vendute
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--neutral-850)', color: 'var(--neutral-400)', textAlign: 'left' }}>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Piatto</th>
                        <th style={{ padding: '0.65rem 0.85rem' }}>Categoria</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Porzioni Vendute</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Totale Contributo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(stats.itemsBreakdown)
                        .sort((a, b) => b.quantity - a.quantity)
                        .map((item, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid var(--neutral-800)' }}>
                            <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>{item.name}</td>
                            <td style={{ padding: '0.65rem 0.85rem', color: 'var(--neutral-400)' }}>{item.category}</td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 800, color: '#38bdf8', fontSize: '1rem' }}>
                              {item.quantity}x
                            </td>
                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 900, fontFamily: 'monospace' }}>
                              €{item.totalAmount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 4: EVENT CONFIGURATION
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'events' && currentEvent && (
        <div className="card" style={{ padding: '1.5rem', maxWidth: '650px' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-heading)' }}>
            ⚙️ Impostazioni Evento Cassa
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--neutral-300)', marginBottom: '0.35rem' }}>
                Nome Evento
              </label>
              <input
                type="text"
                value={currentEvent.name}
                onChange={(e) => {
                  const updated = config.events.map(ev => ev.id === currentEvent.id ? { ...ev, name: e.target.value } : ev);
                  setConfig({ ...config, events: updated });
                }}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--neutral-800)',
                  border: '1px solid var(--neutral-700)',
                  color: 'var(--color-heading)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--neutral-300)', marginBottom: '0.35rem' }}>
                Codice Accesso Cassa (PIN per i volontari)
              </label>
              <input
                type="text"
                value={currentEvent.eventCode}
                onChange={(e) => {
                  const updated = config.events.map(ev => ev.id === currentEvent.id ? { ...ev, eventCode: e.target.value.toUpperCase() } : ev);
                  setConfig({ ...config, events: updated });
                }}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--neutral-800)',
                  border: '1px solid var(--neutral-700)',
                  color: '#38bdf8',
                  fontSize: '1rem',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--neutral-400)', display: 'block', marginTop: '0.25rem' }}>
                I volontari inseriranno questo codice su <code>/cashier</code> per accedere al registratore di cassa.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--neutral-300)', marginBottom: '0.35rem' }}>
                Stato Cassa (Attiva / Chiusa)
              </label>
              <button
                type="button"
                onClick={() => {
                  const updated = config.events.map(ev => ev.id === currentEvent.id ? { ...ev, active: !ev.active } : ev);
                  setConfig({ ...config, events: updated });
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  background: currentEvent.active ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: currentEvent.active ? '#4ade80' : '#ef4444'
                }}
              >
                {currentEvent.active ? '🟢 Cassa Attiva e Operativa' : '🔴 Cassa Disattivata'}
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--neutral-300)', marginBottom: '0.35rem' }}>
                Modalità Smistamento Multi-Stand / Reparti
              </label>
              <button
                type="button"
                onClick={() => {
                  const updated = config.events.map(ev => ev.id === currentEvent.id ? { ...ev, enableDepartments: !ev.enableDepartments } : ev);
                  setConfig({ ...config, events: updated });
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 750,
                  cursor: 'pointer',
                  background: currentEvent.enableDepartments ? 'rgba(56,189,248,0.15)' : 'rgba(148,163,184,0.15)',
                  color: currentEvent.enableDepartments ? '#38bdf8' : '#94a3b8'
                }}
              >
                {currentEvent.enableDepartments ? '🔵 Multi-Stand Attivo (Comande divise per Reparto)' : '⚪ Totem Unico (Default - Singolo Monitor Cassa/Cucina)'}
              </button>
              <span style={{ fontSize: '0.72rem', color: 'var(--neutral-400)', display: 'block', marginTop: '0.25rem' }}>
                Se disattivo (default), il monitor <code>/cashier/stand</code> mostra gli ordini completi su un unico schermo Totem Generale.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--neutral-300)', marginBottom: '0.35rem' }}>
                Numero Progressivo di Partenza
              </label>
              <input
                type="number"
                min="1"
                value={currentEvent.startingNumber || 1}
                onChange={(e) => {
                  const updated = config.events.map(ev => ev.id === currentEvent.id ? { ...ev, startingNumber: parseInt(e.target.value) || 1 } : ev);
                  setConfig({ ...config, events: updated });
                }}
                style={{
                  width: '120px',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--neutral-800)',
                  border: '1px solid var(--neutral-700)',
                  color: 'var(--color-heading)',
                  fontSize: '0.9rem',
                  fontWeight: 700
                }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--neutral-400)', display: 'block', marginTop: '0.25rem' }}>
                Il primo ordine partirà da questo numero (es. 1).
              </span>
            </div>

            <div style={{ marginTop: '0.5rem', paddingTop: '0.85rem', borderTop: '1px solid var(--neutral-800)' }}>
              <button
                type="button"
                onClick={async () => {
                  const num = prompt('Inserisci il numero da cui far ripartire la numerazione degli ordini:', String(currentEvent.startingNumber || 1));
                  if (!num) return;
                  const startNum = parseInt(num) || 1;
                  if (!confirm(`Sei sicuro di voler resettare la numerazione ordini facendo ripartire dal numero #${startNum}?`)) return;

                  try {
                    const res = await fetch('/api/admin/cashier/reset-sequence', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ eventId: currentEvent.id, startingNumber: startNum })
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert(`✅ Numerazione resettata con successo! I prossimi ordini ripartiranno dal #${startNum}.`);
                      fetchConfig();
                    } else {
                      alert(`❌ Errore: ${data.error || 'Impossibile resettare la numerazione'}`);
                    }
                  } catch (err) {
                    alert('❌ Errore di connessione durante il reset.');
                  }
                }}
                style={{
                  padding: '0.65rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(234,88,12,0.4)',
                  background: 'rgba(234,88,12,0.15)',
                  color: '#fb923c',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <RefreshCw size={15} /> Reset Sequenza Numerazione Ordini 🔄
              </button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--neutral-300)', marginBottom: '0.35rem' }}>
                Note Ricevuta
              </label>
              <textarea
                rows={2}
                value={currentEvent.notes || ''}
                onChange={(e) => {
                  const updated = config.events.map(ev => ev.id === currentEvent.id ? { ...ev, notes: e.target.value } : ev);
                  setConfig({ ...config, events: updated });
                }}
                placeholder="Es. Contributo per attività istituzionali..."
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--neutral-800)',
                  border: '1px solid var(--neutral-700)',
                  color: 'var(--color-heading)',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
