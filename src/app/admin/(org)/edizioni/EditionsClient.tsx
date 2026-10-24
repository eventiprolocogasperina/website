'use client';

import { BookOpen, CalendarDays, CalendarRange, Layers, Plus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useTransition } from 'react';
import { EditionDot } from '@/components/admin/shell/EditionDot';
import {
  ButtonLink,
  DataTable,
  dataTableColumns,
  EmptyState,
  FilterBar,
  PageHeader,
  Select,
  STATUS_META,
  StatusBadge,
} from '@/components/ui';
import { formatDate } from '@/lib/dates';
import type { EditionListRow } from '@/server/domain/editions';

type Filters = { q: string; stato: string; format: string };
type FormatOption = { id: string; slug: string; name: string };

const ALL = '__tutti';
const STATUSES = ['draft', 'published', 'on_sale', 'sold_out', 'live', 'concluded', 'archived', 'suspended'] as const;

export function EditionsClient({ rows, formats, canCreate, canCalendar, filters }: { rows: EditionListRow[]; formats: FormatOption[]; canCreate: boolean; canCalendar: boolean; filters: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function go(next: Partial<Filters>) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams(Object.entries(merged).filter(([, v]) => v));
    start(() =>
      router.replace(`${pathname}${params.size ? `?${params}` : ''}`, {
        scroll: false,
      }),
    );
  }

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!filters.stato || r.status === filters.stato) &&
        (!filters.format || (r.format ?? 'singoli') === filters.format) &&
        (!q || `${r.title} ${r.slug} ${r.location ?? ''}`.toLowerCase().includes(q)),
    );
  }, [rows, filters]);

  const columns = useMemo(() => {
    const col = dataTableColumns<EditionListRow>();
    return [
      col.accessor('title', {
        header: 'Edizione',
        meta: { label: 'Edizione' },
        size: 300,
        cell: (c) => (
          <span className="flex min-w-0 items-center gap-2">
            <EditionDot dot={c.row.original.dot} />
            <span className="min-w-0">
              <span className="block truncate font-medium text-fg">{c.getValue()}</span>
              <span className="block truncate text-caption text-muted">{c.row.original.slug}</span>
            </span>
          </span>
        ),
      }),
      col.accessor('formatName', {
        header: 'Format',
        meta: { label: 'Format' },
        size: 180,
        cell: (c) => c.getValue() ?? <span className="text-muted">Evento singolo</span>,
      }),
      col.accessor('status', {
        header: 'Stato',
        meta: { label: 'Stato' },
        size: 130,
        cell: (c) => <StatusBadge status={c.getValue()} />,
      }),
      col.accessor('startsOn', {
        header: 'Inizio',
        meta: { label: 'Inizio' },
        size: 150,
        sortFn: 'text',
        cell: (c) => (c.getValue() ? <span className="tabular-nums">{formatDate(c.getValue()!, 'short')}</span> : <span className="text-muted">Da definire</span>),
      }),
      col.accessor('sessions', {
        header: 'Date',
        meta: { label: 'Date' },
        size: 80,
        cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
      }),
      col.accessor('products', {
        header: 'Prodotti',
        meta: { label: 'Prodotti' },
        size: 90,
        cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
      }),
    ];
  }, []);

  const chips = [
    ...(filters.stato
      ? [
          {
            key: 'stato',
            label: `Stato: ${STATUS_META[filters.stato as keyof typeof STATUS_META]?.label ?? filters.stato}`,
            onRemove: () => go({ stato: '' }),
          },
        ]
      : []),
    ...(filters.format
      ? [
          {
            key: 'format',
            label: `Format: ${formats.find((f) => f.slug === filters.format)?.name ?? 'Eventi singoli'}`,
            onRemove: () => go({ format: '' }),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Edizioni"
        count={rows.length}
        subtitle="Ogni edizione ha le sue date, il suo catalogo e il suo stato. I format raccolgono le edizioni dello stesso evento negli anni."
        primaryAction={
          canCreate ? (
            <ButtonLink href="/admin/edizioni/nuova" icon={Plus}>
              Nuova edizione
            </ButtonLink>
          ) : undefined
        }
        secondaryActions={
          <>
            <ButtonLink href="/admin/guida" variant="secondary" icon={BookOpen}>
              Guida
            </ButtonLink>
            <ButtonLink href="/admin/format" variant="secondary" icon={Layers}>
              Format
            </ButtonLink>
            {canCalendar && (
              <ButtonLink href="/admin/edizioni/calendario" variant="secondary" icon={CalendarRange}>
                Schede del calendario
              </ButtonLink>
            )}
          </>
        }
      />
      <FilterBar
        search={filters.q}
        onSearchChange={(q) => go({ q })}
        searchPlaceholder="Cerca per titolo, slug o luogo"
        chips={chips}
        onClearAll={() => go({ q: '', stato: '', format: '' })}
        filters={
          <>
            <div className="w-44">
              <Select
                aria-label="Stato"
                value={filters.stato || ALL}
                onValueChange={(v) => go({ stato: v === ALL ? '' : v })}
                options={[
                  { value: ALL, label: 'Tutti gli stati' },
                  ...STATUSES.map((s) => ({
                    value: s,
                    label: STATUS_META[s].label,
                  })),
                ]}
              />
            </div>
            <div className="w-48">
              <Select
                aria-label="Format"
                value={filters.format || ALL}
                onValueChange={(v) => go({ format: v === ALL ? '' : v })}
                options={[{ value: ALL, label: 'Tutti i format' }, ...formats.map((f) => ({ value: f.slug, label: f.name })), { value: 'singoli', label: 'Eventi singoli' }]}
              />
            </div>
          </>
        }
      />
      <DataTable
        label="Edizioni"
        data={visible}
        columns={columns}
        getRowId={(r) => r.id}
        loading={pending}
        onRowClick={(r) => router.push(`/admin/e/${r.slug}`)}
        empty={
          rows.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nessuna edizione ancora"
              description="Crea la prima edizione, oppure importa quelle di oggi con lo script di backfill."
              action={canCreate ? <ButtonLink href="/admin/edizioni/nuova">Nuova edizione</ButtonLink> : undefined}
            />
          ) : (
            <EmptyState icon={CalendarDays} title="Nessuna edizione con questi filtri" description="Prova a togliere qualche filtro." />
          )
        }
      />
    </>
  );
}
