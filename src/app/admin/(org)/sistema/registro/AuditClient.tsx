'use client';

import { History } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, DataTable, dataTableColumns, DatePicker, Dialog, DialogContent, EmptyState, Field, KeyValue, Select } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import type { AuditRow } from '@/server/domain/audit';
import { AUDIT_ACTION_LABELS } from '@/server/domain/audit/labels';

type Filters = { utente: string; azione: string; edizione: string; dal: string; al: string };

const ALL = '__tutti';

export function AuditClient({
  rows,
  total,
  page,
  pageSize,
  people,
  editions,
  filters,
}: {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  people: Array<{ id: string; name: string }>;
  editions: Array<{ slug: string; title: string }>;
  filters: Filters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<AuditRow | null>(null);
  const editionTitle = new Map(editions.map((e) => [e.slug, e.title]));

  function go(next: Partial<Filters> & { pagina?: number }) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v && k !== 'pagina') params.set(k, String(v));
    if (next.pagina && next.pagina > 0) params.set('pagina', String(next.pagina + 1));
    start(() => router.push(`${pathname}${params.size ? `?${params}` : ''}`));
  }

  const col = dataTableColumns<AuditRow>();
  const columns = [
    col.accessor('at', { header: 'Quando', meta: { label: 'Quando' }, size: 190, enableSorting: false, cell: (c) => <span className="tabular-nums">{formatDateTime(c.getValue())}</span> }),
    col.accessor('actor', { header: 'Chi', meta: { label: 'Chi' }, size: 220, enableSorting: false }),
    col.accessor('action', { header: 'Azione', meta: { label: 'Azione' }, size: 240, enableSorting: false, cell: (c) => AUDIT_ACTION_LABELS[c.getValue()] ?? c.getValue() }),
    col.accessor('edition', { header: 'Edizione', meta: { label: 'Edizione' }, size: 200, enableSorting: false, cell: (c) => (c.getValue() ? (editionTitle.get(c.getValue()!) ?? c.getValue()) : <span className="text-muted">—</span>) }),
    col.accessor('reason', { header: 'Motivo', meta: { label: 'Motivo' }, size: 200, enableSorting: false, cell: (c) => c.getValue() ?? <span className="text-muted">—</span> }),
  ];

  const hasFilters = Object.values(filters).some(Boolean);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Persona">
          <Select value={filters.utente || ALL} onValueChange={(v) => go({ utente: v === ALL ? '' : v })} options={[{ value: ALL, label: 'Tutte' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
        </Field>
        <Field label="Azione">
          <Select
            value={filters.azione || ALL}
            onValueChange={(v) => go({ azione: v === ALL ? '' : v })}
            options={[{ value: ALL, label: 'Tutte' }, ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({ value, label }))]}
          />
        </Field>
        <Field label="Edizione">
          <Select value={filters.edizione || ALL} onValueChange={(v) => go({ edizione: v === ALL ? '' : v })} options={[{ value: ALL, label: 'Tutte' }, ...editions.map((e) => ({ value: e.slug, label: e.title }))]} />
        </Field>
        <Field label="Dal">
          <DatePicker value={filters.dal} onValueChange={(v) => go({ dal: v })} />
        </Field>
        <Field label="Al">
          <DatePicker value={filters.al} onValueChange={(v) => go({ al: v })} />
        </Field>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => go({ utente: '', azione: '', edizione: '', dal: '', al: '' })}>
          Togli i filtri
        </Button>
      )}
      <DataTable
        label="Registro attività"
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        loading={pending}
        compact
        onRowClick={setOpen}
        pagination={{ pageIndex: page, pageSize, total, onPageChange: (p) => go({ pagina: p }) }}
        empty={<EmptyState icon={History} title={hasFilters ? 'Nessuna attività con questi filtri' : 'Ancora nessuna attività'} description={hasFilters ? 'Prova a togliere qualche filtro.' : undefined} />}
      />
      {open && (
        <Dialog open onOpenChange={(o) => !o && setOpen(null)}>
          <DialogContent title={AUDIT_ACTION_LABELS[open.action] ?? open.action} description={`${open.actor} · ${formatDateTime(open.at)}`} size="lg">
            <div className="flex flex-col gap-4">
              <KeyValue
                items={[
                  { label: 'Oggetto', value: open.entityType ? `${open.entityType}${open.entityId ? ` · ${open.entityId}` : ''}` : '—' },
                  { label: 'Edizione', value: open.edition ? (editionTitle.get(open.edition) ?? open.edition) : '—' },
                  { label: 'Motivo', value: open.reason ?? '—' },
                ]}
              />
              {(open.before != null || open.after != null) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['before', 'after'] as const).map((k) => (
                    <div key={k}>
                      <p className="mb-1 text-label font-medium">{k === 'before' ? 'Prima' : 'Dopo'}</p>
                      <pre className="max-h-64 overflow-auto rounded-lg bg-surface-sunken p-3 text-caption whitespace-pre-wrap">{open[k] == null ? '—' : JSON.stringify(open[k], null, 2)}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
