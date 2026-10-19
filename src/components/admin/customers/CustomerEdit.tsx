'use client';

import { Merge } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { mergeCustomersAction, searchCustomersAction, updateCustomerAction } from '@/app/admin/(org)/clienti/actions';
import { Button, Card, Checkbox, ConfirmDialog, Field, Input, Textarea, toast } from '@/components/ui';
import type { CustomerDetail } from '@/server/domain/customers/admin';

/** Dati modificabili del cliente: nome, telefono, note interne; il consenso si può solo revocare. */
export function CustomerEditCard({ c }: { c: CustomerDetail['customer'] }) {
  const [form, setForm] = useState({ name: c.name ?? '', phone: c.phone ?? '', notes: c.notes ?? '', revokeConsent: false });
  const [busy, setBusy] = useState(false);
  const dirty = form.name !== (c.name ?? '') || form.phone !== (c.phone ?? '') || form.notes !== (c.notes ?? '') || form.revokeConsent;
  async function save() {
    setBusy(true);
    const res = await updateCustomerAction(c.id, form);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Cliente aggiornato');
    setForm((f) => ({ ...f, revokeConsent: false }));
  }
  return (
    <Card
      title="Dati e note"
      footer={
        <Button className="ml-auto" loading={busy} disabled={!dirty} onClick={save}>
          Salva
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nome e cognome">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Telefono">
          <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Note interne" help="Le vede solo lo staff.">
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} maxLength={5000} />
        </Field>
        {c.marketingConsent && (
          <Checkbox
            checked={form.revokeConsent}
            onCheckedChange={(v) => setForm({ ...form, revokeConsent: v })}
            label="Revoca il consenso alla newsletter"
            description="Su richiesta del cliente. Il consenso lo può ridare solo lui, da un nuovo ordine."
          />
        )}
      </div>
    </Card>
  );
}

/**
 * Unione dei doppioni: scegli l'altro cliente (stessa persona con un'altra email), conferma scrivendo
 * la sua email. Quello scelto sparisce dall'elenco e i suoi ordini compaiono qui; nessun ordine cambia.
 */
export function MergeCard({ targetId }: { targetId: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Array<{ id: string; name: string | null; email: string; orders: number }>>([]);
  const [source, setSource] = useState<{ id: string; email: string } | null>(null);
  async function search() {
    const res = await searchCustomersAction(q);
    if (!res.ok) return toast.error(res.error);
    setFound(res.data!.filter((r) => r.id !== targetId));
  }
  return (
    <Card title="Unisci un doppione" description="Se la stessa persona ha ordinato con due email, unisci l’altra scheda a questa.">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Cerca nome o email" aria-label="Cerca il doppione" />
          <Button variant="secondary" onClick={search} disabled={q.trim().length < 2}>
            Cerca
          </Button>
        </div>
        {found.length > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {found.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{f.name ?? 'Senza nome'}</span>
                  <span className="block truncate text-caption text-muted">{`${f.email} · ${f.orders} ordini`}</span>
                </span>
                <Button size="sm" variant="secondary" icon={Merge} onClick={() => setSource({ id: f.id, email: f.email })}>
                  Unisci qui
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {source && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setSource(null)}
          title="Unire i due clienti?"
          description={`La scheda di ${source.email} sparisce dall’elenco e i suoi ordini compaiono in questa. Non si torna indietro dall’admin.`}
          confirmLabel="Unisci"
          tone="danger"
          confirmText={source.email}
          onConfirm={async () => {
            const res = await mergeCustomersAction(source.id, targetId, source.email);
            if (!res.ok) return void toast.error(res.error);
            toast.success('Clienti uniti');
            setSource(null);
            setFound([]);
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
