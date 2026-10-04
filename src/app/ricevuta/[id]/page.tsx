import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCashierOrderById } from '@/lib/data/cashier';
import ReceiptClient from './ReceiptClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  const order = await getCashierOrderById(id);
  if (!order) return { title: 'Ricevuta non trovata - Pro Loco Gasperina APS' };

  return {
    title: `Ricevuta Contributo #${order.orderNumber} - Pro Loco Gasperina`,
    description: `Ricevuta contributo per ${order.eventName} - Ordine #${order.orderNumber}`,
  };
}

export default async function ReceiptPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const order = await getCashierOrderById(id);

  if (!order) {
    notFound();
  }

  return <ReceiptClient order={order} />;
}
