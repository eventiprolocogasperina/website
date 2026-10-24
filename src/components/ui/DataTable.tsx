'use client';

import {
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ColumnVisibilityState,
  type Header,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Columns3 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { cn, focusRing } from './cn';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from './DropdownMenu';
import { IconButton } from './IconButton';
import { Skeleton } from './Skeleton';

const features = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  columnResizingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, datetime: sortFn_datetime, basic: sortFn_basic },
});

export type DataTableFeatures = typeof features;

/** Definizione di colonna. In `meta.label` metti il nome leggibile (menu "Colonne"), in `meta.align` 'right' per gli importi. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- il tipo del valore varia per colonna
export type DataTableColumn<T extends RowData> = ColumnDef<DataTableFeatures, T, any>;

/** Helper tipizzato per scrivere le colonne: `const col = dataTableColumns<Order>()`. */
export function dataTableColumns<T extends RowData>() {
  return createColumnHelper<DataTableFeatures, T>();
}

type ColumnMeta = { label?: string; align?: 'left' | 'right' | 'center' };
const metaOf = (meta: unknown): ColumnMeta => (meta ?? {}) as ColumnMeta;

export type DataTablePagination = {
  /** Pagina corrente, da 0. */
  pageIndex: number;
  /** Righe per pagina (50 negli elenchi, §11.1). */
  pageSize: number;
  /** Totale delle righe sul server. */
  total: number;
  onPageChange: (pageIndex: number) => void;
};

export type DataTableProps<T extends RowData> = {
  /** Righe della pagina corrente. */
  data: T[];
  columns: DataTableColumn<T>[];
  /** Identificativo stabile della riga (serve per la selezione). */
  getRowId: (row: T) => string;
  /** Nome della tabella per i lettori di schermo ("Ordini"). */
  label: string;
  /** Ordinamento controllato. Con `onSortingChange` l'ordinamento lo fa il server (manuale). */
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  /** Selezione controllata: passa entrambe le props per mostrare le caselle di selezione. */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  /** Colonne nascoste all'inizio (id → false). */
  initialColumnVisibility?: ColumnVisibilityState;
  /** Paginazione lato server. */
  pagination?: DataTablePagination;
  /** Mostra lo skeleton con la forma della tabella. */
  loading?: boolean;
  /** Contenuto quando non ci sono righe (di solito un EmptyState). */
  empty?: ReactNode;
  /** Clic sulla riga (apre il dettaglio). Le celle con controlli devono fermare la propagazione. */
  onRowClick?: (row: T) => void;
  /** Righe da 36 px invece di 44 px. */
  compact?: boolean;
  /** Elementi in più nella barra sopra la tabella, a sinistra del menu colonne. */
  toolbar?: ReactNode;
  className?: string;
};

/**
 * Tabella generica dell'admin (§11.1): ordinamento, selezione multipla, colonne nascondibili e
 * ridimensionabili, stato vuoto, skeleton, paginazione lato server tramite props.
 */
