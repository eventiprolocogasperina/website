'use client';

import { Check, Download, FileText, Minus, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button, ButtonLink, DataTable, dataTableColumns, EmptyState, Field, FilterBar, Select, StatusBadge } from '@/components/ui';
import { formatDateTime, romeTime } from '@/lib/dates';
import type { AttendeeFilters, AttendeeRow } from '@/server/domain/orders/attendees';

// Partecipanti di un'edizione: un biglietto per riga con risposte, data e check-in (§10.3).

const ANY = '__tutti';
const col = dataTableColumns<AttendeeRow>();

function Entered({ r }: { r: AttendeeRow }) {
  if (r.ticketStatus === 'void') return <StatusBadge status="void" />;
  return r.checkedInAt ? (
    <span className="inline-flex items-center gap-1 text-success" title={formatDateTime(r.checkedInAt)}>
      <Check size={14} aria-hidden /> {`${romeTime(r.checkedInAt)}${r.checkinList ? ` · ${r.checkinList}` : ''}`}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted">
      <Minus size={14} aria-hidden /> non entrato
    </span>
  );
}

export function AttendeesList({ rows, total, page, pageSize, filters, sessions, base }: { rows: AttendeeRow[]; total: number; page: number; pageSize: number; filters: AttendeeFilters; sessions: Array<{ id: string; label: string }>; base: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function go(next: Partial<AttendeeFilters>) {
    const f = { ...filters, page: 0, ...next };
    const p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.session) p.set('sessione', f.session);
    if (f.checkin) p.set('ingresso', f.checkin);
    if (f.page) p.set('pagina', String(f.page + 1));
    start(() => router.push(`${pathname}${p.size ? `?${p}` : ''}`, { scroll: false }));
  }

  const orderHref = (code: string) => `${base}/ordini/${code}`;
  const columns = [
    col.accessor('name', { header: 'Partecipante', meta: { label: 'Partecipante' }, size: 220, enableSorting: false, cell: (c) => <span className="font-medium">{c.getValue() ?? '—'}</span> }),
    col.accessor('orderCode', { header: 'Ordine', meta: { label: 'Ordine' }, size: 120, enableSorting: false, cell: (c) => <Link className="font-mono text-primary hover:underline" href={orderHref(c.getValue())}>{c.getValue()}</Link> }),
    col.accessor('productName', { header: 'Biglietto', meta: { label: 'Biglietto' }, size: 150, enableSorting: false }),
    col.accessor('sessionLabel', { header: 'Sessione', meta: { label: 'Sessione' }, size: 130, enableSorting: false, cell: (c) => c.getValue() ?? '—' }),
    col.accessor('answers', { header: 'Risposte', meta: { label: 'Risposte' }, size: 260, enableSorting: false, cell: (c) => <span className="text-label">{c.getValue() || '—'}</span> }),
    col.accessor('phone', { header: 'Telefono', meta: { label: 'Telefono' }, size: 140, enableSorting: false, cell: (c) => c.getValue() ?? '—' }),
    col.display({ id: 'checkin', header: 'Ingresso', meta: { label: 'Ingresso' }, size: 170, cell: (c) => <Entered r={c.row.original} /> }),
    col.accessor('orderStatus', { header: 'Pagamento', meta: { label: 'Pagamento' }, size: 120, enableSorting: false, cell: (c) => <StatusBadge status={c.getValue()} /> }),
  ];
  const exportQuery = (formato: 'csv' | 'pdf') => `${base}/partecipanti/esporta?formato=${formato}${filters.session ? `&sessione=${filters.session}` : ''}`;
  const empty = (
    <EmptyState
      icon={Users}
      title={filters.q || filters.session || filters.checkin ? 'Nessun partecipante con questi filtri' : 'Ancora nessun partecipante'}
      description={filters.q || filters.session || filters.checkin ? 'Prova a togliere qualche filtro.' : 'I biglietti degli ordini pagati o in attesa compaiono qui.'}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        search={filters.q}
        onSearchChange={(q) => go({ q })}
        searchPlaceholder="Cerca nome, codice, email o telefono"
        filters={
          <>
            <Field label="Sessione" hideLabel>
              <Select className="w-44" value={filters.session || ANY} onValueChange={(v) => go({ session: v === ANY ? '' : v })} options={[{ value: ANY, label: 'Tutte le date' }, ...sessions.map((s) => ({ value: s.id, label: s.label }))]} />
            </Field>
            <Field label="Ingresso" hideLabel>
              <Select
                className="w-40"
                value={filters.checkin || ANY}
                onValueChange={(v) => go({ checkin: v === ANY ? '' : (v as 'in' | 'out') })}
                options={[
                  { value: ANY, label: 'Tutti' },
                  { value: 'in', label: 'Entrati' },
                  { value: 'out', label: 'Non entrati' },
                ]}
              />
            </Field>
          </>
        }
        end={
          <>
            <ButtonLink variant="secondary" icon={FileText} href={exportQuery('pdf')} prefetch={false}>
              Registro PDF
            </ButtonLink>
            <ButtonLink variant="secondary" icon={Download} href={exportQuery('csv')} prefetch={false}>
              CSV
            </ButtonLink>
          </>
        }
      />
      <div className="hidden md:block">
        <DataTable label="Partecipanti" data={rows} columns={columns} getRowId={(r) => r.ticketId} loading={pending} compact empty={empty} pagination={{ pageIndex: page, pageSize, total, onPageChange: (p) => go({ page: p }) }} />
      </div>
      <div className="md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface">{empty}</div>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Partecipanti">
            {rows.map((r) => (
              <li key={r.ticketId} className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-3 shadow-sm">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{r.name ?? '—'}</span>
                  <Link className="font-mono text-label text-primary" href={orderHref(r.orderCode)}>{r.orderCode}</Link>
                </span>
                <span className="text-caption text-muted">{[r.productName, r.sessionLabel, r.phone].filter(Boolean).join(' · ')}</span>
                {r.answers && <span className="text-label">{r.answers}</span>}
                <span className="flex items-center justify-between text-label">
                  <Entered r={r} />
                  <StatusBadge status={r.orderStatus} />
                </span>
              </li>
            ))}
          </ul>
        )}
        {total > pageSize && (
          <nav className="mt-3 flex items-center justify-between" aria-label="Pagine">
            <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => go({ page: page - 1 })}>Precedente</Button>
            <span className="text-label text-muted tabular-nums">{`${page + 1} di ${Math.ceil(total / pageSize)}`}</span>
            <Button size="sm" variant="secondary" disabled={(page + 1) * pageSize >= total} onClick={() => go({ page: page + 1 })}>Successiva</Button>
          </nav>
        )}
      </div>
    </div>
  );
}
