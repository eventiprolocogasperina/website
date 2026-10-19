'use client';

import {
  Banknote,
  CalendarDays,
  Download,
  Mail,
  MoreHorizontal,
  Plus,
  Receipt,
  RotateCcw,
  ScanLine,
  Ticket,
  Undo2,
  User,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RowSelectionState, SortingState } from '@tanstack/react-table';
import {
  AnnotatedSection,
  Button,
  Card,
  ConfirmDialog,
  ContextualSaveBar,
  DataTable,
  dataTableColumns,
  DatePicker,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  FilterBar,
  IconButton,
  Input,
  KeyValue,
  MoneyInput,
  PageHeader,
  Select,
  Stat,
  StatusBadge,
  Switch,
  Tabs,
  Textarea,
  Timeline,
  TwoColumnLayout,
  BulkActionBar,
  toast,
  Badge,
  Avatar,
} from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { formatDateTime, formatRelative } from '@/lib/dates';
import { FAKE_ORDERS, type FakeOrder } from './fake-data';

const col = dataTableColumns<FakeOrder>();
const orderColumns = [
  col.accessor('code', {
    header: 'Ordine',
    meta: { label: 'Ordine' },
    size: 120,
    enableHiding: false,
    cell: (c) => <span className="font-medium">{c.getValue()}</span>,
  }),
  col.accessor('customer', {
    header: 'Cliente',
    meta: { label: 'Cliente' },
    size: 200,
    cell: (c) => (
      <span className="flex flex-col">
        <span>{c.getValue()}</span>
        <span className="text-caption text-muted">{c.row.original.email}</span>
      </span>
    ),
  }),
  col.accessor('session', { header: 'Sessione', meta: { label: 'Sessione' }, size: 160, enableSorting: false }),
  col.accessor('tickets', { header: 'Biglietti', meta: { label: 'Biglietti', align: 'right' }, size: 90 }),
  col.accessor('totalCents', {
    header: 'Totale',
    meta: { label: 'Totale', align: 'right' },
    size: 110,
    cell: (c) => formatMoney(c.getValue()),
  }),
  col.accessor('status', {
    header: 'Stato',
    meta: { label: 'Stato' },
    size: 150,
    cell: (c) => <StatusBadge status={c.getValue()} />,
  }),
  col.accessor('createdAt', {
    header: 'Creato',
    meta: { label: 'Creato' },
    size: 170,
    cell: (c) => <span className="text-muted">{formatDateTime(c.getValue())}</span>,
  }),
];

const PAGE_SIZE = 10;
const VIEWS = [
  { value: 'all', label: 'Tutti' },
  { value: 'paid', label: 'Pagati' },
  { value: 'pending', label: 'In attesa' },
  { value: 'refunded', label: 'Rimborsati' },
];

