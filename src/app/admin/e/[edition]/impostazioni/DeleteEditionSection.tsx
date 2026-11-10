'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnnotatedSection, Button, Card, ConfirmDialog, toast } from '@/components/ui';
import { deleteEditionAction } from '../actions';

/** Eliminazione dell'edizione: solo senza ordini, incassi, ingressi o costi; conferma scrivendo il titolo. */
export function DeleteEditionSection({ edition, title, blockers }: { edition: string; title: string; blockers: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function remove() {
    const res = await deleteEditionAction(edition);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error('stop');
    }
    toast.success('Edizione eliminata');
    router.push('/admin/edizioni');
  }

  return (
    <Card>
      <AnnotatedSection
        title="Elimina edizione"
        description="Toglie l’edizione con date, prodotti, quote e impostazioni. Non si può annullare. Resta una riga nel registro attività."
      >
        <div className="flex flex-col items-start gap-2">
          {blockers.length > 0 && (
            <p className="text-body text-muted">
              Non si può eliminare perché ha {blockers.join(', ')}. Per toglierla dal sito cambia lo stato qui sopra.
            </p>
          )}
          <Button variant="danger" disabled={blockers.length > 0} onClick={() => setOpen(true)}>
            Elimina edizione
          </Button>
        </div>
      </AnnotatedSection>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Eliminare “${title}”?`}
        description="L’edizione sparisce dall’admin e dal sito, con date, prodotti e impostazioni. Non si può annullare."
        confirmLabel="Elimina definitivamente"
        confirmText={title}
        onConfirm={remove}
      />
    </Card>
  );
}
