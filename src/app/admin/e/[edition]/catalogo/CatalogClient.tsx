'use client';

import { Gauge, Pencil, Plus, Tag, Ticket, Trash2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArchivedNotice, FillBar, LegacySalesNotice } from '@/components/admin/edition/common';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DatePicker,
  EmptyState,
  Field,
  IconButton,
  Input,
  MoneyInput,
  PageHeader,
  RadioGroup,
  Select,
  Sheet,
  SheetContent,
  Switch,
  Tabs,
  Textarea,
  toast,
} from '@/components/ui';
import { formatDate, romeDateKey } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { deleteDiscountAction, deleteProductAction, deleteQuotaAction, saveDiscountAction, saveProductAction, saveQuotaAction } from '../actions';

type Kind = 'ticket' | 'addon' | 'food' | 'drink' | 'merch' | 'donation' | 'service';
type Channel = 'online' | 'pos' | 'paylink' | 'invite';
export type ProductItem = {
  id: string;
  kind: Kind;
  name: string;
  description: string | null;
  icon: string | null;
  priceCents: number;
  channels: string[];
  requiresSession: boolean;
  issuesTicket: boolean;
  department: string | null;
  active: boolean;
  minPerOrder: number | null;
  maxPerOrder: number | null;
};
export type QuotaItem = { id: string; name: string; size: number; sessionId: string | null; productIds: string[]; used: number };
export type DiscountItem = {
  id: string;
  code: string;
  kind: 'percent' | 'fixed';
  value: number;
  maxUses: number | null;
  usedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  appliesToProductIds: string[];
  active: boolean;
};
export type CatalogData = { products: ProductItem[]; sessions: Array<{ id: string; label: string }>; quotas: QuotaItem[]; discounts: DiscountItem[] };
type EditionInfo = { slug: string; readOnly: boolean; legacy: boolean };

const KINDS: Array<{ value: Kind; label: string; plural: string }> = [
  { value: 'ticket', label: 'Biglietto', plural: 'Biglietti' },
  { value: 'addon', label: 'Extra', plural: 'Extra' },
  { value: 'food', label: 'Cibo', plural: 'Cibo' },
  { value: 'drink', label: 'Bevanda', plural: 'Bevande' },
  { value: 'merch', label: 'Merchandising', plural: 'Merchandising' },
  { value: 'donation', label: 'Donazione', plural: 'Donazioni' },
  { value: 'service', label: 'Servizio', plural: 'Servizi' },
];
const CHANNELS: Array<{ value: Channel; label: string }> = [
  { value: 'online', label: 'Online' },
  { value: 'pos', label: 'Cassa' },
  { value: 'paylink', label: 'Link di pagamento' },
  { value: 'invite', label: 'Inviti' },
];
const channelLabel = (c: string) => CHANNELS.find((x) => x.value === c)?.label ?? c;

function useSaver() {
  const router = useRouter();
  return async (fn: () => Promise<{ ok: boolean; error?: string }>, done: string, onDone: () => void, setError: (e: string) => void) => {
    const res = await fn();
    if (!res.ok) return setError(res.error ?? 'Si è verificato un errore.');
    toast.success(done);
    onDone();
    router.refresh();
  };
}