/** Modello Elenco (§11.1). Paginazione e ordinamento simulati "lato server". */
export function ListPageExample() {
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = FAKE_ORDERS.filter((o) => view === 'all' || o.status === view);
    if (q) rows = rows.filter((o) => `${o.code} ${o.customer} ${o.email}`.toLowerCase().includes(q));
    const s = sorting[0];
    if (s) {
      const key = s.id as keyof FakeOrder;
      rows = [...rows].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * (s.desc ? -1 : 1));
    }
    return rows;
  }, [view, search, sorting]);

  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selectedCount = Object.keys(selection).length;

  const simulateFetch = (fn: () => void) => {
    setLoading(true);
    setTimeout(() => {
      fn();
      setLoading(false);
    }, 350);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ordini"
        count={FAKE_ORDERS.length}
        primaryAction={<Button icon={Plus}>Crea ordine</Button>}
        secondaryActions={
          <Button variant="secondary" icon={Download}>
            Esporta CSV
          </Button>
        }
      />
      <Tabs
        aria-label="Viste salvate"
        value={view}
        onValueChange={(v) => simulateFetch(() => {
          setView(v);
          setPage(0);
        })}
        items={VIEWS.map((v) => ({ ...v, count: v.value === 'all' ? FAKE_ORDERS.length : FAKE_ORDERS.filter((o) => o.status === v.value).length }))}
      />
      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        searchPlaceholder="Cerca per codice, nome o email"
        chips={[{ key: 'ed', label: 'Edizione: Zuccaland 2026', onRemove: () => toast('Nella pagina vera il filtro si toglie dall’URL') }]}
      />
      <DataTable
        label="Ordini"
        data={pageRows}
        columns={orderColumns}
        getRowId={(o) => o.id}
        sorting={sorting}
        onSortingChange={(s) => simulateFetch(() => setSorting(s))}
        rowSelection={selection}
        onRowSelectionChange={setSelection}
        initialColumnVisibility={{ session: true }}
        loading={loading}
        onRowClick={(o) => toast(`Apre il dettaglio di ${o.code}`)}
        pagination={{
          pageIndex: page,
          pageSize: PAGE_SIZE,
          total: filtered.length,
          onPageChange: (p) => simulateFetch(() => setPage(p)),
        }}
        empty={
          <EmptyState
            icon={Receipt}
            title="Nessun ordine trovato"
            description="Prova a cambiare la ricerca o i filtri."
            action={
              <Button variant="secondary" onClick={() => setSearch('')}>
                Togli la ricerca
              </Button>
            }
          />
        }
      />
      <BulkActionBar
        count={selectedCount}
        noun={['ordine', 'ordini']}
        onClear={() => setSelection({})}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={Mail}>
              Reinvia biglietti
            </Button>
            <Button variant="danger" size="sm" icon={XCircle} onClick={() => setConfirmOpen(true)}>
              Annulla ordini
            </Button>
          </>
        }
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Annullare ${selectedCount} ordini?`}
        description="I biglietti diventano non validi e il cliente riceve un'email. I pagamenti non vengono rimborsati automaticamente."
        confirmLabel="Annulla ordini"
        cancelLabel="Torna indietro"
        confirmText="ANNULLA"
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 600));
          setSelection({});
          toast.success('Ordini annullati (simulazione)');
        }}
      />
    </div>
  );
}

/** Modello Dettaglio (§11.2). */
export function DetailPageExample() {
  const order = FAKE_ORDERS[3];
  const [refundOpen, setRefundOpen] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        back={{ href: '#list', label: 'Ordini' }}
        title={order.code}
        badge={<StatusBadge status="paid" />}
        subtitle={`${order.edition} · ${formatDateTime(order.createdAt)}`}
        primaryAction={
          <Button variant="secondary" icon={Undo2} onClick={() => setRefundOpen(true)}>
            Rimborsa ordine
          </Button>
        }
        secondaryActions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton icon={MoreHorizontal} label="Altre azioni" variant="secondary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem icon={Mail}>Reinvia biglietti</DropdownMenuItem>
              <DropdownMenuItem icon={CalendarDays}>Cambia data</DropdownMenuItem>
              <DropdownMenuItem icon={Download}>Scarica PDF</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem icon={XCircle} tone="danger">
                Annulla ordine
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <TwoColumnLayout
        main={
          <>
            <Card title="Biglietti" description={order.session} flush>
              <ul className="divide-y divide-border">
                {Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <Ticket size={16} className="text-muted" aria-hidden />
                    <span className="flex-1">{i === 0 ? 'Ingresso adulto' : i === 1 ? 'Ingresso bambino' : 'You Pick (zucca)'}</span>
                    <StatusBadge status={i === 2 ? 'void' : 'valid'} />
                    <span className="w-20 text-right tabular-nums">{formatMoney(i === 1 ? 800 : 1170)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Pagamento">
              <KeyValue
                items={[
                  { label: 'Metodo', value: 'Carta (Nexi)' },
                  { label: 'Subtotale', value: formatMoney(3140) },
                  { label: 'Sconto FAMIGLIA10', value: `−${formatMoney(314)}` },
                  { label: 'Totale pagato', value: <strong>{formatMoney(2826)}</strong> },
                ]}
              />
            </Card>
          </>
        }
        aside={
          <>
            <Card title="Cliente">
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={order.customer} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{order.customer}</p>
                  <p className="truncate text-label text-muted">{order.email}</p>
                </div>
              </div>
              <KeyValue layout="stacked" items={[{ label: 'Telefono', value: '+39 333 000 0000' }, { label: 'Ordini precedenti', value: '2' }]} />
            </Card>
            <Card title="Ingresso">
              <KeyValue layout="stacked" items={[{ label: 'Check-in', value: '1 di 2 biglietti validi' }, { label: 'Ultimo varco', value: 'Varco 1 · Scanner 2' }]} />
            </Card>
          </>
        }
        footer={
          <Card title="Cronologia">
            <Timeline
              items={[
                { id: '4', title: 'Biglietto You Pick annullato', time: formatRelative('2026-10-19T09:55:00Z', '2026-10-19T10:00:00Z'), actor: 'Niccolo', icon: XCircle, tone: 'danger' },
                { id: '3', title: 'Check-in ingresso adulto', time: formatRelative('2026-10-19T09:10:00Z', '2026-10-19T10:00:00Z'), actor: 'Scanner 2', icon: ScanLine, tone: 'info' },
                { id: '2', title: 'Pagamento ricevuto', time: formatDateTime(order.createdAt), actor: 'Nexi', icon: Banknote, tone: 'success', body: 'Transazione autorizzata, codice 0A1B2C.' },
                { id: '1', title: 'Ordine creato', time: formatDateTime(order.createdAt), actor: 'Sito', icon: Receipt },
              ]}
            />
          </Card>
        }
      />
      <ConfirmDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title={`Rimborsare l'ordine ${order.code}?`}
        description={`Restituisci ${formatMoney(2826)} sulla carta del cliente. Sopra 100 € va digitato il codice dell'ordine.`}
        confirmLabel={`Rimborsa ${formatMoney(2826)}`}
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 600));
          toast.success('Rimborso registrato (simulazione)');
        }}
      />
    </div>
  );
}

