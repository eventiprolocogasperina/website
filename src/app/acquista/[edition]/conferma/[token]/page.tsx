import { CalendarPlus, CheckCircle2, Clock, Download, RotateCcw, Ticket, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderTickets } from '@/components/public/OrderTickets';
import { getOrderByToken, maskEmail } from '@/server/domain/checkout/my-tickets';
import { ClearCart, WaitForPayment } from './WaitForPayment';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Il tuo ordine', robots: { index: false, follow: false }, referrer: 'no-referrer' };

type Props = { params: Promise<{ edition: string; token: string }>; searchParams: Promise<{ esito?: string }> };

const link = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-body font-semibold';
const primary = `${link} bg-primary text-primary-fg hover:bg-primary-hover`;
const secondary = `${link} border border-border-strong bg-surface text-fg hover:bg-surface-sunken`;

/** Conferma dopo il pagamento (o dopo un annullo): stato, codice, QR, calendario, "I miei biglietti". */
export default async function ConfirmPage({ params, searchParams }: Props) {
  const [{ edition, token }, { esito }] = await Promise.all([params, searchParams]);
  const order = await getOrderByToken(token);
  if (!order || order.edition.slug !== edition) notFound();
  const paid = order.status === 'paid' || order.status === 'partially_refunded';
  const pendingValid = order.payable;
  const failed = esito === 'annullato' || esito === 'rifiutato' || esito === 'errore';

  return (
    <main className="ui-root min-h-screen bg-bg px-4 pb-16 pt-28 text-fg">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        {paid && (
          <div role="status" className="flex gap-3 rounded-lg bg-success-bg p-4">
            <ClearCart slug={order.edition.slug} />
            <CheckCircle2 className="mt-0.5 shrink-0 text-success" aria-hidden />
            <div>
              <h1 className="text-title font-semibold text-fg">Ordine confermato</h1>
              <p className="text-body text-fg">
                Codice <strong data-testid="codice-ordine">{order.code}</strong>.{' '}
                {order.customer ? `Ti abbiamo mandato i biglietti a ${maskEmail(order.customer.email)}.` : ''}
              </p>
            </div>
          </div>
        )}
        {order.status === 'pending' && pendingValid && (
          <div role="status" className={`flex gap-3 rounded-lg p-4 ${failed ? 'bg-danger-bg' : 'bg-warning-bg'}`}>
            {failed ? <XCircle className="mt-0.5 shrink-0 text-danger" aria-hidden /> : <Clock className="mt-0.5 shrink-0 text-warning" aria-hidden />}
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-title font-semibold text-fg">{esito === 'annullato' ? 'Pagamento annullato' : failed ? 'Il pagamento non è andato a buon fine' : 'Stiamo aspettando la conferma del pagamento'}</h1>
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
          <div role="status" className="flex gap-3 rounded-lg bg-danger-bg p-4">
            <XCircle className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <div className="flex flex-col gap-3">
              <div>
                <h1 className="text-title font-semibold text-fg">{order.status === 'cancelled' ? 'Ordine annullato' : 'Il tempo per pagare è scaduto'}</h1>
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
    </main>
  );
}