export function DataTable<T extends RowData>({
  data,
  columns,
  getRowId,
  label,
  sorting,
  onSortingChange,
  rowSelection,
  onRowSelectionChange,
  initialColumnVisibility,
  pagination,
  loading,
  empty,
  onRowClick,
  compact,
  toolbar,
  className,
}: DataTableProps<T>) {
  const selectable = !!onRowSelectionChange;
  const [localSorting, setLocalSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(initialColumnVisibility ?? {});
  const [localSelection, setLocalSelection] = useState<RowSelectionState>({});

  const sortingState = sorting ?? localSorting;
  const selectionState = rowSelection ?? localSelection;

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => getRowId(row),
    manualSorting: !!onSortingChange,
    enableRowSelection: selectable,
    columnResizeMode: 'onChange',
    state: { sorting: sortingState, rowSelection: selectionState, columnVisibility },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sortingState) : updater;
      if (onSortingChange) onSortingChange(next);
      else setLocalSorting(next);
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function' ? updater(selectionState) : updater;
      if (onRowSelectionChange) onRowSelectionChange(next);
      else setLocalSelection(next);
    },
    onColumnVisibilityChange: setColumnVisibility,
  });

  const rows = table.getRowModel().rows;
  const leafColumns = table.getAllLeafColumns();
  const hideable = leafColumns.filter((c) => c.getCanHide());
  const visibleCount = table.getVisibleLeafColumns().length + (selectable ? 1 : 0);
  const rowHeight = compact ? 'h-9' : 'h-11';
  const allSelected = table.getIsAllPageRowsSelected();
  const someSelected = table.getIsSomePageRowsSelected() && !allSelected;

  function headerCell(header: Header<DataTableFeatures, T, unknown>) {
    const meta = metaOf(header.column.columnDef.meta);
    const sorted = header.column.getIsSorted();
    const canSort = header.column.getCanSort();
    const content = header.isPlaceholder ? null : <table.FlexRender header={header} />;
    return (
      <th
        key={header.id}
        scope="col"
        style={{ width: header.getSize() }}
        aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
        className={cn(
          'group relative h-9 border-b border-border bg-surface-sunken px-3 text-caption font-medium whitespace-nowrap text-muted',
          meta.align === 'right' ? 'text-right' : meta.align === 'center' ? 'text-center' : 'text-left',
        )}
      >
        {canSort ? (
          <button
            type="button"
            onClick={header.column.getToggleSortingHandler()}
            className={cn('inline-flex items-center gap-1 rounded hover:text-fg', meta.align === 'right' && 'flex-row-reverse', focusRing)}
          >
            {content}
            {sorted === 'asc' ? (
              <ArrowUp size={14} aria-hidden />
            ) : sorted === 'desc' ? (
              <ArrowDown size={14} aria-hidden />
            ) : (
              <ChevronsUpDown size={14} aria-hidden className="opacity-0 group-hover:opacity-60" />
            )}
          </button>
        ) : (
          content
        )}
        {header.column.getCanResize() && (
          <span
            role="separator"
            aria-orientation="vertical"
            aria-label={`Ridimensiona colonna ${meta.label ?? header.column.id}`}
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            onDoubleClick={() => header.column.resetSize()}
            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize touch-none select-none hover:bg-border-strong"
          />
        )}
      </th>
    );
  }

  const pageCount = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;
  const from = pagination ? pagination.pageIndex * pagination.pageSize + 1 : 1;
  const to = pagination ? Math.min(pagination.total, from + data.length - 1) : data.length;

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-surface shadow-sm', className)}>
      {(toolbar || hideable.length > 0) && (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <div className="flex flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          {hideable.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton icon={Columns3} label="Colonne visibili" size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Colonne visibili</DropdownMenuLabel>
                {hideable.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {metaOf(c.columnDef.meta).label ?? c.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table aria-label={label} aria-busy={loading || undefined} className="w-full border-collapse text-label" style={{ minWidth: table.getTotalSize() }}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {selectable && (
                  <th scope="col" className="h-9 w-10 border-b border-border bg-surface-sunken px-3">
                    <Checkbox
                      aria-label="Seleziona tutte le righe della pagina"
                      checked={someSelected ? 'indeterminate' : allSelected}
                      onCheckedChange={(v) => table.toggleAllPageRowsSelected(v)}
                    />
                  </th>
                )}
                {group.headers.map((h) => headerCell(h))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i} className={cn(rowHeight, 'border-b border-border last:border-0')}>
                  {Array.from({ length: visibleCount }, (_, j) => (
                    <td key={j} className="px-3">
                      <Skeleton className={cn('h-3.5', j === 0 ? 'w-4' : 'w-3/4')} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleCount}>{empty ?? <p className="px-3 py-10 text-center text-muted">Nessun risultato</p>}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  aria-selected={selectable ? row.getIsSelected() : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    rowHeight,
                    'border-b border-border last:border-0 aria-selected:bg-info-bg',
                    onRowClick && 'cursor-pointer hover:bg-surface-sunken',
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox aria-label="Seleziona riga" checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(v)} />
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => {
                    const meta = metaOf(cell.column.columnDef.meta);
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-3 text-fg',
                          meta.align === 'right' ? 'text-right tabular-nums' : meta.align === 'center' ? 'text-center' : 'text-left',
                        )}
                      >
                        <table.FlexRender cell={cell} />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && pagination.total > 0 && (
        <nav aria-label="Pagine" className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-label text-muted">
          <span className="whitespace-nowrap tabular-nums">
            {from}–{to} di {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              icon={ChevronLeft}
              disabled={pagination.pageIndex === 0}
              onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
              aria-label="Pagina precedente"
            >
              <span className="hidden sm:inline">Precedente</span>
            </Button>
            <span className="px-1 whitespace-nowrap tabular-nums">
              {pagination.pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              iconEnd={ChevronRight}
              disabled={pagination.pageIndex + 1 >= pageCount}
              onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
              aria-label="Pagina successiva"
            >
              <span className="hidden sm:inline">Successiva</span>
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