type FormState = { title: string; description: string; startsAt: string; priceCents: number | null; capacity: string; onlineSales: boolean; channel: string };
const INITIAL_FORM: FormState = {
  title: 'Zuccaland 2027',
  description: 'Il campo di zucche più grande della Calabria.',
  startsAt: '2027-10-09',
  priceCents: 1170,
  capacity: '800',
  onlineSales: true,
  channel: 'online_cassa',
};

/** Modello Modulo (§11.3) con barra di salvataggio contestuale. */
export function FormPageExample() {
  const [saved, setSaved] = useState(INITIAL_FORM);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const titleError = form.title.trim().length < 3 ? 'Il titolo deve avere almeno 3 caratteri.' : undefined;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col">
      <ContextualSaveBar
        dirty={dirty}
        saving={saving}
        saveDisabled={!!titleError}
        onDiscard={() => setForm(saved)}
        onSave={() => {
          setSaving(true);
          setTimeout(() => {
            setSaved(form);
            setSaving(false);
            toast.success('Edizione salvata (simulazione)');
          }, 500);
        }}
      />
      <PageHeader back={{ href: '#list', label: 'Edizioni' }} title="Modifica edizione" badge={<StatusBadge status="draft" />} />
      <AnnotatedSection title="Informazioni" description="Titolo e descrizione compaiono sulla pagina pubblica e nelle email.">
        <Card>
          <div className="flex flex-col gap-4">
            <Field label="Titolo" required error={titleError}>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="Descrizione breve" help="Al massimo 160 caratteri: è anche la descrizione per Google.">
              <Textarea value={form.description} maxLength={160} onChange={(e) => set('description', e.target.value)} />
            </Field>
          </div>
        </Card>
      </AnnotatedSection>
      <AnnotatedSection title="Date e prezzi" description="Il prezzo è quello del biglietto intero; riduzioni e prodotti si gestiscono nel catalogo.">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primo giorno">
              <DatePicker value={form.startsAt} onValueChange={(v) => set('startsAt', v)} />
            </Field>
            <Field label="Prezzo intero">
              <MoneyInput value={form.priceCents} onValueChange={(c) => set('priceCents', c)} />
            </Field>
            <Field label="Capienza per sessione" help="Persone, non biglietti.">
              <Input type="number" inputMode="numeric" min={0} value={form.capacity} onChange={(e) => set('capacity', e.target.value)} suffix="pers." />
            </Field>
            <Field label="Canali di vendita">
              <Select
                value={form.channel}
                onValueChange={(v) => set('channel', v)}
                options={[
                  { value: 'online_cassa', label: 'Online e cassa' },
                  { value: 'online', label: 'Solo online' },
                  { value: 'cassa', label: 'Solo cassa' },
                ]}
              />
            </Field>
          </div>
        </Card>
      </AnnotatedSection>
      <AnnotatedSection title="Vendite" description="Puoi chiudere le vendite online in qualsiasi momento: la cassa resta aperta.">
        <Card>
          <Switch label="Vendite online" description="Il pulsante Acquista compare sulla pagina dell'edizione." checked={form.onlineSales} onCheckedChange={(v) => set('onlineSales', v)} />
        </Card>
      </AnnotatedSection>
    </div>
  );
}

