'use client';

import { PackageOpen } from 'lucide-react';
import { useState } from 'react';
import { Button, Card, Checkbox, EmptyState, RadioGroup, Select, toast } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { saveRegisterAction } from './actions';
import type { AdminRegister, CashAdminData } from './types';

/**
 * Prodotti per cassa: ogni cassa vende tutti i prodotti del catalogo con il canale Cassa, oppure solo
 * quelli scelti qui (es. il Bar solo le bevande). Prezzi e scorte restano quelli del catalogo.
 */
export function RegisterProductsTab({ data }: { data: CashAdminData }) {
  const [registerId, setRegisterId] = useState(data.registers[0]?.id ?? '');
  const register = data.registers.find((r) => r.id === registerId);

  if (data.products.length === 0) {
    return (
      <Card className="mt-4">
        <EmptyState
          icon={PackageOpen}
          title="Nessun prodotto vendibile in cassa"
          description="Nel Catalogo attiva il canale “Cassa” sui prodotti da vendere alle casse. I prodotti legati a una data non si vendono in cassa."
        />
      </Card>
    );
  }
  if (!register) {
    return (
      <Card className="mt-4">
        <EmptyState icon={PackageOpen} title="Crea prima una cassa" description="Dalla scheda Casse." />
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="max-w-xs">
        <Select aria-label="Cassa" value={registerId} onValueChange={setRegisterId} options={data.registers.map((r) => ({ value: r.id, label: r.name }))} />
      </div>
      <ProductsEditor key={register.id} slug={data.edition.slug} register={register} data={data} />
    </div>
  );
}

function ProductsEditor({ slug, register, data }: { slug: string; register: AdminRegister; data: CashAdminData }) {
  const [mode, setMode] = useState<'all' | 'some'>(register.productIds ? 'some' : 'all');
  const [selected, setSelected] = useState<Set<string>>(new Set(register.productIds ?? data.products.map((p) => p.id)));
  const [busy, setBusy] = useState(false);
  const editable = data.can.edit && !data.edition.readOnly;
  const groups = [...new Set(data.products.map((p) => p.group))];

  async function save() {
    setBusy(true);
    const res = await saveRegisterAction(slug, register.id, {
      name: register.name,
      issuesNumbers: register.issuesNumbers,
      active: register.active,
      productIds: mode === 'all' ? null : [...selected],
    });
    setBusy(false);
    if (res.ok) toast.success(`Prodotti di ${register.name} salvati`);
    else toast.error(res.error);
  }

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <Card
      title={`Cosa vende ${register.name}`}
      footer={
        editable && (
          <div className="flex justify-end">
            <Button onClick={save} loading={busy} disabled={mode === 'some' && selected.size === 0}>
              Salva
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as 'all' | 'some')}
          disabled={!editable}
          options={[
            { value: 'all', label: 'Tutti i prodotti con il canale Cassa', description: 'Anche quelli aggiunti in futuro.' },
            { value: 'some', label: 'Solo quelli scelti' },
          ]}
        />
        {mode === 'some' &&
          groups.map((g) => (
            <fieldset key={g}>
              <legend className="mb-2 text-label font-semibold text-muted">{g}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.products
                  .filter((p) => p.group === g)
                  .map((p) => (
                    <Checkbox
                      key={p.id}
                      label={p.name}
                      description={`${formatMoney(p.priceCents)}${p.active ? '' : ' · non attivo'}`}
                      checked={selected.has(p.id)}
                      onCheckedChange={(v) => toggle(p.id, v)}
                      disabled={!editable}
                    />
                  ))}
              </div>
            </fieldset>
          ))}
      </div>
    </Card>
  );
}
