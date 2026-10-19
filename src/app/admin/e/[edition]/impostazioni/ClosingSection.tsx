'use client';

import { CheckCircle2, Circle, Download, FileText, MinusCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, ButtonLink, cn, ConfirmDialog, Field, focusRing, Textarea, toast } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import type { ClosingChecklist, ClosingItem } from '@/server/domain/editions/closing';
import { generateFinalReportAction, skipClosingCheckAction, unskipClosingCheckAction } from '../actions';

/** Checklist di chiusura (§9): stato di ogni controllo, link per risolverlo, salto con motivo e rendiconto. */
export function ClosingSection({ edition, list, canSkip, readOnly }: { edition: string; list: ClosingChecklist; canSkip: boolean; readOnly: boolean }) {
  const router = useRouter();
  const [skipping, setSkipping] = useState<ClosingItem | null>(null);
  const [reason, setReason] = useState('');
  const [generating, setGenerating] = useState(false);
  const done = list.items.filter((i) => i.ok || i.skipped).length;

  async function generate() {
    setGenerating(true);
    const res = await generateFinalReportAction(edition);
    setGenerating(false);
    if (!res.ok) return toast.error(res.error);
    toast.success('Rendiconto finale generato');
    router.refresh();
  }

  async function skip() {
    const res = await skipClosingCheckAction(edition, skipping!.key, reason);
    if (!res.ok) {
      toast.error(res.error);
      throw new Error(res.error);
    }
    setReason('');
    router.refresh();
  }

  async function unskip(key: string) {
    const res = await unskipClosingCheckAction(edition, key);
    if (!res.ok) return toast.error(res.error);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-center gap-2 text-body">
        <Badge tone={list.complete ? 'success' : 'warning'}>
          {done} di {list.items.length}
        </Badge>
        {list.complete ? 'Checklist completa: puoi archiviare.' : 'Completa o salta ogni controllo per poter archiviare.'}
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {list.items.map((item) => {
          const Icon = item.ok ? CheckCircle2 : item.skipped ? MinusCircle : Circle;
          return (
            <li key={item.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
              <Icon size={20} aria-hidden className={cn('mt-0.5 shrink-0', item.ok ? 'text-success' : item.skipped ? 'text-muted' : 'text-warning')} />
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-fg">
                  {item.label}
                  {item.module && <span className="ml-2 text-caption font-normal text-muted">modulo</span>}
                </p>
                <p className="text-label text-muted">
                  {item.skipped ? `Saltato${item.skipped.by ? ` da ${item.skipped.by}` : ''} il ${formatDateTime(item.skipped.at)}: “${item.skipped.reason}”` : item.detail}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                {item.key === 'core:final-report' && !readOnly && (
                  <Button size="sm" variant={item.ok ? 'secondary' : 'primary'} icon={FileText} loading={generating} onClick={generate}>
                    {item.ok ? 'Rigenera' : 'Genera rendiconto finale'}
                  </Button>
                )}
                {!item.ok && !item.skipped && item.href && (
                  <Link href={item.href} className={cn('inline-flex h-8 items-center rounded-md px-3 text-label text-primary hover:underline', focusRing)}>
                    Risolvi
                  </Link>
                )}
                {!item.ok && canSkip && !readOnly && !item.blocking && (
                  item.skipped ? (
                    <Button size="sm" variant="ghost" onClick={() => unskip(item.key)}>
                      Annulla salto
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setSkipping(item)}>
                      Salta con motivazione
                    </Button>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {list.lastReportAt && (
        <div className="flex flex-wrap items-center gap-2 text-label text-muted">
          <span>Rendiconto del {formatDateTime(list.lastReportAt)}:</span>
          <ButtonLink size="sm" variant="secondary" icon={Download} href={`/admin/e/${edition}/rendiconto/rendiconto.pdf`} target="_blank">
            PDF
          </ButtonLink>
          <ButtonLink size="sm" variant="secondary" icon={Download} href={`/admin/e/${edition}/rendiconto/rendiconto.csv`}>
            CSV
          </ButtonLink>
        </div>
      )}
      {skipping && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setSkipping(null)}
          title={`Saltare “${skipping.label}”?`}
          description="Il controllo conterà come fatto. Il motivo resta nella checklist e nel registro attività."
          confirmLabel="Salta il controllo"
          onConfirm={skip}
        >
          <Field label="Motivo" required>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Es. ordine di prova lasciato in attesa" />
          </Field>
        </ConfirmDialog>
      )}
    </div>
  );
}
