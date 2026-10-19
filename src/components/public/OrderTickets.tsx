import QRCode from 'qrcode';
import { eventCard } from '@/components/public/event-card';
import { formatMoney } from '@/lib/money';
import type { MyOrder } from '@/server/domain/checkout/my-tickets';

const STATUS_LABEL: Record<string, string> = {
  pending: 'In attesa di pagamento',
  paid: 'Pagato',
  partially_refunded: 'Rimborsato in parte',
  refunded: 'Rimborsato',
  cancelled: 'Annullato',
  expired: 'Scaduto',
};

export const orderStatusLabel = (s: string) => STATUS_LABEL[s] ?? s;

/** Righe dell'ordine e biglietti con il loro QR (generato sul server). */
export async function OrderTickets({ order }: { order: MyOrder }) {
  const valid = order.tickets.filter((t) => t.status !== 'void');
  const showQr = order.status === 'paid' || order.status === 'partially_refunded';
  const qrs = showQr ? await Promise.all(valid.map((t) => QRCode.toDataURL(t.qrToken, { errorCorrectionLevel: 'M', margin: 1, width: 360 }))) : [];
  return (
    <div className="flex flex-col gap-4">
      <section className={`${eventCard} overflow-hidden`}>
        <h2 className="flex items-center justify-between gap-3 bg-[var(--ev-soft)] px-4 py-3 text-section font-bold text-[var(--ev-ink)] sm:px-5">
          <span>Ordine {order.code}</span>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-caption font-semibold">{orderStatusLabel(order.status)}</span>
        </h2>
        <div className="p-4 sm:p-5">
          <ul className="flex flex-col gap-1.5 text-body">
            {order.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <span className="font-semibold text-[var(--ev-ink)]">{l.quantity}×</span> {l.name}
                  {l.sessionLabel ? <span className="text-muted"> · {l.sessionLabel}</span> : null}
                </span>
                <span className="tabular-nums">{formatMoney(l.totalCents)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-baseline justify-between border-t-2 border-dashed border-[var(--ev-border)] pt-3 font-bold">
            <span className="text-section text-[var(--ev-ink)]">Totale</span>
            <span className="text-title tabular-nums text-primary">{formatMoney(order.totalCents)}</span>
          </p>
        </div>
      </section>
      {showQr && valid.length > 0 && (
        <section aria-label="Biglietti" className="grid gap-4 sm:grid-cols-2">
          {valid.map((t, i) => (
            <figure key={t.id} className={`${eventCard} relative flex flex-col items-center overflow-hidden text-center`}>
              <div className="w-full bg-primary px-4 py-2.5 text-primary-fg">
                <p className="text-caption font-semibold uppercase tracking-wider opacity-85">{order.edition.title}</p>
                <p className="text-body font-bold">{t.name}</p>
              </div>
              <div className="p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URI generato sul server */}
                <img src={qrs[i]} alt={`QR del biglietto ${i + 1}: ${t.name}`} width={200} height={200} className="rounded-lg bg-white p-1 ring-1 ring-[var(--ev-border)]" />
              </div>
              <figcaption className="w-full border-t-2 border-dashed border-[var(--ev-border)] px-4 py-3">
                <p className="text-body font-semibold text-[var(--ev-ink)]">{t.sessionLabel ?? 'Ingresso'}</p>
                <p className="text-label text-muted">
                  Biglietto {i + 1} di {valid.length} · mostralo all’ingresso
                </p>
              </figcaption>
            </figure>
          ))}
        </section>
      )}
    </div>
  );
}
