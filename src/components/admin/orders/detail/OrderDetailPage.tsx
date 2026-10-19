import 'server-only';
import { Ban, Lock } from 'lucide-react';
import { notFound } from 'next/navigation';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { ErrorState, ForbiddenState, PageHeader, StatusBadge, TwoColumnLayout } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { getAdminCtx } from '@/server/auth/context';
import { isDomainError } from '@/server/domain/errors';
import { orderEditionContext } from '@/server/domain/orders/admin-context';
import { getOrderDetail, type OrderDetail } from '@/server/domain/orders/admin-detail';
import { log } from '@/server/log';
import { NotesCard } from './NotesCard';
import { OrderActions } from './OrderActions';
import { ChannelBadge, CustomerCard, HistoryCard, LinesCard, PaymentsCard, RefundsCard, TicketsCard } from './OrderSections';
import { ModulePanels } from './panels';

/**
 * Dettaglio ordine (§10.5), unico per /admin/ordini/[code] e /admin/e/[edition]/ordini/[code].
 * Righe, biglietti e riquadri dei moduli a sinistra; cliente, pagamenti, rimborsi e note a destra;
 * cronologia sotto.
 */
export async function OrderDetailPage({ code, edition }: { code: string; edition: string | null }) {
  const ctx = (await getAdminCtx())!;
  let d: OrderDetail;
  try {
    d = await getOrderDetail(ctx, code, edition);
  } catch (error) {
    if (isDomainError(error) && error.code === 'NOT_FOUND') notFound();
    if (isDomainError(error) && error.code === 'FORBIDDEN') return <Shell><ForbiddenState /></Shell>;
    log.error('Dettaglio ordine non caricato', { error });
    return <Shell><ErrorState message="Non riesco a caricare l’ordine. Ricarica la pagina tra poco." /></Shell>;
  }
  const base = edition ? `/admin/e/${edition}` : '/admin';
  const listHref = `${base}/ordini`;
  const products = d.moduleActions.some((a) => a.key === 'paylink') ? (await orderEditionContext(ctx, d.edition.slug)).products.filter((p) => p.paylink) : [];

  return (
    <AdminPage>
      <PageHeader
        back={{ href: listHref, label: 'Ordini' }}
        title={<span className="font-mono">{d.order.code}</span>}
        badge={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={d.order.status} />
            <ChannelBadge channel={d.order.channel} />
          </span>
        }
        subtitle={[formatDateTime(d.order.createdAt), d.edition.title, d.order.session?.label].filter(Boolean).join(' · ')}
        primaryAction={<OrderActions d={d} paylinkProducts={products} />}
      />
      {d.order.isBlacklisted && (
        <Notice icon={Ban} tone="danger">{`In blacklist: ${d.order.blacklistReason ?? 'nessun motivo indicato'}.`}</Notice>
      )}
      {d.edition.readOnly && <Notice icon={Lock} tone="neutral">Edizione archiviata: l’ordine si può solo consultare.</Notice>}
      <TwoColumnLayout
        main={
          <div className="flex flex-col gap-4">
            <LinesCard d={d} />
            <TicketsCard d={d} />
            <ModulePanels panels={d.panels} />
          </div>
        }
        aside={
          <div className="flex flex-col gap-4">
            <CustomerCard d={d} customerHref={d.can.customer && d.customer ? `/admin/clienti/${d.customer.id}` : null} />
            <PaymentsCard d={d} />
            <RefundsCard d={d} refundsHref={`${base === '/admin' ? `/admin/e/${d.edition.slug}` : base}/rimborsi`} />
            <NotesCard orderId={d.order.id} notes={d.notes} legacyNotes={d.order.legacyNotes} canEdit={d.can.edit} />
          </div>
        }
        footer={<HistoryCard d={d} />}
      />
    </AdminPage>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AdminPage>
      <div className="rounded-xl border border-border bg-surface shadow-sm">{children}</div>
    </AdminPage>
  );
}

function Notice({ icon: Icon, tone, children }: { icon: typeof Ban; tone: 'danger' | 'neutral'; children: React.ReactNode }) {
  const cls = tone === 'danger' ? 'border-danger/30 bg-danger-bg text-danger' : 'border-border bg-surface-sunken text-muted';
  return (
    <p role="status" className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-body ${cls}`}>
      <Icon size={16} aria-hidden />
      {children}
    </p>
  );
}
