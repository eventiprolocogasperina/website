import QRCode from 'qrcode';
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
      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-section font-semibold">Ordine {order.code}</h2>
        <ul className="flex flex-col gap-1 text-body">
          {order.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {l.quantity}× {l.name}
                {l.sessionLabel ? <span className="text-muted"> · {l.sessionLabel}</span> : null}
              </span>
              <span className="tabular-nums">{formatMoney(l.totalCents)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between border-t border-border pt-2 text-section font-semibold">
          <span>Totale</span>
          <span className="tabular-nums">{formatMoney(order.totalCents)}</span>
        </p>
      </section>
      {showQr && valid.length > 0 && (
        <section aria-label="Biglietti" className="grid gap-3 sm:grid-cols-2">
          {valid.map((t, i) => (
            <figure key={t.id} className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URI generato sul server */}
              <img src={qrs[i]} alt={`QR del biglietto ${i + 1}: ${t.name}`} width={200} height={200} className="rounded bg-white p-1" />
              <figcaption>
                <p className="text-body font-medium text-fg">{t.name}</p>
                <p className="text-label text-muted">
                  Biglietto {i + 1} di {valid.length}
                  {t.sessionLabel ? ` · ${t.sessionLabel}` : ''}
                </p>
              </figcaption>
            </figure>
          ))}
        </section>
      )}
    </div>
  );
}
