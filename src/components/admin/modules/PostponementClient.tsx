'use client';

import { CloudRain } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SessionStatusBadge } from '@/components/admin/edition/common';
import { Button, Card, ConfirmDialog, Field, Select, Textarea, toast } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { postponeSessionAction } from '@/app/admin/e/[edition]/m/[module]/actions';

type SessionItem = { id: string; label: string; startsAt: string; status: string; recovery: string | null; postponedFrom: string[]; orders: number };

export function PostponementClient({ edition, sessions }: { edition: { slug: string; id: string; readOnly: boolean }; sessions: SessionItem[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<SessionItem | null>(null);
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('Maltempo');
  const candidates = sessions.filter((s) => target && s.id !== target.id && s.status !== 'postponed' && s.status !== 'cancelled');

  async function confirm() {
    if (!to) {
      toast.error('Scegli la data di recupero.');
      throw new Error('missing');
    }
    const res = await postponeSessionAction(edition.slug, { editionId: edition.id, sessionId: target!.id, toSessionId: to, reason: reason || null });
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    const { moved, failed } = res.data!;
    toast.success(`${target!.label} rinviata: ${moved.length} ordini spostati.`);
    if (failed.length) toast.error(`${failed.length} ordini non spostati (posti esauriti): ${failed.map((f) => f.code).join(', ')}`);
    setTarget(null);
    router.refresh();
  }

  return (
    <Card>
      <ul className="divide-y divide-border">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <div className="min-w-48 flex-1">
              <p className="font-medium text-fg">{s.label}</p>
              <p className="text-label text-muted">
                {formatDate(s.startsAt)} · {s.orders} ordini
              </p>
              {s.recovery && <p className="text-label text-warning">Rinviata a: {s.recovery}</p>}
              {s.postponedFrom.length > 0 && <p className="text-label text-muted">Recupero di: {s.postponedFrom.join(', ')}</p>}
            </div>
            <SessionStatusBadge status={s.status} />
            {!edition.readOnly && s.status !== 'postponed' && s.status !== 'cancelled' && (
              <Button size="sm" variant="secondary" icon={CloudRain} onClick={() => (setTarget(s), setTo(''))}>
                Rinvia
              </Button>
            )}
          </li>
        ))}
      </ul>
      {target && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setTarget(null)}
          title={`Rinviare ${target.label}?`}
          description={`I ${target.orders} ordini di questa giornata passano alla data di recupero. La giornata resta nello storico come “rinviata”.`}
          confirmLabel="Rinvia la giornata"
          tone="danger"
          onConfirm={confirm}
        >
          <Field label="Data di recupero" help="Se manca, creala prima in Date.">
            <Select value={to} onValueChange={setTo} placeholder="Scegli la data" options={candidates.map((s) => ({ value: s.id, label: s.label }))} />
          </Field>
          <Field label="Motivo" help="Resta nel registro attività.">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </Field>
        </ConfirmDialog>
      )}
    </Card>
  );
}