/** Modello Panoramica (§11.5). */
export function DashboardPageExample() {
  const paid = FAKE_ORDERS.filter((o) => o.status === 'paid');
  const revenue = paid.reduce((s, o) => s + o.totalCents, 0);
  const tickets = paid.reduce((s, o) => s + o.tickets, 0);
  const days = [42, 58, 31, 77, 64, 90, 112];
  const max = Math.max(...days);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Panoramica" subtitle="Zuccaland 2026 · in vendita fino al 25 ottobre" badge={<StatusBadge status="on_sale" />} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Incassato" value={formatMoney(revenue)} delta="+12%" trend="up" help="rispetto a ieri" />
        <Stat label="Biglietti venduti" value={tickets} delta="+38" trend="up" help="oggi" />
        <Stat label="Posti liberi sabato" value="214" help="su 800" />
        <Stat label="Rimborsi richiesti" value="3" delta="−2" trend="down" invertTrend help="da gestire" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Da fare" className="lg:col-span-1" flush>
          <ul className="divide-y divide-border">
            {[
              { icon: Undo2, text: '3 richieste di rimborso', action: 'Gestisci' },
              { icon: User, text: '2 ordini in attesa da più di 1 ora', action: 'Controlla' },
              { icon: CalendarDays, text: 'Sabato quasi esaurito', action: 'Apri quote' },
            ].map(({ icon: Icon, text, action }) => (
              <li key={text} className="flex items-center gap-3 px-4 py-3">
                <Icon size={16} className="text-muted" aria-hidden />
                <span className="flex-1">{text}</span>
                <Button variant="ghost" size="sm">
                  {action}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Vendite degli ultimi 7 giorni" description="Biglietti al giorno" className="lg:col-span-2">
          <div className="flex h-40 items-end gap-2" role="img" aria-label={`Biglietti al giorno: ${days.join(', ')}`}>
            {days.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-caption tabular-nums text-muted">{d}</span>
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${(d / max) * 100}%` }} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Attività recente" actions={<Badge tone="info">In tempo reale</Badge>}>
        <Timeline
          items={FAKE_ORDERS.slice(0, 4).map((o) => ({
            id: o.id,
            title: `${o.code} · ${formatMoney(o.totalCents)}`,
            time: formatRelative(o.createdAt, '2026-10-19T10:00:00Z'),
            actor: `${o.tickets} biglietti`,
            icon: o.status === 'refunded' ? RotateCcw : Receipt,
            tone: o.status === 'paid' ? 'success' : 'neutral',
          }))}
        />
      </Card>
    </div>
  );
}
