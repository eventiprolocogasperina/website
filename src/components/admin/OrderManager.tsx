'use client';

import { useState, useEffect } from 'react';
import { 
  Search, Download, CheckCircle2, XCircle, 
  Clock, Phone, Mail, FileText, Loader2, Plus, MailOpen, Trash2, Edit
} from 'lucide-react';
import type { OrderWithTickets } from '@/lib/data/tickets';

export default function OrderManager() {
  const [orders, setOrders] = useState<OrderWithTickets[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
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

  const [editingOrder, setEditingOrder] = useState<OrderWithTickets | null>(null);
  const [editForm, setEditForm] = useState({ buyerName: '', buyerEmail: '', buyerPhone: '', notes: '' });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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
      if (!confirm('Sei sicuro di voler eliminare questo ordine?')) {
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

  const exportCSV = () => {
    const headers = ['ID', 'Nome', 'Email', 'Telefono', 'Totale', 'Stato', 'Data'];
    const rows = filteredOrders.map(o => [
      o.id, o.buyerName, o.buyerEmail, o.buyerPhone || '', o.totalAmount.toFixed(2), o.status, new Date(o.createdAt).toLocaleString()
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ordini_assaggia_passeggia_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const paidOrders = filteredOrders.filter(o => o.status === 'PAID');
  const totalTickets = paidOrders.reduce((acc, o) => acc + o.tickets.length, 0);
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.totalAmount, 0);
  const freeOrdersCount = paidOrders.filter(o => o.totalAmount === 0).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* STATS HEADER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Biglietti Venduti</div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--white)', lineHeight: 1 }}>{totalTickets}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Incasso Totale</div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--gold-500)', lineHeight: 1 }}>€{totalRevenue.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Ordini Omaggio</div>
          <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--blue-400)', lineHeight: 1 }}>{freeOrdersCount}</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
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
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => setShowManualOrderModal(true)}>
            <Plus size={16} /> Ordine Manuale
          </button>
          <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={exportCSV}>
            <Download size={16} /> Esporta CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--blue-500)' }} />
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID Ordine</th>
                <th>Acquirente</th>
                <th>Biglietti</th>
                <th>Totale</th>
                <th>Stato</th>
                <th>Data</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-500)' }}>
                    Nessun ordine trovato.
                  </td>
                </tr>
              ) : filteredOrders.map(o => (
                <tr key={o.id}>
                  <td>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--neutral-400)' }}>
                      {o.id.substring(0,8).toUpperCase()}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--white)', fontWeight: 500 }}>{o.buyerName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Mail size={12} /> {o.buyerEmail}
                      </span>
                      {o.buyerPhone && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Phone size={12} /> {o.buyerPhone}
                        </span>
                      )}
                      {o.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--blue-400)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                          <FileText size={12} /> {o.notes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      {o.tickets.length} biglietti
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
                  <td>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {o.status === 'PENDING' && (
                        <button 
                          onClick={() => handleMarkPaid(o.id)}
                          style={{ color: 'var(--blue-400)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                          title="Segna come pagato (invia email)"
                        >
                          <CheckCircle2 size={16} /> Conferma Pagamento
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Order Modal */}
      {showManualOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Crea Ordine Manuale (Gratuito)</h3>
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

      {/* Edit Order Modal */}
      {editingOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'white', margin: 0 }}>Modifica Ordine {editingOrder.id.substring(0,8).toUpperCase()}</h2>
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
                className="btn" 
                onClick={handleSaveEdit}
                style={{ width: '100%', marginTop: '1rem' }}
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
