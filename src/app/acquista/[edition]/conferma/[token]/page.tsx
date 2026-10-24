import { ArrowRight, CalendarPlus, CheckCircle2, Clock, Download, Mail, RotateCcw, Ticket, XCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { card } from '@/components/public/checkout/parts';
import { EventPageShell } from '@/components/public/EventPageShell';
import { PopIn, Reveal } from '@/components/public/motion';
import { pillPrimary, pillSecondary, VisitBanner } from '@/components/public/OrderInfo';
import { OrderTickets } from '@/components/public/OrderTickets';
import { getOrderByToken, maskEmail } from '@/server/domain/checkout/my-tickets';
import { ClearCart, WaitForPayment } from './WaitForPayment';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Il tuo ordine', robots: { index: false, follow: false }, referrer: 'no-referrer' };

type Props = { params: Promise<{ edition: string; token: string }>; searchParams: Promise<{ esito?: string }> };

/**
 * Conferma dopo il pagamento (o dopo un annullo), come il successo di produzione: logo del format, check
 * animato, giorno e orario d'apertura, come arrivare, QR, PDF, calendario e rimando alla pagina dell'evento.
 */
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
          <div role="status" className="flex flex-col items-center text-center">
            <ClearCart slug={order.edition.slug} />
            <PopIn delay={0.15}>
              <span aria-hidden className="flex size-[72px] items-center justify-center rounded-full bg-success text-white shadow-[0_0_0_10px_var(--ui-success-bg)]">
                <CheckCircle2 size={40} strokeWidth={2.5} />
              </span>
            </PopIn>
            <Reveal delay={0.3}>
              <h2 className="mt-5 font-ev-display text-pub-3xl font-bold text-[var(--ev-ink)]">Ordine confermato</h2>
              <p className="mt-2 text-pub-base text-fg">
                Codice <strong data-testid="codice-ordine">{order.code}</strong>. Grazie: il tuo contributo sostiene i volontari della Pro Loco.
              </p>
            </Reveal>
          </div>
        )}
        {order.status === 'pending' && pendingValid && (
          <div role="status" className={`flex gap-3 rounded-[1.25rem] border-2 p-5 ${failed ? 'border-danger/30 bg-danger-bg' : 'border-warning/30 bg-warning-bg'}`}>
            {failed ? <XCircle className="mt-0.5 shrink-0 text-danger" aria-hidden /> : <Clock className="mt-0.5 shrink-0 text-warning" aria-hidden />}
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="font-ev-display text-pub-xl font-bold text-[var(--ev-ink)]">
                  {esito === 'annullato' ? 'Pagamento annullato' : failed ? 'Il pagamento non è andato a buon fine' : 'Stiamo aspettando la conferma del pagamento'}
                </h2>
                <p className="text-pub-base text-fg">
                  {failed
                    ? 'Non ti è stato addebitato nulla. I posti sono ancora tenuti per te: riprova o usa un’altra carta.'
                    : esito === 'verifica'
                      ? 'C’è un problema con l’importo pagato: lo staff è stato avvisato e ti contatterà. Non ripetere il pagamento.'
                      : 'Di solito bastano pochi secondi. Questa pagina si aggiorna da sola.'}
                </p>
              </div>
              {failed && (
                <div>
                  <a href={`/acquista/paga/${order.accessToken}`} className={pillPrimary}>
                    <RotateCcw size={18} aria-hidden /> Riprova il pagamento
                  </a>
                </div>
              )}
              {!failed && esito !== 'verifica' && <WaitForPayment />}
            </div>
          </div>
        )}
        {(order.status === 'expired' || order.status === 'cancelled' || (order.status === 'pending' && !pendingValid)) && (
          <div role="status" className="flex gap-3 rounded-[1.25rem] border-2 border-danger/30 bg-danger-bg p-5">
            <XCircle className="mt-0.5 shrink-0 text-danger" aria-hidden />
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="font-ev-display text-pub-xl font-bold text-[var(--ev-ink)]">{order.status === 'cancelled' ? 'Ordine annullato' : 'Il tempo per pagare è scaduto'}</h2>
                <p className="text-pub-base text-fg">I posti sono stati liberati. Se vuoi ancora i biglietti, ricomincia l’acquisto.</p>
              </div>
              <div>
                <a href={`/acquista/${order.edition.slug}`} className={pillPrimary}>
                  <Ticket size={18} aria-hidden /> Ricomincia l’acquisto
                </a>
              </div>
            </div>
          </div>
        )}

        {paid && (
          <Reveal delay={0.4} className="flex flex-col gap-5">
            <VisitBanner order={order} />
            {order.customer && (
              <p className={`${card} flex items-start gap-3 p-4 text-pub-sm text-fg`}>
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ev-soft)] text-primary">
                  <Mail size={18} />
                </span>
                <span>
                  Ti abbiamo mandato i biglietti a <strong>{maskEmail(order.customer.email)}</strong>. Se non li trovi, controlla anche nella cartella spam o promozioni.
                </span>
              </p>
            )}
          </Reveal>
        )}

        <OrderTickets order={order} />

        {paid && (
          <div className="flex flex-wrap justify-center gap-2">
            <a href={`/i-miei-biglietti/${order.accessToken}`} className={pillPrimary}>
              <Ticket size={18} aria-hidden /> I miei biglietti
            </a>
            <a href={`/i-miei-biglietti/${order.accessToken}/biglietti.pdf`} className={pillSecondary}>
              <Download size={18} aria-hidden /> Scarica il PDF
            </a>
            <a href={`/i-miei-biglietti/${order.accessToken}/calendario.ics`} className={pillSecondary}>
              <CalendarPlus size={18} aria-hidden /> Aggiungi al calendario
            </a>
          </div>
        )}
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
