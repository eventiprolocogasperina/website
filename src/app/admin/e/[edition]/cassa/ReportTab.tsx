'use client';

import { Download, FileText } from 'lucide-react';
import { useState } from 'react';
import { ButtonLink, Card, Field, Input, Stat } from '@/components/ui';
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
