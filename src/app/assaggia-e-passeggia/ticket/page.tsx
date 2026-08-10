'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, CreditCard, Loader2 } from 'lucide-react';

// Hardcoded for now. In a real app, this might come from the database or event config.
const TICKET_TYPES = [
  { id: 'full', name: 'Ticket Intero', price: 17, desc: 'Include:\n- il percorso degustazione di piatti della tradizione\n- Vino (1 bicchiere) o Acqua (0,5 L)' },
  { id: 'fuorimenu', name: 'Fuori Menu', price: 5, desc: 'Include:\n- Ingresso\n- Zzippula\n- Vino (1 bicchiere) o Acqua (0,5L)' },
  { id: 'extra', name: 'Extra wine', price: 5, desc: 'Vino illimitato!' },
];

export default function TicketPage() {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [buyerInfo, setBuyerInfo] = useState({ name: '', surname: '', email: '', phone: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState<any>(null);
  const [discountError, setDiscountError] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('error') === 'payment_failed') {
        setError('Il pagamento è stato rifiutato dalla tua banca o annullato. Nessun importo ti è stato addebitato. Per favore riprova o usa una carta diversa.');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const updateCart = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || 0;
      let next = Math.max(0, current + delta);

      const totalEntryCount = (prev['full'] || 0) + (prev['fuorimenu'] || 0);

      // Enforce extra <= full + fuorimenu
      if (id === 'extra') {
        if (next > totalEntryCount) next = totalEntryCount;
      }

      const newCart = { ...prev, [id]: next };

      if (id === 'full' || id === 'fuorimenu') {
        const newTotalEntry = (newCart['full'] || 0) + (newCart['fuorimenu'] || 0);
        const extraCount = newCart['extra'] || 0;
        if (extraCount > newTotalEntry) {
          newCart['extra'] = newTotalEntry;
        }
      }

      return newCart;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const basePrice = TICKET_TYPES.reduce((acc, t) => acc + (t.price * (cart[t.id] || 0)), 0);
  
  let discountAmount = 0;
  if (discount) {
    let targetBasePrice = 0;
    
    if (discount.applies_to === 'FULL_TICKET') {
      const fullTicketObj = TICKET_TYPES.find(t => t.id === 'full');
      const qty = discount.max_tickets > 0 
        ? Math.min(cart['full'] || 0, discount.max_tickets) 
        : (cart['full'] || 0);
      targetBasePrice = fullTicketObj ? (fullTicketObj.price * qty) : 0;
    } else {
      // For 'ALL', we sum up prices for up to max_tickets items, sorting by highest price first
      let items: number[] = [];
      for (const [id, qty] of Object.entries(cart)) {
         const t = TICKET_TYPES.find(x => x.id === id);
         for(let i = 0; i < qty; i++) {
            items.push(t ? t.price : 0);
         }
      }
      items.sort((a,b) => b - a); // highest price first
      
      const limit = discount.max_tickets > 0 ? discount.max_tickets : items.length;
      targetBasePrice = items.slice(0, limit).reduce((a,b) => a + b, 0);
    }

    if (discount.type === 'FIXED') {
      discountAmount = Math.min(targetBasePrice, discount.value);
    } else if (discount.type === 'PERCENTAGE') {
      discountAmount = targetBasePrice * (discount.value / 100);
    }
  }
  const totalPrice = Math.max(0, basePrice - discountAmount);

  const handleApplyDiscount = async () => {
    if (!discountCode) return;
    setApplyingDiscount(true);
    setDiscountError('');
    try {
      const res = await fetch('/api/discounts/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDiscount(data);
    } catch (e: any) {
      setDiscountError(e.message);
      setDiscount(null);
    } finally {
      setApplyingDiscount(false);
    }
  };

  const processCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      // Create the order on the backend
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'assaggia-passeggia', // Should be a real event ID in prod
          buyerName: `${buyerInfo.name} ${buyerInfo.surname}`,
          buyerEmail: buyerInfo.email,
          buyerPhone: buyerInfo.phone,
          totalAmount: totalPrice,
          discountId: discount?.id,
          cart: Object.entries(cart).filter(([_, qty]) => qty > 0).map(([id, qty]) => ({
            type: TICKET_TYPES.find(t => t.id === id)?.name || id,
            price: TICKET_TYPES.find(t => t.id === id)?.price || 0,
            quantity: qty
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore durante la creazione dell\'ordine');

      // If order is free, it's already marked as PAID
      if (data.status === 'PAID') {
        window.location.href = `/assaggia-e-passeggia/success?order=${data.orderId}`;
      } else {
        // Next, redirect to Nexi XPAY integration API
        window.location.href = `/api/nexi/checkout?orderId=${data.orderId}`;
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (totalItems === 0) {
      setError('Seleziona almeno un biglietto.');
      return;
    }
    
    if (!acceptedTerms) {
      setError('Devi accettare le condizioni sulle intolleranze alimentari.');
      return;
    }

    const totalEntryCount = (cart['full'] || 0) + (cart['fuorimenu'] || 0);
    const extraCount = cart['extra'] || 0;

    if (totalEntryCount > extraCount && !showUpsellModal) {
      setShowUpsellModal(true);
      return;
    }
    
    await processCheckout();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '0.5rem', color: '#1a1a1a' }}>
        Acquista Biglietti
      </h1>
      <p style={{ color: '#666', marginBottom: '3rem', fontSize: '1.1rem' }}>
        Seleziona i biglietti che desideri acquistare per Assaggia & Passeggia 2026.
      </p>

      <form onSubmit={handleCheckout}>
        <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem 1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1a1a1a', borderBottom: '1px solid #eaeaea', paddingBottom: '1rem' }}>
            1. Seleziona Biglietti
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {TICKET_TYPES.map(ticket => (
              <div key={ticket.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', background: '#fafafa', borderRadius: '0.75rem', border: '1px solid #eaeaea' }}>
                <div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#1a1a1a', marginBottom: '0.25rem' }}>{ticket.name}</div>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.75rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{ticket.desc}</div>
                  <div style={{ fontSize: '1.35rem', color: '#283983', fontWeight: 600 }}>€{ticket.price.toFixed(2)}</div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '0.5rem', borderRadius: '999px', border: '1px solid #ddd', width: '100%', maxWidth: '220px' }}>
                  <button type="button" onClick={(e) => { e.preventDefault(); updateCart(ticket.id, -1); }} disabled={!cart[ticket.id]} style={{ width: 48, height: 48, borderRadius: '50%', background: '#f5f5f5', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: cart[ticket.id] ? 'pointer' : 'not-allowed', color: cart[ticket.id] ? '#333' : '#aaa', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                    <Minus size={24} style={{ pointerEvents: 'none' }} />
                  </button>
                  <span style={{ width: '40px', textAlign: 'center', fontWeight: 700, color: '#1a1a1a', fontSize: '1.25rem' }}>{cart[ticket.id] || 0}</span>
                  <button type="button" onClick={(e) => { e.preventDefault(); updateCart(ticket.id, 1); }} disabled={ticket.id === 'extra' && (cart['extra'] || 0) >= ((cart['full'] || 0) + (cart['fuorimenu'] || 0))} style={{ width: 48, height: 48, borderRadius: '50%', background: (ticket.id === 'extra' && (cart['extra'] || 0) >= ((cart['full'] || 0) + (cart['fuorimenu'] || 0))) ? '#f5f5f5' : '#1a1a1a', color: (ticket.id === 'extra' && (cart['extra'] || 0) >= ((cart['full'] || 0) + (cart['fuorimenu'] || 0))) ? '#aaa' : 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (ticket.id === 'extra' && (cart['extra'] || 0) >= ((cart['full'] || 0) + (cart['fuorimenu'] || 0))) ? 'not-allowed' : 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                    <Plus size={24} style={{ pointerEvents: 'none' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalItems > 0 && (
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem 1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#1a1a1a', borderBottom: '1px solid #eaeaea', paddingBottom: '1rem' }}>
              2. I tuoi dati
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem', fontWeight: 500 }}>Nome *</label>
                <input required type="text" value={buyerInfo.name} onChange={e => setBuyerInfo({...buyerInfo, name: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem', fontWeight: 500 }}>Cognome *</label>
                <input required type="text" value={buyerInfo.surname} onChange={e => setBuyerInfo({...buyerInfo, surname: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1rem' }} />
              </div>
            </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem', fontWeight: 500 }}>Email (per ricevere i biglietti) *</label>
                <input required type="email" value={buyerInfo.email} onChange={e => setBuyerInfo({...buyerInfo, email: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1rem', marginBottom: '1.5rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem', fontWeight: 500 }}>Telefono *</label>
                <input required type="tel" value={buyerInfo.phone} onChange={e => setBuyerInfo({...buyerInfo, phone: e.target.value})} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1rem', marginBottom: '1.5rem' }} />
              </div>

            <div style={{ background: '#fef9f0', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e8d9b8', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <input 
                type="checkbox" 
                id="terms" 
                required 
                checked={acceptedTerms}
                onChange={e => setAcceptedTerms(e.target.checked)}
                style={{ marginTop: '0.25rem', width: '1.1rem', height: '1.1rem', accentColor: '#283983', cursor: 'pointer' }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.5, cursor: 'pointer' }}>
                Confermo di aver visionato il menù in anticipo e di non avere intolleranze o allergie alimentari non gestibili. Sollevo l'associazione da ogni responsabilità.
              </label>
            </div>
            
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #eaeaea' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.5rem', fontWeight: 500 }}>Hai un codice promozionale?</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" placeholder="Es. PROLOCO26" value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1rem', textTransform: 'uppercase' }} />
                <button type="button" onClick={handleApplyDiscount} disabled={applyingDiscount || !discountCode} style={{ background: '#1a1a1a', color: 'white', border: 'none', padding: '0 1.5rem', borderRadius: '0.5rem', fontWeight: 600, cursor: (applyingDiscount || !discountCode) ? 'not-allowed' : 'pointer' }}>
                  {applyingDiscount ? '...' : 'Applica'}
                </button>
              </div>
              {discountError && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>{discountError}</div>}
              {discount && <div style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 500 }}>Codice {discount.code} applicato con successo!</div>}
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '1rem', background: '#fef2f2', color: '#ef4444', borderRadius: '0.5rem', marginBottom: '2rem', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {totalItems > 0 && (
          <div style={{ background: '#1a1a1a', borderRadius: '1rem', padding: '1.5rem', color: 'white', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.25rem' }}>Totale Contributo</div>
              {discount && (
                <div style={{ fontSize: '1rem', color: '#888', textDecoration: 'line-through', marginBottom: '0.25rem' }}>€{basePrice.toFixed(2)}</div>
              )}
              <div style={{ fontSize: '2.5rem', fontWeight: 600, fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                {totalPrice === 0 ? 'Gratis' : `€${totalPrice.toFixed(2)}`}
              </div>
            </div>
            <button type="submit" disabled={loading} style={{
              background: '#283983', color: 'white', padding: '1rem 1.5rem', borderRadius: '999px', flex: '1 1 250px',
              border: 'none', fontSize: '1.1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
              boxShadow: '0 4px 15px rgba(40,57,131,0.3)', opacity: loading ? 0.7 : 1
            }}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
              Procedi al pagamento
            </button>
          </div>
        )}
      </form>

      {showUpsellModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', maxWidth: '450px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: '#ef4444' }}>
              <Plus size={32} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1a1a1a', fontFamily: 'var(--font-display)' }}>
              Non dimenticare l'Extra Wine!
            </h3>
            <p style={{ color: '#555', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Hai acquistato {(cart['full'] || 0) + (cart['fuorimenu'] || 0)} ticket di ingresso, ma {((cart['full'] || 0) + (cart['fuorimenu'] || 0)) - (cart['extra'] || 0) === 1 ? 'manca 1' : `mancano ${((cart['full'] || 0) + (cart['fuorimenu'] || 0)) - (cart['extra'] || 0)}`} Extra Wine all'appello. <br /><br />
              Con soli <strong>5€</strong> potrai degustare <strong>vino illimitato</strong> durante tutto il percorso. Vuoi aggiungerlo ora?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={() => {
                const missing = ((cart['full'] || 0) + (cart['fuorimenu'] || 0)) - (cart['extra'] || 0);
                updateCart('extra', missing);
                setShowUpsellModal(false);
              }} style={{ background: '#283983', color: 'white', padding: '1rem', borderRadius: '0.5rem', border: 'none', fontWeight: 600, fontSize: '1.05rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Plus size={18} />
                Sì, aggiungi {(((cart['full'] || 0) + (cart['fuorimenu'] || 0)) - (cart['extra'] || 0)) === 1 ? 'l\'Extra Wine' : 'gli Extra Wine'}
              </button>
              <button onClick={() => {
                setShowUpsellModal(false);
                processCheckout();
              }} style={{ background: 'transparent', color: '#666', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #eaeaea', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
                No grazie, procedi senza
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
