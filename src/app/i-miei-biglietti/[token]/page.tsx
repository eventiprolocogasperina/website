import { CalendarPlus, Download } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderTickets, orderStatusLabel } from '@/components/public/OrderTickets';
import { formatDateTime } from '@/lib/dates';
import { getOrderByToken, maskEmail } from '@/server/domain/checkout/my-tickets';
import { ChangeDate, RefundRequest } from './MyTicketsActions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'I miei biglietti', robots: { index: false, follow: false }, referrer: 'no-referrer' };

const btn = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface px-4 text-body font-semibold text-fg hover:bg-surface-sunken';

/** "I miei biglietti" (§13.2): chi ha il link vede l'ordine, scarica i PDF, cambia data o chiede il rimborso se previsto. */
export default async function MyTicketsPage({ params }: { params: Promise<{ token: string }> }) {
  const order = await getOrderByToken((await params).token);
  if (!order) notFound();
  const paid = order.status === 'paid' || order.status === 'partially_refunded';
  return (
    <main className="ui-root min-h-screen bg-bg px-4 pb-16 pt-28 text-fg">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <header>
          <p className="text-label text-muted">I miei biglietti</p>
          <h1 className="mt-1 text-2xl font-semibold">{order.edition.title}</h1>
          <p className="mt-1 text-body text-muted">
            {[order.session ? order.session.label : order.edition.startsAt ? formatDateTime(order.edition.startsAt) : null, order.edition.location, orderStatusLabel(order.status)]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {order.customer && (
            <p className="text-label text-muted">
              {order.customer.name ?? ''} {maskEmail(order.customer.email)}
            </p>
          )}
        </header>

        {order.session?.status === 'postponed' && (
          <p role="status" className="rounded-lg bg-warning-bg p-4 text-body text-fg">
            Questa data è stata rinviata{order.session.rescheduledTo ? ` a ${order.session.rescheduledTo}` : ''}. I biglietti restano validi.
          </p>
        )}

        <OrderTickets order={order} />

        {paid && (
          <div className="flex flex-wrap gap-2">
            <a href={`/i-miei-biglietti/${order.accessToken}/biglietti.pdf`} className={btn}>
              <Download size={18} aria-hidden /> Scarica il PDF
            </a>
            <a href={`/i-miei-biglietti/${order.accessToken}/calendario.ics`} className={btn}>
              <CalendarPlus size={18} aria-hidden /> Aggiungi al calendario
            </a>
          </div>
        )}

        {order.dateChange && (
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-3 text-section font-semibold">Cambia data</h2>
            <ChangeDate token={order.accessToken} options={order.dateChange} />
          </section>
        )}

        {order.refund.pending ? (
          <p role="status" className="rounded-lg bg-info-bg p-4 text-body text-fg">
            Abbiamo ricevuto la tua richiesta di rimborso: la stiamo gestendo.
          </p>
        ) : (
          order.refund.eligible && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="mb-1 text-section font-semibold">Rimborso</h2>
              <p className="mb-3 text-label text-muted">{order.refund.reason}</p>
              <RefundRequest token={order.accessToken} code={order.code} amountCents={order.refund.refundableCents} />
            </section>
          )
        )}
        <p className="text-label text-muted">Questo link è personale: non condividerlo. Per qualsiasi problema scrivici indicando il codice {order.code}.</p>
      </div>
    </main>
  );
}
