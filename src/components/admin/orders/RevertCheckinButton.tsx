'use client';

import { Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { revertCheckinAction } from '@/app/admin/(org)/ordini/actions';
import { Button, ConfirmDialog, toast } from '@/components/ui';

/** "Annulla ingresso" con conferma: il biglietto torna valido, il passaggio resta nel registro. */
export function RevertCheckinButton({ checkinId, label, from }: { checkinId: string; label: string; from: 'ordine' | 'partecipanti' }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button variant="ghost" size="sm" icon={Undo2} onClick={() => setOpen(true)}>
        Annulla ingresso
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Annullare l’ingresso di ${label}?`}
        description="Il biglietto torna valido e si potrà scansionare di nuovo. Il passaggio non si cancella: resta nel registro con il tuo nome."
        confirmLabel="Annulla l’ingresso"
        cancelLabel="Lascia com’è"
        onConfirm={async () => {
          const res = await revertCheckinAction(checkinId, from);
          if (!res.ok) {
            toast.error(res.error);
            throw new Error(res.error);
          }
          toast.success('Ingresso annullato');
          router.refresh();
        }}
      />
    </>
  );
}
