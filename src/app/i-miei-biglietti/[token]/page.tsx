import { ArrowRight, CalendarDays, CalendarPlus, Download, Info, Undo2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { card } from '@/components/public/checkout/parts';
import { EventPageShell } from '@/components/public/EventPageShell';
import { Reveal } from '@/components/public/motion';
import { pillSecondary, VisitBanner } from '@/components/public/OrderInfo';
import { OrderTickets } from '@/components/public/OrderTickets';
import { getOrderByToken, maskEmail } from '@/server/domain/checkout/my-tickets';
import { ChangeDate, RefundRequest } from './MyTicketsActions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'I miei biglietti', robots: { index: false, follow: false }, referrer: 'no-referrer' };

function Panel({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className={`${card} p-5`}>
      <div className="mb-4 flex items-start gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ev-soft)] text-primary">
          {icon}
        </span>
        <div>
          <h2 className="font-ev-display text-pub-xl font-bold text-[var(--ev-ink)]">{title}</h2>
          {hint && <p className="text-pub-sm text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** "I miei biglietti" (§13.2): chi ha il link vede l'ordine, scarica i PDF, cambia data o chiede il rimborso se previsto. */
export default async function MyTicketsPage({ params }: { params: Promise<{ token: string }> }) {
  const order = await getOrderByToken((await params).token);
  if (!order) notFound();
  const paid = order.status === 'paid' || order.status === 'partially_refunded';
  return (
    <EventPageShell edition={order.edition} eyebrow="I miei biglietti">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <Reveal className="flex flex-col gap-5">
          {order.customer && (
            <p className="text-center text-pub-base text-fg">
              Biglietti di <strong>{order.customer.name ?? maskEmail(order.customer.email)}</strong>
              {order.customer.name ? <span className="text-muted"> · {maskEmail(order.customer.email)}</span> : null}
            </p>
          )}
          <VisitBanner order={order} />
        </Reveal>

        {order.session?.status === 'postponed' && (
          <p role="status" className="flex items-start gap-2 rounded-[1.25rem] border-2 border-warning/30 bg-warning-bg p-4 text-pub-base text-fg">
            <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-warning" />
            <span>
              Questa data è stata rinviata{order.session.rescheduledTo ? ` a ${order.session.rescheduledTo}` : ''}. I biglietti restano validi.
            </span>
          </p>
        )}

        <OrderTickets order={order} />

        {paid && (
          <div className="flex flex-wrap justify-center gap-2">
            <a href={`/i-miei-biglietti/${order.accessToken}/biglietti.pdf`} className={pillSecondary}>
              <Download size={18} aria-hidden /> Scarica il PDF
            </a>
            <a href={`/i-miei-biglietti/${order.accessToken}/calendario.ics`} className={pillSecondary}>
              <CalendarPlus size={18} aria-hidden /> Aggiungi al calendario
            </a>
          </div>
        )}

        {order.dateChange && (
          <Panel icon={<CalendarDays size={18} />} title="Cambia data" hint="Puoi spostare i biglietti su un’altra data con posti liberi.">
            <ChangeDate token={order.accessToken} options={order.dateChange} />
          </Panel>
        )}

        {order.refund.pending ? (
          <p role="status" className="flex items-start gap-2 rounded-[1.25rem] bg-info-bg p-4 text-pub-base text-fg">
            <Undo2 size={18} aria-hidden className="mt-0.5 shrink-0 text-info" /> Abbiamo ricevuto la tua richiesta di rimborso: la stiamo gestendo.
          </p>
        ) : (
          order.refund.eligible && (
            <Panel icon={<Undo2 size={18} />} title="Rimborso" hint={order.refund.reason}>
              <RefundRequest token={order.accessToken} code={order.code} amountCents={order.refund.refundableCents} />
            </Panel>
          )
        )}
        <p className="text-center text-pub-sm text-muted">Questo link è personale: non condividerlo. Per qualsiasi problema scrivici indicando il codice {order.code}.</p>
        {order.edition.format && (
          <p className="text-center">
            <Link href={order.edition.format.path} className="inline-flex min-h-11 items-center gap-1.5 text-pub-base font-bold text-primary underline-offset-4 hover:underline">
              Torna a {order.edition.format.name} <ArrowRight size={18} aria-hidden />
            </Link>
          </p>
        )}
      </div>
    </EventPageShell>
  );
}
