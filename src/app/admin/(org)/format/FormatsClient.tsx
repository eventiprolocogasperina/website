'use client';

import { Layers, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { EditionDot } from '@/components/admin/shell/EditionDot';
import { Button, DataTable, dataTableColumns, EmptyState, Field, Input, PageHeader, RadioGroup, Sheet, SheetContent, Textarea, toast } from '@/components/ui';
import type { SeriesRow } from '@/server/domain/editions/series';
import { saveSeriesAction } from '../edizioni/actions';

const DOTS = [
  { value: 'orange', label: 'Arancione' },
  { value: 'blue', label: 'Blu' },
  { value: 'gold', label: 'Oro' },
  { value: 'gray', label: 'Grigio' },
] as const;

export function FormatsClient({ rows }: { rows: SeriesRow[] }) {
  const [editing, setEditing] = useState<SeriesRow | 'new' | null>(null);
  const columns = useMemo(() => {
    const col = dataTableColumns<SeriesRow>();
    return [
      col.accessor('name', {
        header: 'Format',
        meta: { label: 'Format' },
        size: 260,
        cell: (c) => (
          <span className="flex items-center gap-2">
            <EditionDot dot={c.row.original.dot} />
            <span className="font-medium text-fg">{c.getValue()}</span>
          </span>
        ),
      }),
      col.accessor('slug', { header: 'Slug', meta: { label: 'Slug' }, size: 200 }),
      col.accessor('landingPath', { header: 'Pagina pubblica', meta: { label: 'Pagina pubblica' }, size: 200, cell: (c) => c.getValue() ?? <span className="text-muted">Nessuna</span> }),
      col.accessor('editions', {
        header: 'Edizioni',
        meta: { label: 'Edizioni' },
        size: 100,
        cell: (c) => (
          <Link href={`/admin/edizioni?format=${c.row.original.slug}`} className="text-primary underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
            {c.getValue()}
          </Link>
        ),
      }),
    ];
  }, []);

  return (
    <>
      <PageHeader
        title="Format"
        count={rows.length}
        back={{ href: '/admin/edizioni', label: 'Edizioni' }}
        subtitle="Gli eventi che si ripetono ogni anno. Ogni format ha la sua pagina pubblica stabile e raccoglie le edizioni."
        primaryAction={
          <Button icon={Plus} onClick={() => setEditing('new')}>
            Nuovo format
          </Button>
        }
      />
      <DataTable
        label="Format"
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={setEditing}
        empty={<EmptyState icon={Layers} title="Nessun format ancora" description="Un format raccoglie le edizioni di un evento che si ripete, come Zuccaland." action={<Button onClick={() => setEditing('new')}>Nuovo format</Button>} />}
      />
      {editing && <FormatSheet row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function FormatSheet({ row, onClose }: { row: SeriesRow | null; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: row?.name ?? '',
    slug: row?.slug ?? '',
    description: row?.description ?? '',
    landingPath: row?.landingPath ?? '',
    dot: row?.dot ?? 'gray',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    setBusy(true);
    setError('');
    const res = await saveSeriesAction(row?.id ?? null, form);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(row ? 'Format salvato' : 'Format creato');
    onClose();
    router.refresh();
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={row ? row.name : 'Nuovo format'}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Annulla
            </Button>
            <Button onClick={submit} loading={busy}>
              Salva
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nome" required>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Es. Zuccaland" />
          </Field>
          <Field label="Slug" required help={row && row.editions > 0 ? 'Il format ha già delle edizioni: lo slug non si cambia più.' : 'Lettere minuscole, numeri e trattini.'}>
            <Input value={form.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} disabled={!!row && row.editions > 0} />
          </Field>
          <Field label="Descrizione">
            <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} />
          </Field>
          <Field label="Pagina pubblica" help="Il percorso stabile sul sito, es. /zuccaland. Vuoto se il format non ha una pagina sua.">
            <Input value={form.landingPath} onChange={(e) => set({ landingPath: e.target.value })} placeholder="/nome-del-format" />
          </Field>
          <Field label="Colore nell’admin">
            <RadioGroup
              orientation="horizontal"
              value={form.dot}
              onValueChange={(v) => set({ dot: v as typeof form.dot })}
              options={DOTS.map((d) => ({ value: d.value, label: <span className="flex items-center gap-1.5"><EditionDot dot={d.value} /> {d.label}</span> }))}
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
