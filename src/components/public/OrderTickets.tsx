import Image from 'next/image';
import QRCode from 'qrcode';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMoney } from '@/lib/money';
import type { MyOrder } from '@/server/domain/checkout/my-tickets';
import { card } from './checkout/parts';

const STATUS_LABEL: Record<string, string> = {
  pending: 'In attesa di pagamento',
  paid: 'Pagato',
  partially_refunded: 'Rimborsato in parte',
  refunded: 'Rimborsato',
  cancelled: 'Annullato',
  expired: 'Scaduto',
};

export const orderStatusLabel = (s: string) => STATUS_LABEL[s] ?? s;

/** Righe dell'ordine e biglietti "a strappo" con il loro QR (generato sul server) e l'icona del format. */
export async function OrderTickets({ order }: { order: MyOrder }) {
  const valid = order.tickets.filter((t) => t.status !== 'void');
  const showQr = order.status === 'paid' || order.status === 'partially_refunded';
  const qrs = showQr ? await Promise.all(valid.map((t) => QRCode.toDataURL(t.qrToken, { errorCorrectionLevel: 'M', margin: 1, width: 360 }))) : [];
  const mark = order.edition.brand.mark;
  return (
    <div className="flex flex-col gap-5">
      <section className={`${card} overflow-hidden`} aria-labelledby="titolo-ordine">
        <h2 id="titolo-ordine" className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--ev-border)] px-5 py-3.5">
          <span className="text-pub-xs font-bold uppercase tracking-[0.16em] text-muted">
            Ordine <span className="font-black text-[var(--ev-ink)]">#{order.code}</span>
          </span>
          <StatusBadge status={order.status} label={orderStatusLabel(order.status)} />
        </h2>
        <div className="p-5">
          <ul className="flex flex-col gap-3 text-pub-base">
            {order.lines.map((l, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ev-soft)] text-[1.2rem]">
                    {mark && i === 0 ? <Image src={mark} alt="" width={26} height={26} className="size-6.5 object-contain" /> : '🎟️'}
                  </span>
                  <span>
                    <span className="font-bold text-[var(--ev-ink)]">
                      {l.quantity}× {l.name}
                    </span>
                    {l.sessionLabel ? <span className="block text-pub-sm text-muted">{l.sessionLabel}</span> : null}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{formatMoney(l.totalCents)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-end justify-between border-t-2 border-dashed border-[var(--ev-border)] pt-4">
            <span>
              <span className="block text-pub-lg font-bold text-[var(--ev-ink)]">{showQr ? 'Totale pagato' : 'Totale'}</span>
              <span className="text-pub-xs font-semibold uppercase tracking-wider text-muted">Contributo all’evento</span>
            </span>
            <span className="text-pub-2xl font-black tabular-nums text-primary">{formatMoney(order.totalCents)}</span>
          </p>
        </div>
      </section>
      {showQr && valid.length > 0 && (
        <section aria-label="Biglietti" className="grid gap-5 sm:grid-cols-2">
          {valid.map((t, i) => (
            <figure key={t.id} className="relative flex flex-col items-center overflow-hidden rounded-[1.5rem] bg-white text-center shadow-[0_18px_40px_-20px_var(--ev-glow)] ring-1 ring-[var(--ev-border)]">
              <div
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-white"
                style={{ background: 'linear-gradient(135deg, var(--ev-brand-strong), color-mix(in srgb, var(--ev-brand-strong) 72%, black))' }}
              >
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[1.2rem]">
                  {mark ? <Image src={mark} alt="" width={28} height={28} className="size-7 object-contain" /> : '🎟️'}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-pub-xs font-bold uppercase tracking-[0.14em] text-white/85">{order.edition.title}</span>
                  <span className="block truncate text-pub-base font-extrabold">{t.name}</span>
                </span>
              </div>
              <div className="p-5">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URI generato sul server */}
                <img src={qrs[i]} alt={`QR del biglietto ${i + 1}: ${t.name}`} width={200} height={200} className="rounded-xl bg-white p-1.5 ring-1 ring-[var(--ev-border)]" />
              </div>
              {/* Linea di strappo con le tacche laterali. */}
              <div aria-hidden className="relative w-full border-t-2 border-dashed border-[var(--ev-border)]">
                <span className="absolute -left-3 -top-3 size-6 rounded-full bg-[var(--ev-softer)] ring-1 ring-[var(--ev-border)]" />
                <span className="absolute -right-3 -top-3 size-6 rounded-full bg-[var(--ev-softer)] ring-1 ring-[var(--ev-border)]" />
              </div>
              <figcaption className="w-full px-4 py-3.5">
                <p className="text-pub-base font-bold text-[var(--ev-ink)]">{t.sessionLabel ?? 'Ingresso'}</p>
                <p className="text-pub-sm text-muted">
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
