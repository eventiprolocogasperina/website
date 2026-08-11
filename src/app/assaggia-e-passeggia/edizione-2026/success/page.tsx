import type { Metadata } from 'next';
import { getOrder } from '@/lib/data/tickets';
import Link from 'next/link';
import SuccessClient from './SuccessClient';

export const metadata: Metadata = {
  title: 'Pagamento Completato - Assaggia & Passeggia',
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  if (!orderId) {
    return (
      <div style={{
        minHeight: '100vh', background: '#1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', textAlign: 'center',
      }}>
        <div>
          <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '1rem' }}>
            Ordine non trovato
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
            Impossibile trovare le informazioni per questo ordine.
          </p>
          <Link href="/assaggia-e-passeggia" style={{
            background: '#283983', color: 'white', padding: '0.875rem 2rem',
            borderRadius: '999px', textDecoration: 'none', fontWeight: 600,
          }}>
            Torna alla Home
          </Link>
        </div>
      </div>
    );
  }

  const order = await getOrder(orderId);

  if (!order) {
    return (
      <div style={{
        minHeight: '100vh', background: '#1a1a1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', textAlign: 'center',
      }}>
        <div>
          <h1 style={{ color: 'white', fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '1rem' }}>
            Ordine non trovato
          </h1>
          <Link href="/assaggia-e-passeggia" style={{
            background: '#283983', color: 'white', padding: '0.875rem 2rem',
            borderRadius: '999px', textDecoration: 'none', fontWeight: 600,
          }}>
            Torna alla Home
          </Link>
        </div>
      </div>
    );
  }

  const orderRef = order.id.replace(/-/g, '').substring(0, 8).toUpperCase();

  return (
    <SuccessClient
      orderId={order.id}
      orderRef={orderRef}
      buyerName={order.buyerName}
      buyerEmail={order.buyerEmail}
      totalAmount={order.totalAmount}
      tickets={order.tickets.map(t => ({
        id: t.id,
        type: t.type,
        price: t.price,
      }))}
    />
  );
}
