'use client';

import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArchivedNotice, FillBar, LegacySalesNotice, Notice, SESSION_STATUS, SessionStatusBadge } from '@/components/admin/edition/common';
import { Button, Card, ConfirmDialog, DatePicker, EmptyState, Field, IconButton, Input, PageHeader, Select, Sheet, SheetContent, toast } from '@/components/ui';
import { formatDate, romeDateKey, romeTime } from '@/lib/dates';
import { deleteSessionAction, saveSessionAction } from '../actions';

type SessionItem = { id: string; label: string; startsAt: string; endsAt: string | null; capacity: number | null; status: string; used: number; recovery: string | null };
type EditionInfo = { slug: string; title: string; readOnly: boolean; legacy: boolean };

export function SessionsClient({ edition, sessions, hasCapacityProducts }: { edition: EditionInfo; sessions: SessionItem[]; hasCapacityProducts: boolean }) {
  const [editing, setEditing] = useState<SessionItem | 'new' | null>(null);
  const capacityTotal = sessions.reduce((n, s) => n + (s.capacity ?? 0), 0);
  const usedTotal = sessions.reduce((n, s) => n + s.used, 0);

  return (
    <>
      <PageHeader
        title="Date e capienze"
        count={sessions.length}
        subtitle="Quando si svolge l’edizione e quanti ingressi ci sono per ogni data."
        primaryAction={
          !edition.readOnly ? (
            <Button icon={Plus} onClick={() => setEditing('new')}>
              Aggiungi data
            </Button>
          ) : undefined
        }
      />
      {edition.readOnly ? <ArchivedNotice /> : edition.legacy && <LegacySalesNotice />}
      {!hasCapacityProducts && sessions.some((s) => s.capacity !== null) && (
        <Notice>La capienza delle date conta i biglietti d’ingresso che richiedono una data. Nel catalogo non ce n’è ancora nessuno.</Notice>
      )}
      <Card
        flush
        title="Date"
        description={sessions.length > 0 ? `${usedTotal} venduti${capacityTotal ? ` su ${capacityTotal} posti` : ''}` : undefined}
      >
        {sessions.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nessuna data ancora"
            description="Aggiungi il primo giorno dell’edizione, con l’orario di apertura e i posti disponibili."
            action={!edition.readOnly ? <Button onClick={() => setEditing('new')}>Aggiungi data</Button> : undefined}
          />
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                <div className="min-w-48 flex-1">
                  <p className="font-medium text-fg">{s.label}</p>
                  <p className="text-label text-muted">
                    {formatDate(s.startsAt)} · {romeTime(s.startsAt)}
                    {s.endsAt ? `–${romeTime(s.endsAt)}` : ''}
                  </p>
                  {s.recovery && <p className="text-label text-warning">Recupero: {s.recovery}</p>}
                </div>
                <SessionStatusBadge status={s.status} />
                <FillBar used={s.used} size={s.capacity} className="w-48" />
                {!edition.readOnly && <IconButton icon={Pencil} label={`Modifica ${s.label}`} size="sm" variant="ghost" onClick={() => setEditing(s)} />}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {editing && <SessionSheet edition={edition.slug} session={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function SessionSheet({ edition, session, onClose }: { edition: string; session: SessionItem | null; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    label: session?.label ?? '',
    date: session ? romeDateKey(session.startsAt) : '',
    startTime: session ? romeTime(session.startsAt) : '10:00',
    endTime: session?.endsAt ? romeTime(session.endsAt) : '',
    capacity: session?.capacity?.toString() ?? '',
    status: session?.status ?? 'open',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  // Etichetta proposta dalla data ("Dom 25 ott"), finché non la si scrive a mano.
  const suggested = form.date ? new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${form.date}T12:00:00Z`)).replace(/\./g, '') : '';
  const label = form.label || (suggested ? suggested.charAt(0).toUpperCase() + suggested.slice(1) : '');

  async function submit() {
    setBusy(true);
    setError('');
    const res = await saveSessionAction(edition, session?.id ?? null, {
      label,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime || null,
      capacity: form.capacity === '' ? null : Number(form.capacity),
      status: form.status as 'open',
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(session ? 'Data salvata' : 'Data aggiunta');
    onClose();
    router.refresh();
  }

  async function remove() {
    const res = await deleteSessionAction(edition, session!.id);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success('Data eliminata');
    onClose();
    router.refresh();
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={session ? session.label : 'Nuova data'}
        footer={
          <>
            {session && (
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
          <Field label="Giorno" required>
            <DatePicker value={form.date} onValueChange={(date) => set({ date })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Apertura" required>
              <Input type="time" value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} />
            </Field>
            <Field label="Chiusura">
              <Input type="time" value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} />
            </Field>
          </div>
          <Field label="Etichetta" help="Come appare a chi compra e nei biglietti, es. Dom 25 ott.">
            <Input value={label} onChange={(e) => set({ label: e.target.value })} />
          </Field>
          <Field label="Capienza" help="Biglietti d’ingresso disponibili per questa data. Vuoto: nessun limite.">
            <Input inputMode="numeric" value={form.capacity} onChange={(e) => set({ capacity: e.target.value.replace(/\D/g, '') })} suffix="posti" className="w-40" />
          </Field>
          <Field label="Stato">
            <Select value={form.status} onValueChange={(status) => set({ status })} options={Object.entries(SESSION_STATUS).map(([value, m]) => ({ value, label: m.label }))} />
          </Field>
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
      {session && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Eliminare ${session.label}?`}
          description="La data sparisce dall’edizione, insieme alle quote legate solo a lei. Se ha già delle vendite non si può eliminare: chiudila invece."
          confirmLabel="Elimina la data"
          tone="danger"
          onConfirm={remove}
        />
      )}
    </Sheet>
  );
}
