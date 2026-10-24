'use client';

import { User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Badge, Button, DataTable, dataTableColumns, EmptyState, FilterBar } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { CustomerListRow } from '@/server/domain/customers/admin';

// Elenco clienti (§10.3): chi ha comprato o prenotato, con ordini e speso su tutte le edizioni.

const col = dataTableColumns<CustomerListRow>();
const columns = [
  col.accessor('name', { header: 'Nome', meta: { label: 'Nome' }, size: 220, enableSorting: false, cell: (c) => <span className="font-medium">{c.getValue() ?? 'Senza nome'}</span> }),
  col.accessor('email', { header: 'Email', meta: { label: 'Email' }, size: 260, enableSorting: false }),
  col.accessor('phone', { header: 'Telefono', meta: { label: 'Telefono' }, size: 150, enableSorting: false, cell: (c) => c.getValue() ?? '—' }),
  col.accessor('orders', { header: 'Ordini', meta: { label: 'Ordini', align: 'right' }, size: 80, enableSorting: false }),
  col.accessor('paidCents', { header: 'Speso', meta: { label: 'Speso', align: 'right' }, size: 110, enableSorting: false, cell: (c) => <span className="tabular-nums">{formatMoney(c.getValue())}</span> }),
  col.accessor('lastOrderAt', { header: 'Ultimo ordine', meta: { label: 'Ultimo ordine' }, size: 140, enableSorting: false, cell: (c) => (c.getValue() ? formatDate(c.getValue()!, 'short') : '—') }),
  col.accessor('marketingConsent', { header: 'Newsletter', meta: { label: 'Consenso newsletter' }, size: 110, enableSorting: false, cell: (c) => (c.getValue() ? <Badge tone="success">Sì</Badge> : <span className="text-muted">No</span>) }),
];

export function CustomersList({ rows, total, page, pageSize, q }: { rows: CustomerListRow[]; total: number; page: number; pageSize: number; q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  function go(next: { q?: string; page?: number }) {
    const p = new URLSearchParams();
    const query = next.q ?? q;
    if (query) p.set('q', query);
    if (next.page) p.set('pagina', String(next.page + 1));
    start(() => router.push(`${pathname}${p.size ? `?${p}` : ''}`, { scroll: false }));
  }
  const empty = <EmptyState icon={User} title={q ? 'Nessun cliente trovato' : 'Ancora nessun cliente'} description={q ? 'Prova con un altro nome, email o telefono.' : 'I clienti nascono con il primo ordine.'} />;
  return (
    <div className="flex flex-col gap-4">
      <FilterBar search={q} onSearchChange={(v) => go({ q: v, page: 0 })} searchPlaceholder="Cerca nome, email o telefono" />
      <div className="hidden md:block">
        <DataTable label="Clienti" data={rows} columns={columns} getRowId={(r) => r.id} loading={pending} empty={empty} onRowClick={(r) => router.push(`/admin/clienti/${r.id}`)} pagination={{ pageIndex: page, pageSize, total, onPageChange: (p) => go({ page: p }) }} />
      </div>
      <ul className="flex flex-col gap-2 md:hidden" aria-label="Clienti">
        {rows.length === 0 && <li className="rounded-xl border border-border bg-surface">{empty}</li>}
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/clienti/${r.id}`} className="flex flex-col gap-0.5 rounded-xl border border-border bg-surface p-3 shadow-sm">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{r.name ?? 'Senza nome'}</span>
                <span className="tabular-nums">{formatMoney(r.paidCents)}</span>
              </span>
              <span className="truncate text-label text-muted">{r.email}</span>
              <span className="text-caption text-muted">{`${r.orders} ${r.orders === 1 ? 'ordine' : 'ordini'}${r.lastOrderAt ? ` · ultimo ${formatDate(r.lastOrderAt, 'short')}` : ''}`}</span>
            </Link>
          </li>
        ))}
      </ul>
      {total > pageSize && (
        <nav className="flex items-center justify-between md:hidden" aria-label="Pagine">
          <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => go({ page: page - 1 })}>Precedente</Button>
          <span className="text-label text-muted tabular-nums">{`${page + 1} di ${Math.ceil(total / pageSize)}`}</span>
          <Button size="sm" variant="secondary" disabled={(page + 1) * pageSize >= total} onClick={() => go({ page: page + 1 })}>Successiva</Button>
        </nav>
      )}
    </div>
  );
}
