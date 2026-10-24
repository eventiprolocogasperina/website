'use client';

import { useState } from 'react';
import { addNoteAction } from '@/app/admin/(org)/ordini/actions';
import { Button, Card, Textarea, toast } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import type { OrderDetail } from '@/server/domain/orders/admin-detail';

/** Note interne dell'ordine: le vede solo lo staff, non si modificano né si cancellano. */
export function NotesCard({ orderId, notes, legacyNotes, canEdit }: { orderId: string; notes: OrderDetail['notes']; legacyNotes: string | null; canEdit: boolean }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    const res = await addNoteAction(orderId, body);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    setBody('');
    toast.success('Nota aggiunta');
  }
  return (
    <Card title="Note interne">
      <div className="flex flex-col gap-3">
        {canEdit && (
          <div className="flex flex-col gap-2">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={2000} placeholder="Aggiungi una nota per lo staff" aria-label="Nuova nota interna" />
            <Button size="sm" variant="secondary" className="self-end" loading={busy} disabled={body.trim().length < 2} onClick={add}>
              Aggiungi nota
            </Button>
          </div>
        )}
        {notes.length === 0 && !legacyNotes && <p className="text-body text-muted">Nessuna nota.</p>}
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="flex flex-col gap-0.5">
              <span className="text-body whitespace-pre-line">{n.body}</span>
              <span className="text-caption text-muted">{`${n.author} · ${formatDateTime(n.createdAt)}`}</span>
            </li>
          ))}
          {legacyNotes && (
            <li className="flex flex-col gap-0.5">
              <span className="text-body whitespace-pre-line break-words">{legacyNotes}</span>
              <span className="text-caption text-muted">Note dell’ordine nel sistema di prima</span>
            </li>
          )}
        </ul>
      </div>
    </Card>
  );
}