export function CatalogClient({ edition, data, initialTab }: { edition: EditionInfo; data: CatalogData; initialTab: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState(initialTab);
  const [product, setProduct] = useState<ProductItem | 'new' | null>(null);
  const [quota, setQuota] = useState<QuotaItem | 'new' | null>(null);
  const [discount, setDiscount] = useState<DiscountItem | 'new' | null>(null);
  const ro = edition.readOnly;

  const add = tab === 'quote' ? () => setQuota('new') : tab === 'sconti' ? () => setDiscount('new') : () => setProduct('new');
  const addLabel = tab === 'quote' ? 'Nuova quota' : tab === 'sconti' ? 'Nuovo codice' : 'Nuovo prodotto';

  return (
    <>
      <PageHeader
        title="Catalogo"
        subtitle="Biglietti e prodotti dell’edizione, con prezzi, canali di vendita, posti e codici sconto."
        primaryAction={
          !ro ? (
            <Button icon={Plus} onClick={add} disabled={tab === 'quote' && data.products.length === 0}>
              {addLabel}
            </Button>
          ) : undefined
        }
      />
      {ro ? <ArchivedNotice /> : edition.legacy && <LegacySalesNotice />}
      <Tabs
        aria-label="Sezioni del catalogo"
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          router.replace(`${pathname}${v === 'prodotti' ? '' : `?vista=${v}`}`, { scroll: false });
        }}
        items={[
          { value: 'prodotti', label: 'Prodotti', count: data.products.length, content: <ProductsTab data={data} readOnly={ro} onEdit={setProduct} /> },
          { value: 'quote', label: 'Quote', count: data.quotas.length, content: <QuotasTab data={data} readOnly={ro} onEdit={setQuota} onAdd={() => setQuota('new')} /> },
          { value: 'sconti', label: 'Codici sconto', count: data.discounts.length, content: <DiscountsTab data={data} readOnly={ro} onEdit={setDiscount} onAdd={() => setDiscount('new')} /> },
        ]}
      />
      {product && <ProductSheet edition={edition.slug} item={product === 'new' ? null : product} quotas={data.quotas} onClose={() => setProduct(null)} />}
      {quota && <QuotaSheet edition={edition.slug} item={quota === 'new' ? null : quota} data={data} onClose={() => setQuota(null)} />}
      {discount && <DiscountSheet edition={edition.slug} item={discount === 'new' ? null : discount} products={data.products} onClose={() => setDiscount(null)} />}
    </>
  );
}

// ─── Prodotti ────────────────────────────────────────────────────────────────

function ProductsTab({ data, readOnly, onEdit }: { data: CatalogData; readOnly: boolean; onEdit: (p: ProductItem | 'new') => void }) {
  if (!data.products.length) {
    return (
      <Card flush>
        <EmptyState
          icon={Ticket}
          title="Nessun prodotto ancora"
          description="Aggiungi il biglietto d’ingresso, gli extra o i prodotti della cassa."
          action={!readOnly ? <Button onClick={() => onEdit('new')}>Nuovo prodotto</Button> : undefined}
        />
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {KINDS.filter((k) => data.products.some((p) => p.kind === k.value)).map((k) => (
        <Card key={k.value} flush title={k.plural}>
          <ul className="divide-y divide-border">
            {data.products
              .filter((p) => p.kind === k.value)
              .map((p) => {
                const pq = data.quotas.filter((q) => q.productIds.includes(p.id));
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <span className="w-6 text-center text-section" aria-hidden>
                      {p.icon && /\p{Extended_Pictographic}/u.test(p.icon) ? p.icon : ''}
                    </span>
                    <div className="min-w-48 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-fg">
                        {p.name}
                        {!p.active && <Badge>Non in vendita</Badge>}
                      </p>
                      <p className="text-label text-muted">
                        {[p.requiresSession && 'con data', p.issuesTicket && 'emette biglietto', p.department && `reparto ${p.department}`].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.channels.map((c) => (
                        <Badge key={c} tone="info">
                          {channelLabel(c)}
                        </Badge>
                      ))}
                      {pq.map((q) => (
                        <Badge key={q.id} tone="warning">
                          {q.name}
                        </Badge>
                      ))}
                    </div>
                    <span className="w-24 text-right font-medium tabular-nums">{formatMoney(p.priceCents)}</span>
                    {!readOnly && <IconButton icon={Pencil} label={`Modifica ${p.name}`} size="sm" variant="ghost" onClick={() => onEdit(p)} />}
                  </li>
                );
              })}
          </ul>
        </Card>
      ))}
    </div>
  );
}

const intOrNull = (v: string) => (v === '' ? null : Number(v));

