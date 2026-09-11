import type { Metadata } from 'next';
import { getOrder } from '@/lib/data/tickets';
import Link from 'next/link';
import ZuccalandSuccessClient from './ZuccalandSuccessClient';

export const metadata: Metadata = {
  title: 'Pagamento Completato - Zuccaland 2026',
};

export default async function ZuccalandSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  const errorState = (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0a05, #2a0f00, #0f0a05)',
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
        <Link href="/zuccaland" style={{
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          color: 'white', padding: '0.875rem 2rem',
          borderRadius: '999px', textDecoration: 'none', fontWeight: 600,
        }}>
          Torna a Zuccaland
        </Link>
      </div>
    </div>
  );

  if (!orderId) return errorState;

  const order = await getOrder(orderId);
  if (!order) return errorState;

  const orderRef = order.id.replace(/-/g, '').substring(0, 8).toUpperCase();

  return (
    <ZuccalandSuccessClient
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
