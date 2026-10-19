'use client';

import { Flag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, ConfirmDialog, Field, Textarea, toast } from '@/components/ui';
import { changeStatusAction } from './actions';

/** "Dichiara conclusa" dalla panoramica (§9): azione esplicita, confermata scrivendo il nome. */
export function DeclareConcluded({ edition, title }: { edition: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  async function confirm() {
    const res = await changeStatusAction(edition, 'concluded', reason || null);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    toast.success('Edizione conclusa: ora completa la checklist di chiusura');
    router.push(`/admin/e/${edition}/impostazioni`);
  }
  return (
    <>
      <Button variant="secondary" icon={Flag} onClick={() => setOpen(true)}>
        Dichiara conclusa
      </Button>
      {open && (
        <ConfirmDialog
          open
          onOpenChange={setOpen}
          title={`Dichiarare conclusa ${title}?`}
          description="Le vendite online, la cassa e lo scanner si chiudono e il sito mostra la pagina “Grazie”. Si apre la checklist di chiusura."
          confirmLabel="Dichiara conclusa"
          tone="danger"
          confirmText={title}
          onConfirm={confirm}
        >
          <Field label="Nota" help="Facoltativa, resta nel registro attività.">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </Field>
        </ConfirmDialog>
      )}
    </>
  );
}
