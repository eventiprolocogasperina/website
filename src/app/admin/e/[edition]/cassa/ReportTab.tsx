'use client';

import { Download, FileText, PackageOpen } from 'lucide-react';
import { useState } from 'react';
import { ButtonLink, Card, EmptyState, Field, Input, Stat } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { CashAdminData } from './types';

/**
 * Rendiconto della cassa (sostituisce il vecchio "per data" con salvataggio storico e azzeramento):
 * per giorno, cassa, operatore, metodo e prodotto, in PDF e CSV. Niente si azzera: si filtra per data.
 */
export function ReportTab({ data }: { data: CashAdminData }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const s = data.summary!;
  const q = (formato: 'pdf' | 'csv') => {
    const p = new URLSearchParams({ formato });
    if (from) p.set('dal', from);
    if (to) p.set('al', to);
    return `/api/admin/cassa/${data.edition.slug}/rendiconto?${p}`;
  };

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Contributi netti" value={formatMoney(s.netCents)} />
        {s.byMethod
          .filter((m) => m.count > 0)
          .map((m) => (
            <Stat key={m.label} label={m.label} value={formatMoney(m.netCents)} />
          ))}
        <Stat label="Vendite / annullate" value={`${s.sales} / ${s.voided}`} />
      </div>
      <SoldProducts products={s.products} />
      <Card title="Scarica il rendiconto" description="Tutta l’edizione, oppure solo i giorni che scegli (ora italiana). Gli omaggi sono indicati a parte e non entrano nei contributi.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Dal">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Al">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <ButtonLink href={q('pdf')} target="_blank" icon={FileText}>
              PDF
            </ButtonLink>
            <ButtonLink href={q('csv')} variant="secondary" icon={Download}>
              CSV
            </ButtonLink>
          </div>
        </div>
      </Card>
    </div>
  );
}

type Sold = NonNullable<CashAdminData['summary']>['products'];

/** Pezzi venduti per prodotto in tutta l'edizione (le vendite annullate non contano). */
function SoldProducts({ products }: { products: Sold }) {
  const pieces = products.reduce((n, p) => n + p.quantity, 0);
  return (
    <Card flush title="Pezzi venduti per prodotto" description={products.length ? `${pieces} pezzi in tutto, omaggi compresi. Per un solo giorno scarica il PDF o il CSV con le date.` : undefined}>
      {products.length === 0 ? (
        <EmptyState icon={PackageOpen} title="Ancora nessun pezzo venduto" description="Le vendite della cassa compaiono qui appena registrate." />
      ) : (
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-border text-left text-label text-muted">
              <th scope="col" className="px-4 py-2 font-medium">
                Prodotto
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Pezzi
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Importo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{p.quantity}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatMoney(p.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
