import { getOrderByToken } from '@/server/domain/checkout/my-tickets';
import { renderOrderPdf } from '@/server/email/order-tickets';

export const dynamic = 'force-dynamic';

/** PDF dei biglietti, solo per ordini pagati e solo con il token dell'ordine. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const order = await getOrderByToken((await params).token);
  if (!order || !['paid', 'partially_refunded'].includes(order.status)) return new Response('Biglietti non disponibili.', { status: 404 });
  const pdf = await renderOrderPdf(order);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="biglietti-${order.code}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
