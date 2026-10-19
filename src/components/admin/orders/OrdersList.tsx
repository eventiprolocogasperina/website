'use client';

import { Download, Receipt } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, DataTable, EmptyState, Field, FilterBar, Select, Tabs } from '@/components/ui';
import { activeView, DEFAULT_ORDER_VIEWS, EMPTY_FILTERS, orderFiltersToQuery, parseOrderFilters, type OrderFilters, type OrderSort } from '@/lib/admin/order-filters';
import type { OrderEditionContext } from '@/server/domain/orders/admin-context';
import type { OrderListResult, ViewCounts } from '@/server/domain/orders/admin-list';
import type { SavedView } from '@/server/domain/views';
import { OrderBulkActions } from './OrderBulkActions';
import { OrderCard, orderColumns } from './order-columns';
import { orderFilterChips, OrderFiltersMenu } from './OrderFiltersMenu';
import { SavedViewsMenu } from './SavedViewsMenu';

// Elenco ordini parametrico (§11.1): globale (/admin/ordini) o di un'edizione (/admin/e/…/ordini).
// Filtri, ricerca, ordinamento e pagina stanno nell'URL; i dati li legge la pagina server.

const SORT_OPTIONS: Array<{ value: OrderSort; label: string }> = [
  { value: '-data', label: 'Più recenti' },
  { value: 'data', label: 'Meno recenti' },
  { value: '-totale', label: 'Totale più alto' },
  { value: 'totale', label: 'Totale più basso' },
  { value: 'codice', label: 'Codice A–Z' },
];
const SORT_BY_COLUMN: Record<string, [OrderSort, OrderSort]> = { createdAt: ['data', '-data'], totalCents: ['totale', '-totale'], code: ['codice', '-codice'] };

export type OrdersListProps = {
  result: OrderListResult;
  filters: OrderFilters;
  counts: ViewCounts;
  savedViews: SavedView[];
  canSaveViews: boolean;
  /** Vista di un'edizione: date, prodotti e permessi. Null nella vista globale. */
  context: OrderEditionContext | null;
  editions: Array<{ slug: string; title: string }> | null;
  /** Percorso del dettaglio: `${detailBase}/${code}`. */
  detailBase: string;
  exportHref: string;
};

