'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2, ArrowLeft, Plus, Trash2, Loader2, RotateCcw, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { type ZuccalandContent, type ZuccalandDateLimit, DEFAULT_ZUCCALAND_CONTENT } from '@/lib/data/pages';
import AdminHeader from '@/components/admin/AdminHeader';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert ISO datetime to local datetime-local input value */
function toLocalInput(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  } catch { return ''; }
}

/** Convert datetime-local input value to ISO string */
function fromLocalInput(val: string): string {
  if (!val) return '';
  return new Date(val).toISOString();
}

const HIGHLIGHT_ICON_OPTIONS = [
  { value: 'shopping-bag', label: '🛍️ Shopping Bag' },
  { value: 'music', label: '🎵 Music' },
  { value: 'coffee', label: '☕ Coffee' },
  { value: 'image', label: '📷 Image' },
  { value: 'calendar', label: '📅 Calendar' },
  { value: 'sparkles', label: '✨ Sparkles' },
];

// ─── Admin Page ───────────────────────────────────────────────────────────────

export default function ZuccalandAdminPage() {
  const [data, setData] = useState<ZuccalandContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [liveCounts, setLiveCounts] = useState<{
    '10': { admissionTickets: number; totalTickets: number; orders: number };
    '11': { admissionTickets: number; totalTickets: number; orders: number };
  } | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);

  const fetchLiveCounts = async () => {
    setLoadingCounts(true);
    try {
      const res = await fetch('/api/zuccaland/availability');
      const json = await res.json();
      if (json.success && json.counts) {
        setLiveCounts(json.counts);
      }
    } catch (err) {
      console.error('Failed to fetch live ticket counts:', err);
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/pages?slug=zuccaland')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setData({
            hero: { ...DEFAULT_ZUCCALAND_CONTENT.hero, ...(json.data.hero || {}) },
            event: { ...DEFAULT_ZUCCALAND_CONTENT.event, ...(json.data.event || {}) },
            dateLimits: {
              '10': { ...DEFAULT_ZUCCALAND_CONTENT.dateLimits!['10'], ...(json.data.dateLimits?.['10'] || {}) },
              '11': { ...DEFAULT_ZUCCALAND_CONTENT.dateLimits!['11'], ...(json.data.dateLimits?.['11'] || {}) },
            },
            infoCards: json.data.infoCards || DEFAULT_ZUCCALAND_CONTENT.infoCards,
            ticketTypes: json.data.ticketTypes || DEFAULT_ZUCCALAND_CONTENT.ticketTypes,
            freeActivities: json.data.freeActivities || DEFAULT_ZUCCALAND_CONTENT.freeActivities,
            highlights: json.data.highlights || DEFAULT_ZUCCALAND_CONTENT.highlights,
            program: { ...DEFAULT_ZUCCALAND_CONTENT.program, ...(json.data.program || {}) },
            tickets: { ...DEFAULT_ZUCCALAND_CONTENT.tickets, ...(json.data.tickets || {}) },
            faqs: json.data.faqs || DEFAULT_ZUCCALAND_CONTENT.faqs,
          });
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    fetchLiveCounts();
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'zuccaland', content: data })
      });
      const json = await res.json();
      if (json.success) {
        setStatus({ type: 'success', message: 'Modifiche salvate con successo. Il sito è aggiornato!' });
        setTimeout(() => setStatus(null), 5000);
      } else {
        setStatus({ type: 'error', message: json.error || 'Errore durante il salvataggio' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  // ── Update helpers ──
  const updateHero = (field: string, value: string) =>
    data && setData({ ...data, hero: { ...data.hero, [field]: value } });
  const updateEvent = (field: string, value: string) =>
    data && setData({ ...data, event: { ...data.event, [field]: value } });
  const updateProgram = (field: string, value: string) =>
    data && setData({ ...data, program: { ...data.program, [field]: value } });
  const updateTickets = (field: string, value: string) =>
    data && setData({ ...data, tickets: { ...data.tickets, [field]: value } });
  const updateDateLimit = (dayKey: '10' | '11', field: keyof ZuccalandDateLimit, value: any) => {
    if (!data) return;
    const currentLimits = data.dateLimits || DEFAULT_ZUCCALAND_CONTENT.dateLimits!;
    setData({
      ...data,
      dateLimits: {
        ...currentLimits,
        [dayKey]: {
          ...currentLimits[dayKey],
          [field]: value
        }
      }
    });
  };

  // ── Info Cards ──
  const addInfoCard = () =>
    data && setData({ ...data, infoCards: [...data.infoCards, { emoji: '🎉', title: 'Nuova Card', description: '', color: '#fef08a', items: ['Elemento 1'] }] });
  const removeInfoCard = (index: number) =>
    data && setData({ ...data, infoCards: data.infoCards.filter((_, i) => i !== index) });
  const updateInfoCard = (index: number, field: string, value: any) =>
    data && setData({ ...data, infoCards: data.infoCards.map((c, i) => i === index ? { ...c, [field]: value } : c) });
  const addInfoCardItem = (cardIndex: number) =>
    data && setData({ ...data, infoCards: data.infoCards.map((c, i) => i === cardIndex ? { ...c, items: [...c.items, 'Nuovo elemento'] } : c) });
  const removeInfoCardItem = (cardIndex: number, itemIndex: number) =>
    data && setData({ ...data, infoCards: data.infoCards.map((c, i) => i === cardIndex ? { ...c, items: c.items.filter((_, j) => j !== itemIndex) } : c) });
  const updateInfoCardItem = (cardIndex: number, itemIndex: number, value: string) =>
    data && setData({ ...data, infoCards: data.infoCards.map((c, i) => i === cardIndex ? { ...c, items: c.items.map((it, j) => j === itemIndex ? value : it) } : c) });

  // ── Ticket Types ──
  const addTicketType = () =>
    data && setData({ ...data, ticketTypes: [...data.ticketTypes, { id: `ticket_${Date.now()}`, label: 'Nuovo Biglietto', price: 0, description: '', emoji: '🎟️', isExtra: false }] });
  const removeTicketType = (index: number) =>
    data && setData({ ...data, ticketTypes: data.ticketTypes.filter((_, i) => i !== index) });
  const updateTicketType = (index: number, field: string, value: any) =>
    data && setData({ ...data, ticketTypes: data.ticketTypes.map((t, i) => i === index ? { ...t, [field]: value } : t) });

  // ── Free Activities ──
  const addFreeActivity = () =>
    data && setData({ ...data, freeActivities: [...data.freeActivities, { id: `act_${Date.now()}`, label: 'Nuova Attività', details: '' }] });
  const removeFreeActivity = (index: number) =>
    data && setData({ ...data, freeActivities: data.freeActivities.filter((_, i) => i !== index) });
  const updateFreeActivity = (index: number, field: string, value: string) =>
    data && setData({ ...data, freeActivities: data.freeActivities.map((a, i) => i === index ? { ...a, [field]: value } : a) });

  // ── Highlights ──
  const addHighlight = () =>
    data && setData({ ...data, highlights: [...data.highlights, { icon: 'sparkles', title: 'Nuovo', description: '', bgColor: '#ea580c', textColor: '#ffffff' }] });
  const removeHighlight = (index: number) =>
    data && setData({ ...data, highlights: data.highlights.filter((_, i) => i !== index) });
  const updateHighlight = (index: number, field: string, value: string) =>
    data && setData({ ...data, highlights: data.highlights.map((h, i) => i === index ? { ...h, [field]: value } : h) });

  // ── FAQs ──
  const addFaq = () =>
    data && setData({ ...data, faqs: [...(data.faqs || []), { question: 'Nuova domanda?', answer: '' }] });
  const removeFaq = (index: number) =>
    data && setData({ ...data, faqs: (data.faqs || []).filter((_, i) => i !== index) });
  const updateFaq = (index: number, field: 'question' | 'answer', value: string) =>
    data && setData({
      ...data,
      faqs: (data.faqs || []).map((faq, i) => (i === index ? { ...faq, [field]: value } : faq))
    });

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-heading)',
    borderBottom: '1px solid var(--neutral-700)', paddingBottom: '0.75rem',
  };

  const miniCardStyle: React.CSSProperties = {
    background: 'var(--neutral-900)', border: '1px solid var(--neutral-700)',
    borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '0.85rem',
    position: 'relative',
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.85rem',
    background: 'var(--neutral-800)',
    border: '1px solid var(--neutral-700)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.78rem',
    color: 'var(--neutral-300)',
    marginBottom: '0.35rem',
    fontWeight: 500,
  };

  const deleteButtonStyle: React.CSSProperties = {
    position: 'absolute', top: '0.75rem', right: '0.75rem',
    background: 'rgba(239,68,68,0.12)', color: '#ef4444',
    border: 'none', borderRadius: '0.5rem', padding: '0.4rem',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const addButtonStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--neutral-600)',
    background: 'rgba(27,75,170,0.06)', color: 'var(--blue-400)', cursor: 'pointer',
    fontWeight: 600, fontSize: '0.85rem', width: '100%', justifyContent: 'center',
    transition: 'all 0.2s',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--neutral-500)' }} />
      </div>
    );
  }

  if (!data) {
    return <div style={{ padding: '2rem', color: 'var(--neutral-400)' }}>Errore nel caricamento dei dati.</div>;
  }

  return (
    <div>
      <AdminHeader
        title="CMS: Zuccaland"
        subtitle="Modifica testi, date, biglietti, attività e sezioni di Zuccaland"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link
              href="/admin"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)',
                background: 'var(--neutral-800)', border: '1px solid var(--neutral-700)',
                color: 'var(--neutral-300)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500,
              }}
            >
              <ArrowLeft size={16} /> Indietro
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {saving ? <><Loader2 size={16} className="animate-spin" /> Salvataggio...</> : <><Save size={16} /> Salva Modifiche</>}
            </button>
          </div>
        }
      />

      {status && (
        <div style={{
          padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: status.type === 'success' ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
          color: status.type === 'success' ? '#4ade80' : '#ef4444',
          border: `1px solid ${status.type === 'success' ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
          fontSize: '0.9rem', fontWeight: 500,
        }}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {status.message}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px' }}>
        
        {/* ── Hero ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={sectionHeaderStyle}>
            Sezione Hero
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Titolo H1 (nascosto visualmente ma per SEO)</label>
              <input type="text" style={fieldStyle} value={data.hero.title} onChange={e => updateHero('title', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Sottotitolo (es. Il villaggio delle zucche...)</label>
              <input type="text" style={fieldStyle} value={data.hero.subtitle} onChange={e => updateHero('subtitle', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Descrizione introduttiva</label>
              <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={2} value={data.hero.description} onChange={e => updateHero('description', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Badge Date e Luogo (mostrato anche nel countdown)</label>
              <input type="text" style={fieldStyle} value={data.hero.badge} onChange={e => updateHero('badge', e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Event Dates ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={sectionHeaderStyle}>
            📅 Date Evento e Vendita
          </h2>
          <p style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Queste date controllano automaticamente lo stato della pagina: pre-vendita (countdown), vendita aperta, evento in corso, o evento concluso.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Apertura Vendita Biglietti</label>
              <input type="datetime-local" style={fieldStyle} value={toLocalInput(data.event.salesOpenDate)} onChange={e => updateEvent('salesOpenDate', fromLocalInput(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Chiusura Vendita Biglietti</label>
              <input type="datetime-local" style={fieldStyle} value={toLocalInput(data.event.salesCloseDate)} onChange={e => updateEvent('salesCloseDate', fromLocalInput(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Inizio Evento</label>
              <input type="datetime-local" style={fieldStyle} value={toLocalInput(data.event.startDate)} onChange={e => updateEvent('startDate', fromLocalInput(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Fine Evento</label>
              <input type="datetime-local" style={fieldStyle} value={toLocalInput(data.event.endDate)} onChange={e => updateEvent('endDate', fromLocalInput(e.target.value))} />
            </div>
          </div>
        </div>

        {/* ── Capienza e Limiti Biglietti (Sold Out) ── */}
        <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(234,88,12,0.3)', background: 'linear-gradient(180deg, rgba(234,88,12,0.04) 0%, rgba(0,0,0,0) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div>
              <h2 style={{ ...sectionHeaderStyle, borderBottom: 'none', marginBottom: '0.35rem', paddingBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🎯</span> Capienza e Limiti Biglietti per Data (Sold Out)
              </h2>
              <p style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                Imposta una capienza massima di biglietti per ciascuna data. Al raggiungimento del limite di ingressi venduti, la data risulterà automaticamente <strong>SOLD OUT</strong>. Puoi anche forzare manualmente lo stato di Sold Out con l&apos;apposito toggle.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchLiveCounts}
              disabled={loadingCounts}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                color: 'var(--neutral-300)',
                background: 'var(--neutral-800)',
                border: '1px solid var(--neutral-700)',
                padding: '0.45rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              title="Aggiorna vendite attuali dal database"
            >
              <RefreshCw size={13} className={loadingCounts ? 'animate-spin' : ''} />
              Aggiorna vendite
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
            {(['10', '11'] as const).map(dayKey => {
              const dayLabel = dayKey === '10' ? 'Sabato 10 Ottobre' : 'Domenica 11 Ottobre';
              const dayEmoji = dayKey === '10' ? '🟧' : '🟨';
              const limits = data.dateLimits?.[dayKey] || DEFAULT_ZUCCALAND_CONTENT.dateLimits![dayKey];
              const counts = liveCounts?.[dayKey] || { admissionTickets: 0, totalTickets: 0, orders: 0 };
              
              const isLimitActive = limits.enabled;
              const isManualSoldOut = Boolean(limits.manualSoldOut);
              const isCapacityReached = isLimitActive && counts.admissionTickets >= limits.maxTickets;
              const isSoldOut = isManualSoldOut || isCapacityReached;

              const percentUsed = isLimitActive && limits.maxTickets > 0
                ? Math.min(100, Math.round((counts.admissionTickets / limits.maxTickets) * 100))
                : 0;

              return (
                <div
                  key={dayKey}
                  style={{
                    background: isSoldOut ? 'rgba(239,68,68,0.06)' : 'var(--neutral-900)',
                    border: `1.5px solid ${isSoldOut ? 'rgba(239,68,68,0.35)' : 'var(--neutral-700)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    position: 'relative',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Header per la data */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--neutral-800)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{dayEmoji}</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--color-heading)' }}>{dayLabel}</strong>
                    </div>

                    {/* Badge Stato */}
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: isSoldOut ? 'rgba(239,68,68,0.2)' : isLimitActive ? 'rgba(234,88,12,0.2)' : 'rgba(74,222,128,0.15)',
                        color: isSoldOut ? '#ef4444' : isLimitActive ? '#fb923c' : '#4ade80',
                        border: `1px solid ${isSoldOut ? 'rgba(239,68,68,0.4)' : isLimitActive ? 'rgba(234,88,12,0.4)' : 'rgba(74,222,128,0.3)'}`,
                      }}
                    >
                      {isManualSoldOut
                        ? '🚨 Sold Out Manuale'
                        : isCapacityReached
                        ? '🚨 Sold Out (Capienza)'
                        : isLimitActive
                        ? `Aperto (${Math.max(0, limits.maxTickets - counts.admissionTickets)} rimanenti)`
                        : 'Aperto (Illimitato)'}
                    </span>
                  </div>

                  {/* Statistiche Realtime Biglietti */}
                  <div style={{
                    background: 'var(--neutral-800)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    marginBottom: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--neutral-400)' }}>🎟️ Ingressi venduti:</span>
                      <strong style={{ color: '#fed7aa', fontSize: '1.05rem' }}>
                        {counts.admissionTickets}
                        {isLimitActive && <span style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', fontWeight: 500 }}> / {limits.maxTickets} max</span>}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--neutral-400)' }}>
                      <span>📦 Ordini pagati: {counts.orders}</span>
                      <span>Totale biglietti (inclusi extra): {counts.totalTickets}</span>
                    </div>

                    {/* Progress Bar se il limite è abilitato */}
                    {isLimitActive && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: percentUsed >= 90 ? '#ef4444' : '#fdba74', fontWeight: 600, marginBottom: '0.2rem' }}>
                          <span>Capienza occupata</span>
                          <span>{percentUsed}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--neutral-700)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${percentUsed}%`,
                              height: '100%',
                              background: percentUsed >= 100 ? '#ef4444' : percentUsed >= 85 ? '#ea580c' : '#22c55e',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Toggle 1: Attiva Limite Biglietti */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'var(--neutral-850)',
                    border: '1px solid var(--neutral-750)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '0.85rem',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-heading)' }}>
                        Attiva Limite Biglietti
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.1rem' }}>
                        Raggiunto il tetto, la data diventa automaticamente Sold Out
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={limits.enabled}
                        onChange={e => updateDateLimit(dayKey, 'enabled', e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: limits.enabled ? '#ea580c' : 'var(--neutral-700)',
                        transition: '0.2s', borderRadius: '24px'
                      }}>
                        <span style={{
                          position: 'absolute', content: '""', height: '18px', width: '18px', left: limits.enabled ? '23px' : '3px', bottom: '3px',
                          backgroundColor: 'white', transition: '0.2s', borderRadius: '50%'
                        }} />
                      </span>
                    </label>
                  </div>

                  {/* Input Numero Massimo Biglietti */}
                  <div style={{ marginBottom: '0.85rem', opacity: limits.enabled ? 1 : 0.5, pointerEvents: limits.enabled ? 'auto' : 'none' }}>
                    <label style={labelStyle}>
                      Capienza Massima Biglietti (Ingressi ordinari)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        style={{ ...fieldStyle, fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}
                        value={limits.maxTickets}
                        onChange={e => updateDateLimit(dayKey, 'maxTickets', parseInt(e.target.value) || 0)}
                        placeholder="Es. 300"
                        disabled={!limits.enabled}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', whiteSpace: 'nowrap' }}>
                        biglietti max
                      </span>
                    </div>
                  </div>

                  {/* Toggle 2: Forza Sold Out Manuale */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: limits.manualSoldOut ? 'rgba(239,68,68,0.12)' : 'var(--neutral-850)',
                    border: `1px solid ${limits.manualSoldOut ? 'rgba(239,68,68,0.3)' : 'var(--neutral-750)'}`,
                    borderRadius: 'var(--radius-md)',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: limits.manualSoldOut ? '#ef4444' : 'var(--color-heading)' }}>
                        Forza Sold Out Manuale
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.1rem' }}>
                        Chiudi subito la vendita per questa data a prescindere dal limite
                      </div>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(limits.manualSoldOut)}
                        onChange={e => updateDateLimit(dayKey, 'manualSoldOut', e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: limits.manualSoldOut ? '#ef4444' : 'var(--neutral-700)',
                        transition: '0.2s', borderRadius: '24px'
                      }}>
                        <span style={{
                          position: 'absolute', content: '""', height: '18px', width: '18px', left: limits.manualSoldOut ? '23px' : '3px', bottom: '3px',
                          backgroundColor: 'white', transition: '0.2s', borderRadius: '50%'
                        }} />
                      </span>
                    </label>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* ── Info Cards ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={sectionHeaderStyle}>
            🃏 Card Informative
          </h2>
          <p style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Le card mostrate nella sezione principale (es. Attività, Giochi, Food). Ogni card ha un emoji, titolo, descrizione, colore di sfondo e lista di elementi.
          </p>
          
          {data.infoCards.map((card, cardIdx) => (
            <div key={cardIdx} style={miniCardStyle}>
              <button type="button" onClick={() => removeInfoCard(cardIdx)} style={deleteButtonStyle} title="Rimuovi card">
                <Trash2 size={16} />
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Emoji</label>
                  <input type="text" style={{ ...fieldStyle, textAlign: 'center', fontSize: '1.3rem' }} value={card.emoji} onChange={e => updateInfoCard(cardIdx, 'emoji', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Titolo</label>
                  <input type="text" style={fieldStyle} value={card.title} onChange={e => updateInfoCard(cardIdx, 'title', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Descrizione</label>
                  <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={2} value={card.description} onChange={e => updateInfoCard(cardIdx, 'description', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Colore</label>
                  <input type="color" value={card.color} onChange={e => updateInfoCard(cardIdx, 'color', e.target.value)} style={{ width: '100%', height: '58px', border: '1px solid var(--neutral-700)', borderRadius: 'var(--radius-md)', background: 'var(--neutral-800)', cursor: 'pointer' }} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Elementi Lista</label>
                {card.items.map((item, itemIdx) => (
                  <div key={itemIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <input type="text" style={{ ...fieldStyle, flex: 1 }} value={item} onChange={e => updateInfoCardItem(cardIdx, itemIdx, e.target.value)} />
                    <button type="button" onClick={() => removeInfoCardItem(cardIdx, itemIdx)} style={{ ...deleteButtonStyle, position: 'static' }} title="Rimuovi">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => addInfoCardItem(cardIdx)} style={{ ...addButtonStyle, border: 'none', justifyContent: 'flex-start', padding: '0.4rem 0', fontSize: '0.8rem', background: 'transparent' }}>
                  <Plus size={14} /> Aggiungi elemento
                </button>
              </div>
            </div>
          ))}

          <button type="button" onClick={addInfoCard} style={addButtonStyle}>
            <Plus size={18} /> Aggiungi Card
          </button>
        </div>

        {/* ── Ticket Types ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={sectionHeaderStyle}>
            🎟️ Tipi di Biglietto
          </h2>
          <p style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Configura i tipi di biglietto disponibili per l&apos;acquisto. I biglietti &quot;Extra&quot; richiedono almeno un biglietto base.
            Per l&apos;emoji, usa <code style={{ background: 'var(--neutral-800)', padding: '2px 6px', borderRadius: '4px' }}>pumpkin</code> per mostrare l&apos;icona zucca personalizzata.
          </p>

          {data.ticketTypes.map((ticket, idx) => (
            <div key={idx} style={miniCardStyle}>
              <button type="button" onClick={() => removeTicketType(idx)} style={deleteButtonStyle} title="Rimuovi">
                <Trash2 size={16} />
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Emoji</label>
                  <input type="text" style={{ ...fieldStyle, textAlign: 'center', fontSize: '1.2rem' }} value={ticket.emoji} onChange={e => updateTicketType(idx, 'emoji', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input type="text" style={fieldStyle} value={ticket.label} onChange={e => updateTicketType(idx, 'label', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Prezzo (€)</label>
                  <input type="number" style={fieldStyle} min={0} step={0.5} value={ticket.price} onChange={e => updateTicketType(idx, 'price', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'start' }}>
                <div>
                  <label style={labelStyle}>Descrizione</label>
                  <input type="text" style={fieldStyle} value={ticket.description} onChange={e => updateTicketType(idx, 'description', e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.6rem' }}>
                  <input type="checkbox" id={`extra_${idx}`} checked={ticket.isExtra} onChange={e => updateTicketType(idx, 'isExtra', e.target.checked)} style={{ accentColor: '#ea580c', width: 18, height: 18, cursor: 'pointer' }} />
                  <label htmlFor={`extra_${idx}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--neutral-300)', cursor: 'pointer' }}>Extra</label>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <label style={labelStyle}>ID (per il sistema, non modificare se in uso)</label>
                <input type="text" style={{ ...fieldStyle, fontFamily: 'monospace', fontSize: '0.85rem' }} value={ticket.id} onChange={e => updateTicketType(idx, 'id', e.target.value)} />
              </div>
            </div>
          ))}

          <button type="button" onClick={addTicketType} style={addButtonStyle}>
            <Plus size={18} /> Aggiungi Biglietto
          </button>
        </div>

        {/* ── Free Activities ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={sectionHeaderStyle}>
            🎨 Attività Gratuite
          </h2>
          <p style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Le attività gratuite incluse che i genitori possono selezionare durante il checkout.
          </p>

          {data.freeActivities.map((act, idx) => (
            <div key={idx} style={miniCardStyle}>
              <button type="button" onClick={() => removeFreeActivity(idx)} style={deleteButtonStyle} title="Rimuovi">
                <Trash2 size={16} />
              </button>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Nome Attività</label>
                  <input type="text" style={fieldStyle} value={act.label} onChange={e => updateFreeActivity(idx, 'label', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Dettagli (orario, a cura di, max posti...)</label>
                  <input type="text" style={fieldStyle} value={act.details} onChange={e => updateFreeActivity(idx, 'details', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>ID</label>
                  <input type="text" style={{ ...fieldStyle, fontFamily: 'monospace', fontSize: '0.85rem' }} value={act.id} onChange={e => updateFreeActivity(idx, 'id', e.target.value)} />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addFreeActivity} style={addButtonStyle}>
            <Plus size={18} /> Aggiungi Attività
          </button>
        </div>

        {/* ── Highlights ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={sectionHeaderStyle}>
            ✨ Card in Evidenza
          </h2>
          <p style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Le card in evidenza (es. Merchandising, Musica dal Vivo).
          </p>

          {data.highlights.map((hl, idx) => (
            <div key={idx} style={miniCardStyle}>
              <button type="button" onClick={() => removeHighlight(idx)} style={deleteButtonStyle} title="Rimuovi">
                <Trash2 size={16} />
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Titolo</label>
                  <input type="text" style={fieldStyle} value={hl.title} onChange={e => updateHighlight(idx, 'title', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Icona</label>
                  <select style={fieldStyle} value={hl.icon} onChange={e => updateHighlight(idx, 'icon', e.target.value)}>
                    {HIGHLIGHT_ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Descrizione</label>
                <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={2} value={hl.description} onChange={e => updateHighlight(idx, 'description', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Colore Sfondo</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={hl.bgColor} onChange={e => updateHighlight(idx, 'bgColor', e.target.value)} style={{ width: '40px', height: '40px', border: '1px solid var(--neutral-700)', cursor: 'pointer', borderRadius: '0.5rem', background: 'transparent' }} />
                    <input type="text" style={{ ...fieldStyle, flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }} value={hl.bgColor} onChange={e => updateHighlight(idx, 'bgColor', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Colore Testo</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="color" value={hl.textColor} onChange={e => updateHighlight(idx, 'textColor', e.target.value)} style={{ width: '40px', height: '40px', border: '1px solid var(--neutral-700)', cursor: 'pointer', borderRadius: '0.5rem', background: 'transparent' }} />
                    <input type="text" style={{ ...fieldStyle, flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }} value={hl.textColor} onChange={e => updateHighlight(idx, 'textColor', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addHighlight} style={addButtonStyle}>
            <Plus size={18} /> Aggiungi Card
          </button>
        </div>

        {/* ── Programma ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={sectionHeaderStyle}>
            Sezione Programma
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Titolo Sezione</label>
              <input type="text" style={fieldStyle} value={data.program.title} onChange={e => updateProgram('title', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Contenuto (Supporta markdown)</label>
              <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={6} value={data.program.content} onChange={e => updateProgram('content', e.target.value)} />
              <p style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', marginTop: '0.25rem' }}>Puoi usare **grassetto**, *corsivo*, e inserire andate a capo vuote per i paragrafi.</p>
            </div>
          </div>
        </div>

        {/* ── Tickets ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={sectionHeaderStyle}>
            Sezione Ticket
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Titolo Sezione</label>
              <input type="text" style={fieldStyle} value={data.tickets.title} onChange={e => updateTickets('title', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Disclaimer (Attenzione: ...)</label>
              <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={2} value={data.tickets.disclaimer} onChange={e => updateTickets('disclaimer', e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Domande Frequenti (FAQ) ── */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ ...sectionHeaderStyle, margin: 0, borderBottom: 'none', paddingBottom: 0 }}>
              Domande Frequenti (FAQ)
            </h2>
            <Link
              href="/admin/rimborsi"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                color: 'var(--blue-400)',
                background: 'rgba(27,75,170,0.15)',
                border: '1px solid rgba(27,75,170,0.3)',
                padding: '0.4rem 0.8rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              <RotateCcw size={14} /> Vai a Gestione Rimborsi →
            </Link>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', marginBottom: '1.25rem' }}>
            Queste domande e risposte appariranno nella sezione FAQ pubblica di Zuccaland. Le risposte supportano formattazione grassetto (<strong>**testo**</strong>), corsivo (<em>*testo*</em>) e link markdown (<strong>[testo](url)</strong>).
          </p>

          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.25rem' }}>
            {(data.faqs || []).map((faq, idx) => (
              <div key={idx} style={{ background: 'var(--neutral-900)', border: '1px solid var(--neutral-700)', borderRadius: '0.75rem', padding: '1.25rem', position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => removeFaq(idx)}
                  style={deleteButtonStyle}
                  title="Elimina FAQ"
                >
                  <Trash2 size={16} />
                </button>
                <div style={{ marginBottom: '0.75rem', paddingRight: '2rem' }}>
                  <label style={labelStyle}>Domanda #{idx + 1}</label>
                  <input
                    type="text"
                    style={fieldStyle}
                    value={faq.question}
                    onChange={e => updateFaq(idx, 'question', e.target.value)}
                    placeholder="Es. I bambini pagano l'ingresso?"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Risposta</label>
                  <textarea
                    rows={4}
                    style={{ ...fieldStyle, resize: 'vertical' }}
                    value={faq.answer}
                    onChange={e => updateFaq(idx, 'answer', e.target.value)}
                    placeholder="Testo della risposta..."
                  />
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addFaq} style={addButtonStyle}>
            <Plus size={18} /> Aggiungi FAQ
          </button>
        </div>

      </div>
    </div>
  );
}
