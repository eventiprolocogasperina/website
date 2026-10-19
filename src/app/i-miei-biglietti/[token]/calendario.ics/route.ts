import { icsEvent } from '@/lib/ics';
import { getOrderByToken } from '@/server/domain/checkout/my-tickets';
import { siteUrl } from '@/server/email/send';

export const dynamic = 'force-dynamic';

/** "Aggiungi al calendario": la data dell'ordine (o dell'edizione). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const order = await getOrderByToken((await params).token);
  const start = order?.session?.startsAt ?? order?.edition.startsAt;
  if (!order || !start) return new Response('Data non disponibile.', { status: 404 });
  const ics = icsEvent({
    uid: `${order.code}@prolocogasperina.it`,
    title: order.session ? `${order.edition.title} · ${order.session.label}` : order.edition.title,
    start,
    end: order.session ? order.session.endsAt : order.edition.endsAt,
    location: order.edition.location,
    description: `Ordine ${order.code}. I biglietti: ${siteUrl()}/i-miei-biglietti/${order.accessToken}`,
  });
  return new Response(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${order.edition.slug}.ics"`, 'Cache-Control': 'private, no-store' },
  });
}