export function OrdersList({ result, filters, counts, savedViews, canSaveViews, context, editions, detailBase, exportHref }: OrdersListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [selection, setSelection] = useState<Record<string, true>>({});
  const global = !context;
  const selected = Object.keys(selection).filter((k) => selection[k]);

  function go(next: Partial<OrderFilters>) {
    const page = 'page' in next ? next.page : 0;
    const q = orderFiltersToQuery({ ...filters, ...next, page });
    setSelection({});
    start(() => router.push(`${pathname}${q ? `?${q}` : ''}`, { scroll: false }));
  }

  const views = [...DEFAULT_ORDER_VIEWS, ...savedViews.map((v) => ({ key: v.id, name: v.name, query: v.query }))];
  const current = activeView(filters, views);
  const viewCount: Record<string, number> = { 'da-pagare': counts.pending, blacklist: counts.blacklist };
  const sessionOptions = context?.sessions.map((s) => ({ value: s.id, label: s.label })) ?? null;
  const editionOptions = editions?.map((e) => ({ value: e.slug, label: e.title })) ?? null;
  const chips = orderFilterChips(filters, go, { sessions: sessionOptions, editions: editionOptions });
  const hasFilters = chips.length > 0 || !!filters.q;
  const sortCol = Object.entries(SORT_BY_COLUMN).find(([, v]) => v.includes(filters.sort));
  const exportQuery = orderFiltersToQuery(filters, { page: false });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <Tabs
          aria-label="Viste"
          className="min-w-0 flex-1"
          items={[...views.map((v) => ({ value: v.key, label: v.name, count: viewCount[v.key] })), ...(current ? [] : [{ value: 'personalizzata', label: 'Filtri attuali' }])]}
          value={current?.key ?? 'personalizzata'}
          onValueChange={(key) => {
            const v = views.find((x) => x.key === key);
            if (v) go({ ...parseOrderFilters(new URLSearchParams(v.query)), q: filters.q, edition: global ? filters.edition : '' });
          }}
        />
        {canSaveViews && <SavedViewsMenu filters={filters} saved={savedViews} current={current?.key ?? null} onDeleted={() => router.refresh()} />}
      </div>

      <FilterBar
        search={filters.q}
        onSearchChange={(q) => go({ q })}
        searchPlaceholder="Cerca codice, nome, email o telefono"
        chips={chips}
        onClearAll={chips.length > 1 ? () => go({ ...EMPTY_FILTERS, q: filters.q }) : undefined}
        filters={<OrderFiltersMenu filters={filters} onChange={go} sessions={sessionOptions} editions={editionOptions} />}
        end={
          <>
            <Field label="Ordina" hideLabel>
              <Select className="w-44" value={filters.sort} onValueChange={(v) => go({ sort: v as OrderSort })} options={SORT_OPTIONS} />
            </Field>
            <Button variant="secondary" icon={Download} onClick={() => (window.location.href = `${exportHref}${exportQuery ? `?${exportQuery}` : ''}`)}>
              <span className="hidden sm:inline">Esporta CSV</span>
            </Button>
          </>
        }
      />

      {selected.length > 0 && (
        <OrderBulkActions ids={selected} context={context} exportHref={exportHref} onDone={() => setSelection({})} onClear={() => setSelection({})} />
      )}

      <div className="hidden md:block">
        <DataTable
          label="Ordini"
          data={result.rows}
          columns={orderColumns({ global })}
          getRowId={(r) => r.id}
          loading={pending}
          rowSelection={selection}
          onRowSelectionChange={setSelection}
          sorting={sortCol ? [{ id: sortCol[0], desc: sortCol[1][1] === filters.sort }] : []}
          onSortingChange={(s) => {
            const pair = s[0] && SORT_BY_COLUMN[s[0].id];
            go({ sort: pair ? pair[s[0].desc ? 1 : 0] : '-data' });
          }}
          onRowClick={(r) => router.push(`${detailBase}/${r.code}`)}
          pagination={{ pageIndex: result.page, pageSize: result.pageSize, total: result.total, onPageChange: (page) => go({ page }) }}
          empty={<ListEmpty hasFilters={hasFilters} onClear={() => go(EMPTY_FILTERS)} />}
        />
      </div>

      <div className="md:hidden">
        {result.rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface">
            <ListEmpty hasFilters={hasFilters} onClear={() => go(EMPTY_FILTERS)} />
          </div>
        ) : (
          <ul className={pending ? 'flex flex-col gap-2 opacity-60' : 'flex flex-col gap-2'} aria-label="Ordini">
            {result.rows.map((r) => (
              <OrderCard key={r.id} row={r} global={global} href={`${detailBase}/${r.code}`} selected={!!selection[r.id]} onSelect={(v) => setSelection((cur) => {
                  const next = { ...cur };
                  if (v) next[r.id] = true;
                  else delete next[r.id];
                  return next;
                })} />
            ))}
          </ul>
        )}
        <MobilePager page={result.page} pageSize={result.pageSize} total={result.total} onPage={(page) => go({ page })} />
      </div>
    </div>
  );
}

function ListEmpty({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return hasFilters ? (
    <EmptyState icon={Receipt} title="Nessun ordine con questi filtri" description="Prova a cambiare la ricerca o a togliere qualche filtro." action={<Button variant="secondary" onClick={onClear}>Togli i filtri</Button>} />
  ) : (
    <EmptyState icon={Receipt} title="Ancora nessun ordine" description="Gli ordini online, di cassa e creati qui compaiono in questo elenco." />
  );
}

function MobilePager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-3 flex items-center justify-between gap-2" aria-label="Pagine">
      <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
        Precedente
      </Button>
      <span className="text-label text-muted tabular-nums">{`Pagina ${page + 1} di ${pages}`}</span>
      <Button variant="secondary" size="sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
        Successiva
      </Button>
    </nav>
  );
}
