import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getOrder, parseOrderNotes } from '@/lib/data/tickets';
import PayLinkClient from './PayLinkClient';

export const metadata: Metadata = {
  title: 'Pagamento Sicuro | Pro Loco Gasperina',
  description: 'Completa il pagamento sicuro tramite Nexi per la tua prenotazione.',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PayLinkPage({ params }: PageProps) {
  const { id } = await params;
  
  if (!id) {
    notFound();
  }

  // Cerca il sub-order
  const subOrder = await getOrder(id);
  if (!subOrder) {
    notFound();
  }

  // Estrai parentOrderId
  const match = subOrder.notes?.match(/\[INTEGRAZIONE_PARENT:([^\]]+)\]/);
  const parentOrderId = match ? match[1] : null;
  const parentOrder = parentOrderId ? await getOrder(parentOrderId) : null;

  const isZuccaland = subOrder.tickets.some(t => t.eventId?.includes('zuccaland')) || 
                      parentOrder?.tickets.some(t => t.eventId?.includes('zuccaland')) || false;
  
  const parsedParentNotes = parentOrder ? parseOrderNotes(parentOrder.notes) : null;
  
  // Giorno evento
  let dayLabel = parsedParentNotes?.eventDate || null;
  if (!dayLabel && isZuccaland) {
    dayLabel = '10-11 Ottobre 2026';
  }

  // Raggruppa i ticket per tipologia
  const ticketTypesCount = subOrder.tickets.reduce((acc, t) => {
    acc[t.type] = {
      count: (acc[t.type]?.count || 0) + 1,
      price: t.price
    };
    return acc;
  }, {} as Record<string, { count: number; price: number }>);

  const items = Object.entries(ticketTypesCount).map(([type, info]) => ({
    type,
    price: info.price,
    count: info.count,
    total: info.price * info.count
  }));

  // Estrai laboratori gratuiti dalle note del subOrder
  const freeLabsMatch = subOrder.notes?.match(/Laboratori gratuiti bimbi:\s*([^|]+)/i);
  const freeLabs = freeLabsMatch 
    ? freeLabsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <PayLinkClient
      orderId={subOrder.id}
      parentOrderId={parentOrderId}
      buyerName={subOrder.buyerName}
      buyerEmail={subOrder.buyerEmail}
      totalAmount={subOrder.totalAmount}
      status={subOrder.status}
      isZuccaland={isZuccaland}
      dayLabel={dayLabel}
      items={items}
      freeLabs={freeLabs}
      notes={subOrder.notes || ''}
    />
  );
}
