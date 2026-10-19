'use client';

import { Bookmark, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveViewAction, deleteViewAction } from '@/app/admin/(org)/ordini/actions';
import { Button, Dialog, DialogContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Field, IconButton, Input, toast } from '@/components/ui';
import { DEFAULT_ORDER_VIEWS, viewQuery, type OrderFilters } from '@/lib/admin/order-filters';
import type { SavedView } from '@/server/domain/views';

/**
 * Viste salvate dell'utente (§11.1): i filtri attuali con un nome, come tab in più. Stanno nel
 * database per utente, così si ritrovano su ogni dispositivo; quelle predefinite sono nel codice.
 */
export function SavedViewsMenu({ filters, saved, current, onDeleted }: { filters: OrderFilters; saved: SavedView[]; current: string | null; onDeleted: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const canSave = !current && viewQuery(filters) !== '' && !DEFAULT_ORDER_VIEWS.some((v) => v.query === viewQuery(filters));

  async function save() {
    setBusy(true);
    const res = await saveViewAction(name, viewQuery(filters));
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Vista salvata');
    setOpen(false);
    setName('');
    router.refresh();
  }

  async function remove(v: SavedView) {
    const res = await deleteViewAction(v.id);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Vista “${v.name}” eliminata`);
    onDeleted();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton icon={Bookmark} label="Viste salvate" variant="ghost" className="mb-1" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem disabled={!canSave} onSelect={() => setOpen(true)}>
            Salva i filtri attuali come vista
          </DropdownMenuItem>
          {saved.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Le tue viste</DropdownMenuLabel>
              {saved.map((v) => (
                <DropdownMenuItem key={v.id} icon={Trash2} onSelect={() => remove(v)}>
                  {`Elimina “${v.name}”`}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Salva vista"
          description="La vista compare come scheda sopra l’elenco. La vedi solo tu."
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Annulla
              </Button>
              <Button loading={busy} disabled={name.trim().length < 2} onClick={save}>
                Salva
              </Button>
            </>
          }
        >
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Es. Contanti da incassare" autoFocus />
          </Field>
        </DialogContent>
      </Dialog>
    </>
  );
}
