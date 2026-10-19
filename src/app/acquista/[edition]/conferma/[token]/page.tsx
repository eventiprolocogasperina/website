import { CalendarPlus, Clock, Download, RotateCcw, Ticket, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eventCard } from '@/components/public/event-card';
import { EventPageShell } from '@/components/public/EventPageShell';
import { OrderTickets } from '@/components/public/OrderTickets';
import { getOrderByToken, maskEmail } from '@/server/domain/checkout/my-tickets';
import { ClearCart, WaitForPayment } from './WaitForPayment';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Il tuo ordine', robots: { index: false, follow: false }, referrer: 'no-referrer' };

type Props = { params: Promise<{ edition: string; token: string }>; searchParams: Promise<{ esito?: string }> };

const link = 'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-body font-semibold shadow-sm';
const primary = `${link} bg-primary text-primary-fg hover:bg-primary-hover`;
const secondary = `${link} border border-[var(--ev-border)] bg-white text-[var(--ev-ink)] hover:bg-[var(--ev-softer)]`;

/** Conferma dopo il pagamento (o dopo un annullo): stato, codice, QR, calendario, "I miei biglietti". */
export default async function ConfirmPage({ params, searchParams }: Props) {
  const [{ edition, token }, { esito }] = await Promise.all([params, searchParams]);
  const order = await getOrderByToken(token);
  if (!order || order.edition.slug !== edition) notFound();
  const paid = order.status === 'paid' || order.status === 'partially_refunded';
  const pendingValid = order.payable;
  const failed = esito === 'annullato' || esito === 'rifiutato' || esito === 'errore';

  return (
    <EventPageShell edition={order.edition} eyebrow={paid ? 'Ci vediamo lì!' : 'Il tuo ordine'}>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        {paid && (
          <div role="status" className={`${eventCard} flex gap-4 p-5`}>
            <ClearCart slug={order.edition.slug} />
            <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-success-bg text-[1.5rem]">
              🎉
            </span>
            <div>
              <h2 className="text-title font-bold text-[var(--ev-ink)]">Ordine confermato</h2>
              <p className="text-body text-fg">
                Codice <strong data-testid="codice-ordine">{order.code}</strong>.{' '}
                {order.customer ? `Ti abbiamo mandato i biglietti a ${maskEmail(order.customer.email)}.` : ''}
              </p>
            </div>
          </div>
        )}
        {order.status === 'pending' && pendingValid && (
          <div role="status" className={`flex gap-3 rounded-2xl border p-5 ${failed ? 'border-danger/30 bg-danger-bg' : 'border-warning/30 bg-warning-bg'}`}>
            {failed ? <XCircle className="mt-0.5 shrink-0 text-danger" aria-hidden /> : <Clock className="mt-0.5 shrink-0 text-warning" aria-hidden />}
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-title font-bold text-[var(--ev-ink)]">{esito === 'annullato' ? 'Pagamento annullato' : failed ? 'Il pagamento non è andato a buon fine' : 'Stiamo aspettando la conferma del pagamento'}</h2>
                <p className="text-body text-fg">
                  {failed
                    ? 'Non ti è stato addebitato nulla. I posti sono ancora tenuti per te: riprova o usa un’altra carta.'
                    : esito === 'verifica'
                      ? 'C’è un problema con l’importo pagato: lo staff è stato avvisato e ti contatterà. Non ripetere il pagamento.'
                      : 'Di solito bastano pochi secondi. Questa pagina si aggiorna da sola.'}
                </p>
              </div>
              {failed && (
                <div>
                  <a href={`/acquista/paga/${order.accessToken}`} className={primary}>
                    <RotateCcw size={18} aria-hidden /> Riprova il pagamento
                  </a>
                </div>
              )}
              {!failed && esito !== 'verifica' && <WaitForPayment />}
            </div>
          </div>
        )}
        {(order.status === 'expired' || order.status === 'cancelled' || (order.status === 'pending' && !pendingValid)) && (
          <div role="status" className="flex gap-3 rounded-2xl border border-danger/30 bg-danger-bg p-5">
            <XCircle className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-title font-bold text-[var(--ev-ink)]">{order.status === 'cancelled' ? 'Ordine annullato' : 'Il tempo per pagare è scaduto'}</h2>
                <p className="text-body text-fg">I posti sono stati liberati. Se vuoi ancora i biglietti, ricomincia l’acquisto.</p>
              </div>
              <div>
                <a href={`/acquista/${order.edition.slug}`} className={primary}>
                  <Ticket size={18} aria-hidden /> Ricomincia l’acquisto
                </a>
              </div>
            </div>
          </div>
        )}

        <OrderTickets order={order} />

        {paid && (
          <div className="flex flex-wrap gap-2">
            <a href={`/i-miei-biglietti/${order.accessToken}`} className={primary}>
              <Ticket size={18} aria-hidden /> I miei biglietti
            </a>
            <a href={`/i-miei-biglietti/${order.accessToken}/biglietti.pdf`} className={secondary}>
              <Download size={18} aria-hidden /> Scarica il PDF
            </a>
            <a href={`/i-miei-biglietti/${order.accessToken}/calendario.ics`} className={secondary}>
              <CalendarPlus size={18} aria-hidden /> Aggiungi al calendario
            </a>
          </div>
        )}
      </div>
    </EventPageShell>
  );
}
