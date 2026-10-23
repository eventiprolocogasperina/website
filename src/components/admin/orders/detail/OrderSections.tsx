import { Check, History, Minus } from 'lucide-react';
import Link from 'next/link';
import { Badge, Card, StatusBadge, Timeline } from '@/components/ui';
import { methodLabel, refundMethodLabel } from '@/lib/admin/order-labels';
import { formatDate, formatDateTime, romeTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { AUDIT_ACTION_LABELS } from '@/server/domain/audit/labels';
import type { OrderDetail } from '@/server/domain/orders/admin-detail';
import { RevertCheckinButton } from '../RevertCheckinButton';

// Riquadri della pagina ordine (§10.5) che si limitano a mostrare: righe, biglietti, cliente,
// pagamenti, rimborsi e cronologia. Le azioni stanno nei componenti client accanto.

const Row = ({ label, value, strong, muted }: { label: React.ReactNode; value: string; strong?: boolean; muted?: boolean }) => (
  <li className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'border-t border-border pt-2 font-semibold' : ''} ${muted ? 'text-muted' : ''}`}>
    <span className="min-w-0">{label}</span>
    <span className="shrink-0 tabular-nums">{value}</span>
  </li>
);

export function LinesCard({ d }: { d: OrderDetail }) {
  return (
    <Card title="Righe">
      <ul className="flex flex-col">
        {d.lines.map((l) => (
          <Row
            key={l.id}
            label={
              <>
                {`${l.quantity} × ${l.productName}`}
                {l.sessionLabel && l.sessionLabel !== d.order.session?.label && <span className="text-caption text-muted">{` · ${l.sessionLabel}`}</span>}
              </>
            }
            value={formatMoney(l.unitPriceCents * l.quantity)}
          />
        ))}
        {d.order.discountCents > 0 && <Row label={`Sconto ${d.order.discountCode ?? ''}`.trim()} value={`−${formatMoney(d.order.discountCents)}`} muted />}
        <Row label={d.order.status === 'draft' ? 'Totale indicativo' : 'Totale'} value={formatMoney(d.order.totalCents)} strong />
      </ul>
      {d.order.status === 'draft' && <p className="mt-3 text-label text-muted">Bozza: non tiene posti. Prezzi e disponibilità si ricalcolano quando la confermi.</p>}
      {d.order.payOnSite && d.order.status === 'pending' && <p className="mt-3 text-label text-muted">Da pagare in loco, all’evento: si incassa in cassa (“Da incassare”), al varco o qui con “Segna come pagato”. Finché non è pagato i biglietti non entrano.</p>}
      {(d.parent || d.children.length > 0) && (
        <p className="mt-3 text-label text-muted">
          {d.parent && (
            <>
              Integrazione dell’ordine <Link className="text-primary hover:underline" href={d.parent.code}>{d.parent.code}</Link>.{' '}
            </>
          )}
          {d.children.length > 0 && (
            <>
              Integrazioni:{' '}
              {d.children.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  <Link className="text-primary hover:underline" href={c.code}>{c.code}</Link> ({formatMoney(c.totalCents)})
                </span>
              ))}
            </>
          )}
        </p>
      )}
    </Card>
  );
}

export function TicketsCard({ d }: { d: OrderDetail }) {
  return (
    <Card title="Biglietti" description={d.tickets.length ? undefined : 'Questo ordine non ha biglietti (ad esempio solo consumazioni o in attesa di pagamento).'}>
      {d.tickets.length > 0 && (
        <ol className="flex flex-col divide-y divide-border">
          {d.tickets.map((t, i) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="text-muted tabular-nums">{`#${i + 1} `}</span>
                <span className="font-medium">{t.productName}</span>
                {t.attendeeName && <span className="text-muted">{` · ${t.attendeeName}`}</span>}
                {t.sessionLabel && <span className="text-caption text-muted">{` · ${t.sessionLabel}`}</span>}
              </span>
              {t.status === 'void' ? (
                <StatusBadge status="void" />
              ) : t.checkedInAt ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-label text-success">
                    <Check size={14} aria-hidden /> {`entrato ${romeTime(t.checkedInAt)}${t.checkinList ? ` (${t.checkinList})` : ''}`}
                  </span>
                  {d.can.revertCheckin && t.checkinId && <RevertCheckinButton checkinId={t.checkinId} label={`${t.attendeeName ?? t.productName} (#${i + 1})`} from="ordine" />}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-label text-muted">
                  <Minus size={14} aria-hidden /> non entrato
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function CustomerCard({ d, customerHref }: { d: OrderDetail; customerHref: string | null }) {
  const c = d.customer;
  return (
    <Card title="Cliente">
      {c ? (
        <div className="flex flex-col gap-1 text-body">
          <span className="font-medium">{c.name ?? 'Senza nome'}</span>
          <a className="break-all text-primary hover:underline" href={`mailto:${c.email}`}>{c.email}</a>
          {c.phone && <a className="text-primary hover:underline" href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>}
          <span className="mt-1 text-label text-muted">
            {c.orders === 1 ? '1 ordine' : `${c.orders} ordini`}
            {customerHref && (
              <>
                {' · '}
                <Link className="text-primary hover:underline" href={customerHref}>Vedi scheda →</Link>
              </>
            )}
          </span>
        </div>
      ) : (
        <p className="text-body text-muted">Vendita senza cliente (cassa).</p>
      )}
    </Card>
  );
}

export function PaymentsCard({ d }: { d: OrderDetail }) {
  const s = d.summary;
  return (
    <Card title="Pagamenti">
      {d.payments.length === 0 ? (
        <p className="text-body text-muted">Nessun pagamento.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {d.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="block">{methodLabel(p.method)}</span>
                <span className="text-caption text-muted">{formatDate(p.receivedAt, 'short')}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{formatMoney(p.amountCents)}</span>
                <StatusBadge status={p.status} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {s.dueCents > 0 && d.order.status === 'pending' && <p className="mt-3 text-label text-warning">{`Da incassare: ${formatMoney(s.dueCents)}`}</p>}
    </Card>
  );
}

export function RefundsCard({ d, refundsHref }: { d: OrderDetail; refundsHref: string }) {
  return (
    <Card title="Rimborsi">
      {d.refunds.length === 0 ? (
        <p className="text-body text-muted">Nessuno.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {d.refunds.map((r) => (
            <li key={r.id} className="flex flex-col gap-0.5">
              <span className="flex items-center justify-between gap-2">
                <span className="tabular-nums">{formatMoney(r.amountCents)}</span>
                <StatusBadge status={r.status} />
              </span>
              <span className="text-caption text-muted">{`${refundMethodLabel(r.method)} · ${formatDate(r.requestedAt, 'short')}${r.iban ? ` · ${r.iban}` : ''}`}</span>
              {r.reason && <span className="text-caption">{r.reason}</span>}
            </li>
          ))}
        </ul>
      )}
      {d.refunds.some((r) => r.status === 'requested' || r.status === 'approved') && (
        <Link className="mt-3 inline-block text-label text-primary hover:underline" href={refundsHref}>
          Gestisci nella coda rimborsi →
        </Link>
      )}
      {d.summary.refundedCents > 0 && <p className="mt-2 text-label text-muted">{`Rimborsati finora: ${formatMoney(d.summary.refundedCents)}`}</p>}
    </Card>
  );
}

/** Cronologia: il registro attività dell'ordine e dei suoi rimborsi, dal più recente. */
export function HistoryCard({ d }: { d: OrderDetail }) {
  return (
    <Card title="Cronologia">
      {d.history.length === 0 ? (
        <p className="text-body text-muted">Nessuna attività registrata.</p>
      ) : (
        <Timeline
          items={d.history.map((h) => ({
            id: h.id,
            title: AUDIT_ACTION_LABELS[h.action] ?? h.action,
            time: formatDateTime(h.at),
            actor: h.actor,
            body: h.reason ?? undefined,
            icon: History,
            tone: h.action.includes('refund') ? 'warning' : h.action === 'payment.recorded' ? 'success' : h.action.includes('cancel') || h.action.includes('blacklist') ? 'danger' : 'neutral',
          }))}
        />
      )}
    </Card>
  );
}

export function ChannelBadge({ channel }: { channel: string }) {
  const labels: Record<string, string> = { online: 'Online', pos: 'Cassa', paylink: 'Pay-link', invite: 'Invito', admin: 'Admin' };
  return <Badge tone="neutral">{labels[channel] ?? channel}</Badge>;
}
