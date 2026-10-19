'use client';

import { CalendarDays, CalendarRange, Copy, Layers, Plus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { EditionDot } from '@/components/admin/shell/EditionDot';
import {
  Button,
  ButtonLink,
  DataTable,
  dataTableColumns,
  EmptyState,
  Field,
  FilterBar,
  Input,
  PageHeader,
  RadioGroup,
  Select,
  Sheet,
  SheetContent,
  STATUS_META,
  StatusBadge,
  toast,
} from '@/components/ui';
import { formatDate } from '@/lib/dates';
import type { EditionListRow } from '@/server/domain/editions';
import { createEditionAction } from './actions';

type Filters = { q: string; stato: string; format: string };
type FormatOption = { id: string; slug: string; name: string };

const ALL = '__tutti';
const STATUSES = ['draft', 'published', 'on_sale', 'sold_out', 'live', 'concluded', 'archived', 'suspended'] as const;

export function EditionsClient({ rows, formats, canCreate, canCalendar, filters }: { rows: EditionListRow[]; formats: FormatOption[]; canCreate: boolean; canCalendar: boolean; filters: Filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState(false);

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
            <Button icon={Plus} onClick={() => setCreating(true)}>
              Nuova edizione
            </Button>
          ) : undefined
        }
        secondaryActions={
          <>
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
              action={canCreate ? <Button onClick={() => setCreating(true)}>Nuova edizione</Button> : undefined}
            />
          ) : (
            <EmptyState icon={CalendarDays} title="Nessuna edizione con questi filtri" description="Prova a togliere qualche filtro." />
          )
        }
      />
      {creating && <NewEditionSheet onClose={() => setCreating(false)} formats={formats} editions={rows} />}
    </>
  );
}

type Mode = 'empty' | 'series' | 'duplicate';

const slugFrom = (title: string) =>
  title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function NewEditionSheet({ onClose, formats, editions }: { onClose: () => void; formats: FormatOption[]; editions: EditionListRow[] }) {
  const router = useRouter();
  const nextYear = new Date().getFullYear() + 1;
  const [mode, setMode] = useState<Mode>(formats.length ? 'series' : 'empty');
  const [seriesId, setSeriesId] = useState(formats[0]?.id ?? '');
  const [source, setSource] = useState(editions.find((e) => e.format)?.slug ?? editions[0]?.slug ?? '');
  const [year, setYear] = useState(String(nextYear));
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Titolo proposto dal format o dall'edizione da duplicare, finché la persona non lo cambia.
  const suggested =
    mode === 'series'
      ? `${formats.find((f) => f.id === seriesId)?.name ?? ''} ${year}`.trim()
      : mode === 'duplicate'
        ? (editions.find((e) => e.slug === source)?.title ?? '').replace(/20\d\d/, year)
        : '';
  const shownTitle = title || suggested;
  const shownSlug = slugTouched ? slug : slugFrom(shownTitle);

  async function submit() {
    setBusy(true);
    setError('');
    const base = { title: shownTitle, slug: shownSlug };
    const res = await createEditionAction(mode === 'duplicate' ? { mode, ...base, source, year: Number(year) } : mode === 'series' ? { mode, ...base, seriesId } : { mode, ...base, seriesId: null });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(mode === 'duplicate' ? 'Edizione duplicata' : 'Edizione creata');
    router.push(`/admin/e/${res.data!.slug}/impostazioni`);
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title="Nuova edizione"
        description="Nasce in bozza: non compare sul sito finché non la pubblichi."
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Annulla
            </Button>
            <Button onClick={submit} loading={busy} icon={mode === 'duplicate' ? Copy : Plus}>
              {mode === 'duplicate' ? 'Duplica' : 'Crea edizione'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <RadioGroup
            aria-label="Come vuoi crearla"
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
            options={[
              {
                value: 'series',
                label: 'Da un format',
                description: 'Nuova edizione di un evento che si ripete, con gli stessi moduli.',
                disabled: !formats.length,
              },
              {
                value: 'duplicate',
                label: 'Duplicando un’edizione',
                description: 'Copia date, prodotti, quote e moduli. Le date si spostano allo stesso giorno della settimana.',
                disabled: !editions.length,
              },
              {
                value: 'empty',
                label: 'Vuota',
                description: 'Un evento singolo, da configurare da zero.',
              },
            ]}
          />
          {mode === 'series' && (
            <Field label="Format" required>
              <Select value={seriesId} onValueChange={setSeriesId} options={formats.map((f) => ({ value: f.id, label: f.name }))} />
            </Field>
          )}
          {mode === 'duplicate' && (
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field label="Edizione da copiare" required>
                <Select
                  value={source}
                  onValueChange={setSource}
                  options={editions.map((e) => ({
                    value: e.slug,
                    label: e.title,
                  }))}
                />
              </Field>
              <Field label="Anno" required>
                <Input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              </Field>
            </div>
          )}
          {mode === 'series' && (
            <Field label="Anno" required>
              <Input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} className="w-32" />
            </Field>
          )}
          <Field label="Titolo" required>
            <Input value={shownTitle} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Zuccaland 2027" />
          </Field>
          <Field label="Slug" help="Compare negli indirizzi dell’admin e, più avanti, del sito. Non si può cambiare dopo." required>
            <Input
              value={shownSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
            />
          </Field>
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