function ProductSheet({ edition, item, quotas, onClose }: { edition: string; item: ProductItem | null; quotas: QuotaItem[]; onClose: () => void }) {
  const save = useSaver();
  const [form, setForm] = useState({
    kind: item?.kind ?? ('ticket' as Kind),
    name: item?.name ?? '',
    description: item?.description ?? '',
    icon: item?.icon ?? '',
    priceCents: item?.priceCents ?? (null as number | null),
    channels: (item?.channels ?? ['online']) as Channel[],
    requiresSession: item?.requiresSession ?? true,
    issuesTicket: item?.issuesTicket ?? true,
    department: item?.department ?? '',
    active: item?.active ?? true,
    minPerOrder: item?.minPerOrder?.toString() ?? '',
    maxPerOrder: item?.maxPerOrder?.toString() ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const linked = item ? quotas.filter((q) => q.productIds.includes(item.id)) : [];

  async function submit() {
    setBusy(true);
    setError('');
    await save(
      () =>
        saveProductAction(edition, item?.id ?? null, {
          ...form,
          priceCents: form.priceCents ?? Number.NaN,
          minPerOrder: intOrNull(form.minPerOrder),
          maxPerOrder: intOrNull(form.maxPerOrder),
        }),
      item ? 'Prodotto salvato' : 'Prodotto aggiunto',
      onClose,
      setError,
    );
    setBusy(false);
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={item ? item.name : 'Nuovo prodotto'}
        size="lg"
        footer={
          <>
            {item && (
              <Button variant="ghost" icon={Trash2} className="mr-auto text-danger" onClick={() => setConfirmDelete(true)}>
                Elimina
              </Button>
            )}
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
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <Field label="Nome" required>
              <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Es. Ingresso ordinario" />
            </Field>
            <Field label="Prezzo" required help="0 per i prodotti gratuiti.">
              <MoneyInput value={form.priceCents} onValueChange={(priceCents) => set({ priceCents })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <Field label="Tipo">
              <Select
                value={form.kind}
                onValueChange={(v) => {
                  const kind = v as Kind;
                  // Biglietti ed extra di solito hanno una data e un QR; cibo e bevande no.
                  set({ kind, ...(item ? {} : { requiresSession: kind === 'ticket' || kind === 'addon', issuesTicket: kind === 'ticket' || kind === 'addon' }) });
                }}
                options={KINDS.map((k) => ({ value: k.value, label: k.label }))}
              />
            </Field>
            <Field label="Icona" help="Un’emoji.">
              <Input value={form.icon} onChange={(e) => set({ icon: e.target.value })} maxLength={8} />
            </Field>
          </div>
          <Field label="Descrizione">
            <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2} />
          </Field>
          <Field label="Dove si vende">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {CHANNELS.map((c) => (
                <Checkbox
                  key={c.value}
                  label={c.label}
                  checked={form.channels.includes(c.value)}
                  onCheckedChange={(on) => set({ channels: on ? [...form.channels, c.value] : form.channels.filter((x) => x !== c.value) })}
                />
              ))}
            </div>
          </Field>
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <Switch label="Richiede una data" description="Chi compra sceglie il giorno. I biglietti con data contano nella capienza della data." checked={form.requiresSession} onCheckedChange={(requiresSession) => set({ requiresSession })} />
            <Switch label="Emette un biglietto con QR" description="Da mostrare allo scanner all’ingresso." checked={form.issuesTicket} onCheckedChange={(issuesTicket) => set({ issuesTicket })} />
            <Switch label="In vendita" description="Spento: resta nel catalogo ma non si può comprare." checked={form.active} onCheckedChange={(active) => set({ active })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Reparto" help="Per le comande della cassa.">
              <Input value={form.department} onChange={(e) => set({ department: e.target.value })} />
            </Field>
            <Field label="Minimo per ordine">
              <Input inputMode="numeric" value={form.minPerOrder} onChange={(e) => set({ minPerOrder: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label="Massimo per ordine">
              <Input inputMode="numeric" value={form.maxPerOrder} onChange={(e) => set({ maxPerOrder: e.target.value.replace(/\D/g, '') })} />
            </Field>
          </div>
          {linked.length > 0 && (
            <p className="text-label text-muted">
              Quote collegate: {linked.map((q) => `${q.name} (${q.size} posti)`).join(', ')}. Si modificano dalla scheda Quote.
            </p>
          )}
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
      {item && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Eliminare ${item.name}?`}
          description="Il prodotto sparisce dal catalogo e dalle quote. Se è già stato venduto non si può eliminare: toglilo dalla vendita invece."
          confirmLabel="Elimina il prodotto"
          tone="danger"
          onConfirm={async () => {
            const res = await deleteProductAction(edition, item.id);
            if (!res.ok) {
              toast.error(res.error);
              throw new Error(res.error);
            }
            toast.success('Prodotto eliminato');
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

// ─── Quote ───────────────────────────────────────────────────────────────────

function QuotasTab({ data, readOnly, onEdit, onAdd }: { data: CatalogData; readOnly: boolean; onEdit: (q: QuotaItem) => void; onAdd: () => void }) {
  const name = (id: string) => data.products.find((p) => p.id === id)?.name ?? '—';
  return (
    <Card flush description="Una quota è un numero di posti condiviso tra più prodotti, per esempio “60 posti al laboratorio del sabato”. Un prodotto vende fino a esaurire la quota più piccola a cui appartiene.">
      {data.quotas.length === 0 ? (
        <EmptyState
          icon={Gauge}
          title="Nessuna quota"
          description={data.products.length ? 'La capienza delle date si imposta in Date e capienze. Qui aggiungi limiti in più, come i posti di un laboratorio o le scorte della cassa.' : 'Aggiungi prima un prodotto.'}
          action={!readOnly && data.products.length ? <Button onClick={onAdd}>Nuova quota</Button> : undefined}
        />
      ) : (
        <ul className="divide-y divide-border">
          {data.quotas.map((q) => (
            <li key={q.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <div className="min-w-48 flex-1">
                <p className="font-medium text-fg">{q.name}</p>
                <p className="text-label text-muted">
                  {q.sessionId ? (data.sessions.find((s) => s.id === q.sessionId)?.label ?? 'Data') : 'Tutte le date'} · {q.productIds.map(name).join(', ')}
                </p>
              </div>
              <FillBar used={q.used} size={q.size} className="w-48" />
              {!readOnly && <IconButton icon={Pencil} label={`Modifica ${q.name}`} size="sm" variant="ghost" onClick={() => onEdit(q)} />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const ALL_SESSIONS = '__tutte';

function QuotaSheet({ edition, item, data, onClose }: { edition: string; item: QuotaItem | null; data: CatalogData; onClose: () => void }) {
  const save = useSaver();
  const [form, setForm] = useState({ name: item?.name ?? '', size: item?.size.toString() ?? '', sessionId: item?.sessionId ?? ALL_SESSIONS, productIds: item?.productIds ?? [] });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    setBusy(true);
    setError('');
    await save(
      () => saveQuotaAction(edition, item?.id ?? null, { name: form.name, size: form.size === '' ? Number.NaN : Number(form.size), sessionId: form.sessionId === ALL_SESSIONS ? null : form.sessionId, productIds: form.productIds }),
      item ? 'Quota salvata' : 'Quota aggiunta',
      onClose,
      setError,
    );
    setBusy(false);
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={item ? item.name : 'Nuova quota'}
        footer={
          <>
            {item && (
              <Button variant="ghost" icon={Trash2} className="mr-auto text-danger" onClick={() => setConfirmDelete(true)}>
                Elimina
              </Button>
            )}
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
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Es. Laboratorio sabato" />
          </Field>
          <Field label="Posti" required>
            <Input inputMode="numeric" value={form.size} onChange={(e) => set({ size: e.target.value.replace(/\D/g, '') })} className="w-32" suffix="posti" />
          </Field>
          <Field label="Data" help="Una data: conta solo le vendite di quel giorno. Tutte le date: un limite unico per l’edizione.">
            <Select value={form.sessionId} onValueChange={(sessionId) => set({ sessionId })} options={[{ value: ALL_SESSIONS, label: 'Tutte le date' }, ...data.sessions.map((s) => ({ value: s.id, label: s.label }))]} />
          </Field>
          <Field label="Prodotti che usano questi posti" required>
            <div className="flex flex-col gap-2">
              {data.products.map((p) => (
                <Checkbox
                  key={p.id}
                  label={`${p.name} · ${formatMoney(p.priceCents)}`}
                  checked={form.productIds.includes(p.id)}
                  onCheckedChange={(on) => set({ productIds: on ? [...form.productIds, p.id] : form.productIds.filter((x) => x !== p.id) })}
                />
              ))}
            </div>
          </Field>
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
      {item && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Eliminare la quota ${item.name}?`}
          description="I prodotti restano, ma senza questo limite di posti."
          confirmLabel="Elimina la quota"
          tone="danger"
          onConfirm={async () => {
            const res = await deleteQuotaAction(edition, item.id);
            if (!res.ok) {
              toast.error(res.error);
              throw new Error(res.error);
            }
            toast.success('Quota eliminata');
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

// ─── Codici sconto ───────────────────────────────────────────────────────────

const discountValue = (d: Pick<DiscountItem, 'kind' | 'value'>) => (d.kind === 'percent' ? `${d.value}%` : formatMoney(d.value));

function DiscountsTab({ data, readOnly, onEdit, onAdd }: { data: CatalogData; readOnly: boolean; onEdit: (d: DiscountItem) => void; onAdd: () => void }) {
  return (
    <Card flush description="Codici validi solo per questa edizione. I codici per tutte le edizioni sono in Vendite › Sconti.">
      {data.discounts.length === 0 ? (
        <EmptyState icon={Tag} title="Nessun codice sconto" action={!readOnly ? <Button onClick={onAdd}>Nuovo codice</Button> : undefined} />
      ) : (
        <ul className="divide-y divide-border">
          {data.discounts.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <div className="min-w-48 flex-1">
                <p className="flex items-center gap-2 font-mono font-medium text-fg">
                  {d.code}
                  {!d.active && <Badge>Disattivato</Badge>}
                </p>
                <p className="text-label text-muted">
                  {d.validFrom || d.validUntil ? `Valido ${d.validFrom ? `dal ${formatDate(d.validFrom, 'short')} ` : ''}${d.validUntil ? `al ${formatDate(d.validUntil, 'short')}` : ''}` : 'Sempre valido'}
                  {d.appliesToProductIds.length ? ` · su ${d.appliesToProductIds.length} prodotti` : ' · su tutto'}
                </p>
              </div>
              <span className="font-medium tabular-nums">−{discountValue(d)}</span>
              <span className="w-28 text-right text-label text-muted tabular-nums">
                {d.usedCount}
                {d.maxUses ? ` / ${d.maxUses}` : ''} usi
              </span>
              {!readOnly && <IconButton icon={Pencil} label={`Modifica ${d.code}`} size="sm" variant="ghost" onClick={() => onEdit(d)} />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DiscountSheet({ edition, item, products, onClose }: { edition: string; item: DiscountItem | null; products: ProductItem[]; onClose: () => void }) {
  const save = useSaver();
  const [form, setForm] = useState({
    code: item?.code ?? '',
    kind: item?.kind ?? ('percent' as 'percent' | 'fixed'),
    percent: item?.kind === 'percent' ? String(item.value) : '',
    cents: item?.kind === 'fixed' ? item.value : (null as number | null),
    maxUses: item?.maxUses?.toString() ?? '',
    validFrom: item?.validFrom ? romeDateKey(item.validFrom) : '',
    validUntil: item?.validUntil ? romeDateKey(item.validUntil) : '',
    appliesToProductIds: item?.appliesToProductIds ?? [],
    active: item?.active ?? true,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    setBusy(true);
    setError('');
    await save(
      () =>
        saveDiscountAction(edition, item?.id ?? null, {
          code: form.code,
          kind: form.kind,
          value: form.kind === 'percent' ? Number(form.percent || Number.NaN) : (form.cents ?? Number.NaN),
          maxUses: intOrNull(form.maxUses),
          validFrom: form.validFrom || null,
          validUntil: form.validUntil || null,
          appliesToProductIds: form.appliesToProductIds,
          active: form.active,
        }),
      item ? 'Codice salvato' : 'Codice creato',
      onClose,
      setError,
    );
    setBusy(false);
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={item ? item.code : 'Nuovo codice sconto'}
        footer={
          <>
            {item && item.usedCount === 0 && (
              <Button variant="ghost" icon={Trash2} className="mr-auto text-danger" onClick={() => setConfirmDelete(true)}>
                Elimina
              </Button>
            )}
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
          <Field label="Codice" required help={item && item.usedCount > 0 ? 'Già usato: non si può rinominare.' : 'Lettere maiuscole e numeri, es. FAMIGLIA10.'}>
            <Input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} disabled={!!item && item.usedCount > 0} className="font-mono" />
          </Field>
          <RadioGroup
            aria-label="Tipo di sconto"
            orientation="horizontal"
            value={form.kind}
            onValueChange={(v) => set({ kind: v as 'percent' | 'fixed' })}
            options={[
              { value: 'percent', label: 'Percentuale' },
              { value: 'fixed', label: 'Importo fisso' },
            ]}
          />
          {form.kind === 'percent' ? (
            <Field label="Sconto" required>
              <Input inputMode="numeric" value={form.percent} onChange={(e) => set({ percent: e.target.value.replace(/\D/g, '').slice(0, 3) })} suffix="%" className="w-32" />
            </Field>
          ) : (
            <Field label="Sconto" required>
              <MoneyInput value={form.cents} onValueChange={(cents) => set({ cents })} className="w-40" />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valido dal">
              <DatePicker value={form.validFrom} onValueChange={(validFrom) => set({ validFrom })} />
            </Field>
            <Field label="Valido fino al">
              <DatePicker value={form.validUntil} onValueChange={(validUntil) => set({ validUntil })} />
            </Field>
          </div>
          <Field label="Utilizzi massimi" help="Vuoto: senza limite.">
            <Input inputMode="numeric" value={form.maxUses} onChange={(e) => set({ maxUses: e.target.value.replace(/\D/g, '') })} className="w-32" />
          </Field>
          <Field label="Vale su" help="Nessun prodotto scelto: vale su tutto il carrello.">
            <div className="flex flex-col gap-2">
              {products.map((p) => (
                <Checkbox
                  key={p.id}
                  label={p.name}
                  checked={form.appliesToProductIds.includes(p.id)}
                  onCheckedChange={(on) => set({ appliesToProductIds: on ? [...form.appliesToProductIds, p.id] : form.appliesToProductIds.filter((x) => x !== p.id) })}
                />
              ))}
            </div>
          </Field>
          <Switch label="Attivo" checked={form.active} onCheckedChange={(active) => set({ active })} />
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
      {item && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Eliminare il codice ${item.code}?`}
          description="Il codice non è mai stato usato: sparisce senza lasciare traccia negli ordini."
          confirmLabel="Elimina il codice"
          tone="danger"
          onConfirm={async () => {
            const res = await deleteDiscountAction(edition, item.id);
            if (!res.ok) {
              toast.error(res.error);
              throw new Error(res.error);
            }
            toast.success('Codice eliminato');
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}
