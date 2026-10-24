'use client';

import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Card, Checkbox, ConfirmDialog, EmptyState, Field, IconButton, Input, Select, Sheet, SheetContent, Switch, toast } from '@/components/ui';
import type { CheckinListRow } from '@/server/domain/checkin';
import { deleteCheckinListAction, saveCheckinListAction } from './actions';
import type { EditionInfo } from './CheckinClient';

export type ListOptions = { products: Array<{ id: string; name: string; active: boolean }>; sessions: Array<{ id: string; label: string }> };

/** Liste di check-in: nome, prodotti inclusi, data, ingresso multiplo. */
export function ListsPanel({ edition, lists, options, canEdit }: { edition: EditionInfo; lists: CheckinListRow[]; options: ListOptions; canEdit: boolean }) {
  const [editing, setEditing] = useState<CheckinListRow | 'new' | null>(null);
  const productName = (id: string) => options.products.find((p) => p.id === id)?.name ?? 'Prodotto eliminato';
  const sessionLabel = (id: string | null) => (id ? (options.sessions.find((s) => s.id === id)?.label ?? 'Data rinviata') : null);

  return (
    <>
      <Card
        flush
        title="Liste di check-in"
        description="Ogni scanner sceglie una lista: decide quali biglietti entrano da quel varco."
        actions={
          canEdit ? (
            <Button icon={Plus} size="sm" onClick={() => setEditing('new')}>
              Nuova lista
            </Button>
          ) : undefined
        }
      >
        {lists.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Nessuna lista ancora"
            description="Crea la lista “Ingresso” per far partire gli scanner."
            action={canEdit ? <Button onClick={() => setEditing('new')}>Crea la lista Ingresso</Button> : undefined}
          />
        ) : (
          <ul className="divide-y divide-border">
            {lists.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                <div className="min-w-48 flex-1">
                  <p className="font-medium text-fg">{l.name}</p>
                  <p className="text-label text-muted">{l.productIds.length ? l.productIds.map(productName).join(', ') : 'Tutti i biglietti'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">{sessionLabel(l.sessionId) ?? 'Tutte le date'}</Badge>
                  {l.allowMultiple && <Badge tone="info">Più ingressi</Badge>}
                  <Badge tone="neutral">{l.checkins} passaggi</Badge>
                </div>
                {canEdit && <IconButton icon={Pencil} label={`Modifica ${l.name}`} size="sm" variant="ghost" onClick={() => setEditing(l)} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {editing && <ListSheet edition={edition.slug} list={editing === 'new' ? null : editing} options={options} onClose={() => setEditing(null)} />}
    </>
  );
}

function ListSheet({ edition, list, options, onClose }: { edition: string; list: CheckinListRow | null; options: ListOptions; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(list?.name ?? (list ? '' : 'Ingresso'));
  const [productIds, setProductIds] = useState<string[]>(list?.productIds ?? []);
  const [sessionId, setSessionId] = useState<string>(list?.sessionId ?? 'all');
  const [allowMultiple, setAllowMultiple] = useState(list?.allowMultiple ?? false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function submit() {
    setBusy(true);
    setError('');
    const res = await saveCheckinListAction(edition, list?.id ?? null, { name, productIds, sessionId: sessionId === 'all' ? null : sessionId, allowMultiple });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(list ? 'Lista salvata' : 'Lista creata');
    onClose();
    router.refresh();
  }

  async function remove() {
    const res = await deleteCheckinListAction(edition, list!.id);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success('Lista eliminata');
    onClose();
    router.refresh();
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={list ? list.name : 'Nuova lista'}
        footer={
          <>
            {list && list.checkins === 0 && (
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
        <div className="flex flex-col gap-5">
          <Field label="Nome" help="Come lo vede il volontario sullo scanner, es. Ingresso o Laboratorio." required>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Biglietti che entrano" help="Nessuno selezionato: tutti i biglietti dell’edizione.">
            <div className="flex flex-col gap-2">
              {options.products.length === 0 && <p className="text-body text-muted">Nel catalogo non ci sono prodotti con biglietto.</p>}
              {options.products.map((p) => (
                <Checkbox
                  key={p.id}
                  label={p.active ? p.name : `${p.name} (non in vendita)`}
                  checked={productIds.includes(p.id)}
                  onCheckedChange={(on) => setProductIds((ids) => (on ? [...ids, p.id] : ids.filter((x) => x !== p.id)))}
                />
              ))}
            </div>
          </Field>
          {options.sessions.length > 0 && (
            <Field label="Data" help="Con una data, la lista accetta solo i biglietti di quel giorno (e delle date rinviate a quel giorno).">
              <Select value={sessionId} onValueChange={setSessionId} options={[{ value: 'all', label: 'Tutte le date (lo scanner sceglie il giorno)' }, ...options.sessions.map((s) => ({ value: s.id, label: s.label }))]} />
            </Field>
          )}
          <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} label="Più ingressi con lo stesso biglietto" description="Per uscite e rientri: lo scanner non dice mai “Già entrato”." />
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
      {list && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Eliminare “${list.name}”?`}
          description="La lista non ha ingressi registrati. Gli scanner che la usano dovranno sceglierne un’altra."
          confirmLabel="Elimina la lista"
          tone="danger"
          onConfirm={remove}
        />
      )}
    </Sheet>
  );
}
