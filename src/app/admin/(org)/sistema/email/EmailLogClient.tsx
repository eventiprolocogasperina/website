'use client';

import { Inbox } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Badge, DataTable, dataTableColumns, EmptyState, Field, Select } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { TEMPLATE_DEFAULTS, TEMPLATE_KEYS } from '@/server/domain/email-templates/defaults';
import type { EmailLogRow } from '@/server/domain/email-templates/log';

const ALL = '__tutti';
const STATUS = { sent: { label: 'Inviata', tone: 'success' }, outbox: { label: 'Sviluppo (dev/outbox)', tone: 'info' }, failed: { label: 'Non inviata', tone: 'danger' } } as const;
type Filters = { modello: string; esito: string };

/** Registro degli invii: destinatario mascherato, modello, esito di Resend. */
export function EmailLogClient({ rows, total, page, pageSize, filters }: { rows: EmailLogRow[]; total: number; page: number; pageSize: number; filters: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  function go(next: Partial<Filters> & { pagina?: number }) {
    const params = new URLSearchParams({ vista: 'registro' });
    const merged = { ...filters, ...next };
    if (merged.modello) params.set('modello', merged.modello);
    if (merged.esito) params.set('esito', merged.esito);
    if (next.pagina) params.set('pagina', String(next.pagina + 1));
    start(() => router.push(`${pathname}?${params}`));
  }
  const col = dataTableColumns<EmailLogRow>();
  const columns = [
    col.accessor('createdAt', { header: 'Quando', meta: { label: 'Quando' }, size: 170, enableSorting: false, cell: (c) => <span className="tabular-nums">{formatDateTime(c.getValue())}</span> }),
    col.accessor('templateKey', {
      header: 'Modello',
      meta: { label: 'Modello' },
      size: 190,
      enableSorting: false,
      cell: (c) => (
        <span className="flex flex-wrap items-center gap-1">
          {c.getValue() && c.getValue()! in TEMPLATE_DEFAULTS ? TEMPLATE_DEFAULTS[c.getValue() as keyof typeof TEMPLATE_DEFAULTS].label : 'Avviso'}
          {c.row.original.isTest && <Badge tone="neutral">Prova</Badge>}
        </span>
      ),
    }),
    col.accessor('recipientMasked', { header: 'Destinatario', meta: { label: 'Destinatario' }, size: 190, enableSorting: false }),
    col.accessor('orderCode', { header: 'Ordine', meta: { label: 'Ordine' }, size: 120, enableSorting: false, cell: (c) => c.getValue() ?? <span className="text-muted">—</span> }),
    col.accessor('status', {
      header: 'Esito',
      meta: { label: 'Esito' },
      size: 200,
      enableSorting: false,
      cell: (c) => {
        const s = STATUS[c.getValue() as keyof typeof STATUS];
        return (
          <span className="flex flex-col">
            <Badge tone={s?.tone ?? 'neutral'}>{s?.label ?? c.getValue()}</Badge>
            {c.row.original.error && <span className="text-label text-danger">{c.row.original.error}</span>}
            {c.row.original.providerId && c.getValue() === 'sent' && <span className="truncate text-label text-subtle">Resend {c.row.original.providerId}</span>}
          </span>
        );
      },
    }),
  ];
  const hasFilters = !!(filters.modello || filters.esito);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2">
        <Field label="Modello">
          <Select value={filters.modello || ALL} onValueChange={(v) => go({ modello: v === ALL ? '' : v })} options={[{ value: ALL, label: 'Tutti' }, ...TEMPLATE_KEYS.map((k) => ({ value: k, label: TEMPLATE_DEFAULTS[k].label }))]} />
        </Field>
        <Field label="Esito">
          <Select value={filters.esito || ALL} onValueChange={(v) => go({ esito: v === ALL ? '' : v })} options={[{ value: ALL, label: 'Tutti' }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))]} />
        </Field>
      </div>
      <DataTable
        label="Registro invii email"
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        loading={pending}
        compact
        pagination={{ pageIndex: page, pageSize, total, onPageChange: (p) => go({ pagina: p }) }}
        empty={<EmptyState icon={Inbox} title={hasFilters ? 'Nessun invio con questi filtri' : 'Ancora nessuna email inviata'} description={hasFilters ? 'Prova a togliere qualche filtro.' : 'Qui compaiono le email partite dai modelli, con l’esito di Resend.'} />}
      />
    </div>
  );
}
