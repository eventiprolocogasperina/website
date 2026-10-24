import { Ban, Receipt } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CustomerEditCard, MergeCard } from '@/components/admin/customers/CustomerEdit';
import { AdminPage } from '@/components/admin/shell/AdminPage';
import { Badge, Card, EmptyState, ErrorState, KeyValue, PageHeader, StatusBadge, TwoColumnLayout } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { getAdminCtx } from '@/server/auth/context';
import { pageDenied } from '@/server/auth/guard';
import { getCustomer, type CustomerDetail } from '@/server/domain/customers/admin';
import { isDomainError } from '@/server/domain/errors';
import { log } from '@/server/log';

export const metadata = { title: 'Cliente' };

/** Scheda cliente: ordini di tutte le edizioni (anche dei doppioni uniti), consensi, note, unione. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const denied = await pageDenied('customers.read');
  if (denied) return denied;
  const ctx = (await getAdminCtx())!;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let d: CustomerDetail;
  try {
    d = await getCustomer(ctx, id);
  } catch (error) {
    if (isDomainError(error) && error.code === 'NOT_FOUND') notFound();
    log.error('Cliente non caricato', { error });
    return (
      <AdminPage>
        <div className="rounded-xl border border-border bg-surface">
          <ErrorState message="Non riesco a caricare il cliente. Ricarica la pagina tra poco." />
        </div>
      </AdminPage>
    );
  }
  const c = d.customer;
  return (
    <AdminPage>
      <PageHeader back={{ href: '/admin/clienti', label: 'Clienti' }} title={c.name ?? c.email} subtitle={`${c.email}${c.phone ? ` · ${c.phone}` : ''}`} badge={c.mergedInto ? <Badge tone="neutral">Unito</Badge> : undefined} />
      {c.mergedInto && (
        <p role="status" className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-body text-muted">
          Questa scheda è stata unita a <Link className="text-primary hover:underline" href={`/admin/clienti/${c.mergedInto.id}`}>{c.mergedInto.email}</Link>.
        </p>
      )}
      <TwoColumnLayout
        main={
          <Card title="Ordini" description={`${d.orders.length} su tutte le edizioni · pagati ${formatMoney(d.paidCents)}`} flush>
            {d.orders.length === 0 ? (
              <EmptyState icon={Receipt} title="Nessun ordine" />
            ) : (
              <ul className="divide-y divide-border">
                {d.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/e/${o.editionSlug}/ordini/${o.code}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-sunken">
                      <span className="min-w-0">
                        <span className="font-mono font-medium">{o.code}</span>
                        <span className="block text-caption text-muted">{[formatDateTime(o.createdAt), o.editionTitle, o.sessionLabel, o.viaEmail ? `con ${o.viaEmail}` : null].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {o.isBlacklisted && <Ban size={14} aria-label="In blacklist" className="text-danger" />}
                        <span className="tabular-nums">{formatMoney(o.totalCents)}</span>
                        <StatusBadge status={o.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        }
        aside={
          <div className="flex flex-col gap-4">
            <Card title="Consensi">
              <KeyValue
                layout="stacked"
                items={[
                  { label: 'Newsletter', value: c.marketingConsent ? `Sì, dal ${c.consentAt ? formatDate(c.consentAt, 'short') : '—'}` : 'No' },
                  { label: 'Cliente dal', value: formatDate(c.createdAt, 'short') },
                  ...(d.merged.length ? [{ label: 'Altre email unite', value: d.merged.map((m) => m.email).join(', ') }] : []),
                ]}
              />
            </Card>
            {d.canEdit && !c.mergedInto ? <CustomerEditCard c={c} /> : c.notes ? <Card title="Note interne"><p className="text-body whitespace-pre-line">{c.notes}</p></Card> : null}
            {d.canEdit && !c.mergedInto && <MergeCard targetId={c.id} />}
          </div>
        }
      />
    </AdminPage>
  );
}
