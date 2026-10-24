'use client';

import { Ban } from 'lucide-react';
import Link from 'next/link';
import { Badge, Checkbox, dataTableColumns, StatusBadge, type DataTableColumn } from '@/components/ui';
import { CHANNEL_LABELS, type OrderChannelKey } from '@/lib/admin/order-filters';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { OrderListRow } from '@/server/domain/orders/admin-list';

// Colonne dell'elenco ordini (desktop) e scheda dell'ordine (telefono, §11.1: sotto 768 px le tabelle diventano schede).

const col = dataTableColumns<OrderListRow>();

export function CheckinCount({ row }: { row: Pick<OrderListRow, 'tickets' | 'checkedIn'> }) {
  if (!row.tickets) return <span className="text-muted">—</span>;
  const done = row.checkedIn >= row.tickets;
  return <span className={done ? 'font-medium text-success tabular-nums' : 'tabular-nums'}>{`${row.checkedIn}/${row.tickets}`}</span>;
}

export function OrderStatus({ row }: { row: Pick<OrderListRow, 'status' | 'isBlacklisted'> }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusBadge status={row.status} />
      {row.isBlacklisted && (
        <Badge tone="danger">
          <Ban size={12} aria-hidden />
          Blacklist
        </Badge>
      )}
    </span>
  );
}

const customerOf = (r: OrderListRow) => r.customerName ?? r.customerEmail ?? 'Senza nome';

export function orderColumns(opts: { global: boolean }): DataTableColumn<OrderListRow>[] {
  return [
    col.accessor('code', { header: 'Codice', meta: { label: 'Codice' }, size: 130, cell: (c) => <span className="font-mono text-label font-medium">{c.getValue()}</span> }),
    col.accessor('createdAt', { header: 'Data', meta: { label: 'Data' }, size: 150, cell: (c) => <span className="tabular-nums">{formatDateTime(c.getValue())}</span> }),
    col.display({
      id: 'customer',
      header: 'Cliente',
      meta: { label: 'Cliente' },
      size: 240,
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{customerOf(c.row.original)}</span>
          {c.row.original.customerName && c.row.original.customerEmail && <span className="truncate text-caption text-muted">{c.row.original.customerEmail}</span>}
        </span>
      ),
    }),
    ...(opts.global ? [col.accessor('editionTitle', { header: 'Edizione', meta: { label: 'Edizione' }, size: 170, enableSorting: false })] : []),
    col.accessor('sessionLabel', { header: 'Sessione', meta: { label: 'Sessione' }, size: 140, enableSorting: false, cell: (c) => c.getValue() ?? <span className="text-muted">—</span> }),
    col.accessor('channel', { header: 'Canale', meta: { label: 'Canale' }, size: 100, enableSorting: false, cell: (c) => CHANNEL_LABELS[c.getValue() as OrderChannelKey] ?? c.getValue() }),
    col.accessor('totalCents', { header: 'Totale', meta: { label: 'Totale', align: 'right' }, size: 100, cell: (c) => <span className="tabular-nums">{formatMoney(c.getValue())}</span> }),
    col.accessor('status', { header: 'Pagamento', meta: { label: 'Stato pagamento' }, size: 190, enableSorting: false, cell: (c) => <OrderStatus row={c.row.original} /> }),
    col.display({ id: 'checkin', header: 'Check-in', meta: { label: 'Check-in', align: 'right' }, size: 90, cell: (c) => <CheckinCount row={c.row.original} /> }),
  ];
}

/** Scheda di un ordine sul telefono: codice e stato in alto, cliente, data e totale sotto. */
export function OrderCard({ row, href, selected, onSelect, global }: { row: OrderListRow; href: string; selected?: boolean; onSelect?: (v: boolean) => void; global: boolean }) {
  return (
    <li className="flex gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
      {onSelect && <Checkbox checked={!!selected} onCheckedChange={onSelect} aria-label={`Seleziona ${row.code}`} className="mt-0.5" />}
      <Link href={href} className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center justify-between gap-2">
          <span className="font-mono text-label font-semibold">{row.code}</span>
          <span className="font-semibold tabular-nums">{formatMoney(row.totalCents)}</span>
        </span>
        <span className="truncate font-medium">{customerOf(row)}</span>
        <span className="text-caption text-muted">
          {[formatDateTime(row.createdAt), global ? row.editionTitle : null, row.sessionLabel, CHANNEL_LABELS[row.channel as OrderChannelKey] ?? row.channel].filter(Boolean).join(' · ')}
        </span>
        <span className="flex items-center justify-between gap-2">
          <OrderStatus row={row} />
          <span className="text-caption text-muted">
            Check-in <CheckinCount row={row} />
          </span>
        </span>
      </Link>
    </li>
  );
}
