'use client';

import { Download, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Badge, ButtonLink, DataTable, dataTableColumns, EmptyState, FilterBar, StatusBadge, Tabs } from '@/components/ui';
import { refundMethodLabel } from '@/lib/admin/order-labels';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { RefundChannelKey, RefundFilters, RefundRow, RefundStatusKey } from '@/server/domain/refunds/admin';
import { RefundRowActions, type RefundPermissions } from './RefundRowActions';

// Coda dei rimborsi (prompt 12): prima le richieste da gestire. Approva → esegui (bonifico o storno) → fatto;
// oppure rifiuta con un motivo. L'IBAN è sempre mascherato: per vederlo intero si apre e resta nel registro.

const TABS: Array<{ value: RefundStatusKey | ''; label: string }> = [
  { value: 'requested', label: 'Da gestire' },
  { value: 'approved', label: 'Da eseguire' },
  { value: 'paid', label: 'Eseguiti' },
  { value: 'rejected', label: 'Rifiutati' },
  { value: '', label: 'Tutti' },
];
const CHANNELS: Array<{ value: RefundChannelKey | ''; label: string }> = [
  { value: '', label: 'Tutti i canali' },
  { value: 'online', label: 'Online' },
  { value: 'cassa', label: 'Cassa' },
  { value: 'admin', label: 'Admin' },
];
/** Etichetta del canale dell'ordine (online e link di pagamento = Online; inviti = Admin). */
const channelLabel = (c: string) => (c === 'pos' ? 'Cassa' : c === 'admin' || c === 'invite' ? 'Admin' : 'Online');
const col = dataTableColumns<RefundRow>();

export function RefundQueue({ rows, total, counts, filters, pageSize, perms, global, exportHref }: { rows: RefundRow[]; total: number; counts: Record<RefundStatusKey, number>; filters: RefundFilters; pageSize: number; perms: RefundPermissions; global: boolean; exportHref: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function go(next: Partial<RefundFilters>) {
    const f = { ...filters, page: 0, ...next };
    const p = new URLSearchParams();
    p.set('stato', f.status || 'tutti');
    if (f.channel) p.set('canale', f.channel);
    if (f.q) p.set('q', f.q);
    if (f.page) p.set('pagina', String(f.page + 1));
    start(() => router.push(`${pathname}?${p}`, { scroll: false }));
  }

  const orderHref = (r: RefundRow) => `/admin/e/${r.editionSlug}/ordini/${r.orderCode}`;
  const columns = [
    col.accessor('orderCode', { header: 'Ordine', meta: { label: 'Ordine' }, size: 120, enableSorting: false, cell: (c) => <Link className="font-mono text-primary hover:underline" href={orderHref(c.row.original)} onClick={(e) => e.stopPropagation()}>{c.getValue()}</Link> }),
    col.accessor('requestedAt', { header: 'Richiesto', meta: { label: 'Richiesto' }, size: 150, enableSorting: false, cell: (c) => formatDateTime(c.getValue()) }),
    col.display({ id: 'customer', header: 'Cliente', meta: { label: 'Cliente' }, size: 200, cell: (c) => <span className="truncate">{c.row.original.customerName ?? c.row.original.customerEmail ?? '—'}</span> }),
    col.accessor('channel', { header: 'Canale', meta: { label: 'Canale' }, size: 90, enableSorting: false, cell: (c) => <Badge tone={c.getValue() === 'pos' ? 'warning' : 'neutral'}>{channelLabel(c.getValue())}</Badge> }),
    ...(global ? [col.accessor('editionTitle', { header: 'Edizione', meta: { label: 'Edizione' }, size: 160, enableSorting: false })] : []),
    col.accessor('amountCents', { header: 'Importo', meta: { label: 'Importo', align: 'right' }, size: 100, enableSorting: false, cell: (c) => <span className="tabular-nums">{formatMoney(c.getValue())}</span> }),
    col.display({
      id: 'method',
      header: 'Metodo',
      meta: { label: 'Metodo' },
      size: 220,
      cell: (c) => (
        <span className="flex flex-col">
          <span>{refundMethodLabel(c.row.original.method)}</span>
          {c.row.original.iban && <span className="font-mono text-caption text-muted">{c.row.original.iban}</span>}
        </span>
      ),
    }),
    col.accessor('reason', { header: 'Motivo', meta: { label: 'Motivo' }, size: 170, enableSorting: false, cell: (c) => <span className="line-clamp-2 text-label">{c.getValue() ?? '—'}</span> }),
    col.accessor('status', { header: 'Stato', meta: { label: 'Stato' }, size: 110, enableSorting: false, cell: (c) => <StatusBadge status={c.getValue()} /> }),
    col.display({ id: 'actions', header: '', size: 180, cell: (c) => <RefundRowActions row={c.row.original} perms={perms} /> }),
  ];
  const empty = <EmptyState icon={Undo2} title={filters.status === 'requested' ? 'Nessuna richiesta da gestire' : 'Nessun rimborso qui'} description={filters.q ? 'Prova a cambiare la ricerca.' : undefined} />;

  return (
    <div className="flex flex-col gap-4">
      <Tabs aria-label="Stato dei rimborsi" items={TABS.map((t) => ({ value: t.value || 'tutti', label: t.label, count: t.value ? counts[t.value] : undefined }))} value={filters.status || 'tutti'} onValueChange={(v) => go({ status: v === 'tutti' ? '' : (v as RefundStatusKey) })} />
      <Tabs aria-label="Canale dell'ordine" items={CHANNELS.map((c) => ({ value: c.value || 'tutti', label: c.label }))} value={filters.channel || 'tutti'} onValueChange={(v) => go({ channel: v === 'tutti' ? '' : (v as RefundChannelKey) })} />
      <FilterBar
        search={filters.q}
        onSearchChange={(q) => go({ q })}
        searchPlaceholder="Cerca codice, cliente o intestatario"
        end={
          <ButtonLink variant="secondary" icon={Download} href={exportHref} prefetch={false}>
            CSV bonifici da fare
          </ButtonLink>
        }
      />
      <div className="hidden md:block">
        <DataTable label="Rimborsi" data={rows} columns={columns} getRowId={(r) => r.id} loading={pending} empty={empty} pagination={{ pageIndex: filters.page, pageSize, total, onPageChange: (page) => go({ page }) }} />
      </div>
      <ul className="flex flex-col gap-2 md:hidden" aria-label="Rimborsi">
        {rows.length === 0 && <li className="rounded-xl border border-border bg-surface">{empty}</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-3 shadow-sm">
            <span className="flex items-center justify-between gap-2">
              <Link className="font-mono font-semibold text-primary" href={orderHref(r)}>{r.orderCode}</Link>
              <span className="font-semibold tabular-nums">{formatMoney(r.amountCents)}</span>
            </span>
            <span className="truncate">{r.customerName ?? r.customerEmail ?? '—'}</span>
            <span className="text-caption text-muted">{[formatDateTime(r.requestedAt), channelLabel(r.channel), global ? r.editionTitle : null, refundMethodLabel(r.method), r.iban].filter(Boolean).join(' · ')}</span>
            {r.reason && <span className="text-label">{r.reason}</span>}
            <span className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={r.status} />
              <RefundRowActions row={r} perms={perms} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
