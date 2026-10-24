'use client';

import { ArrowLeft, ArrowRight, ExternalLink, SkipForward } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, ButtonLink, Card, cn, DatePicker, Field, focusRing, Input, toast } from '@/components/ui';
import type { SetupItem, SetupKind } from '@/lib/edition-setup';
import type { EditionStatus } from '@/server/domain/editions/types';
import { changeStatusAction } from '../actions';
import { saveRulesUrlAction, saveWhereWhenAction, skipSetupStepAction } from './actions';

export type StepLink = { label: string; href: string; hint: string };

type Props = {
  edition: string;
  item: SetupItem;
  kind: SetupKind;
  status: EditionStatus;
  links: StepLink[];
  prevHref: string | null;
  nextHref: string;
  blockers: string[];
  initial: { location: string; startsDate: string; startsTime: string; rulesUrl: string };
};

export const STATUS_LABEL = { done: { label: 'Fatto', tone: 'success' }, todo: { label: 'Da fare', tone: 'warning' }, skipped: { label: 'Saltato', tone: 'neutral' } } as const;

/** Corpo di un passo: stato, collegamenti alle pagine dove si fa, i pochi campi che servono qui, e la navigazione. */
export function StepPanel({ edition, item, kind, status, links, prevHref, nextHref, blockers, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const meta = STATUS_LABEL[item.status];

  /** Salva i campi del passo (se ci sono) e va avanti. */
  async function saveAndNext() {
    setBusy(true);
    setError('');
    let res: { ok: boolean; error?: string } = { ok: true };
    if (item.key === 'dates') {
      // Con le date in vendita, inizio e fine dell'edizione si riallineano alla prima e all'ultima data.
      res = await saveWhereWhenAction(
        edition,
        kind === 'info' ? { location: form.location, startsDate: form.startsDate || null, startsTime: form.startsTime || null, endsDate: null, endsTime: null } : { location: form.location },
      );
    } else if (item.key === 'rules' && form.rulesUrl && form.rulesUrl !== initial.rulesUrl) {
      res = await saveRulesUrlAction(edition, form.rulesUrl);
    }
    setBusy(false);
    if (!res.ok) return setError(res.error ?? 'Non è stato possibile salvare.');
    router.push(nextHref);
  }

  async function skip() {
    setBusy(true);
    const res = await skipSetupStepAction(edition, item.key);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success('Passo saltato: lo ritrovi in “Da completare”');
    router.push(nextHref);
  }

  async function changeStatus(to: EditionStatus) {
    setBusy(true);
    setError('');
    const res = await changeStatusAction(edition, to, null);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    toast.success(to === 'published' ? 'Edizione pubblicata' : 'Vendite aperte');
    router.refresh();
  }

  return (
    <Card
      title={item.label}
      actions={
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <Badge tone={item.required ? 'info' : 'neutral'}>{item.required ? 'Necessario' : 'Facoltativo'}</Badge>
        </span>
      }
      description={item.description}
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-surface-sunken px-3 py-2 text-body text-fg" data-testid="step-detail">
          {item.detail}
        </p>

        {item.key === 'dates' && (
          <div className="flex flex-col gap-4">
            <Field label="Luogo" help={kind === 'sales' ? 'Inizio e fine dell’edizione si prendono dalla prima e dall’ultima data.' : undefined}>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Es. Gasperina, centro storico" />
            </Field>
            {kind === 'info' && (
              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <Field label="Data">
                  <DatePicker value={form.startsDate} onValueChange={(startsDate) => setForm({ ...form, startsDate })} />
                </Field>
                <Field label="Ora">
                  <Input type="time" value={form.startsTime} onChange={(e) => setForm({ ...form, startsTime: e.target.value })} />
                </Field>
              </div>
            )}
          </div>
        )}

        {item.key === 'rules' && (
          <Field label="Link al regolamento" help="Il PDF con foto, comportamento, partecipazione e rinvii. Il checkout chiede di accettarlo.">
            <Input value={form.rulesUrl} onChange={(e) => setForm({ ...form, rulesUrl: e.target.value })} placeholder="https://drive.google.com/…" inputMode="url" />
          </Field>
        )}

        {item.key === 'publish' && (
          <div className="flex flex-col gap-3">
            {status === 'draft' && (
              <Button onClick={() => changeStatus('published')} loading={busy} className="self-start">
                Pubblica l’edizione
              </Button>
            )}
            {kind === 'sales' && (status === 'published' || status === 'suspended') && (
              <>
                <Button onClick={() => changeStatus('on_sale')} loading={busy} disabled={blockers.length > 0} className="self-start">
                  Apri le vendite
                </Button>
                {blockers.length > 0 && (
                  <div className="rounded-lg border border-warning/40 bg-warning-bg px-3 py-2 text-body text-fg">
                    <p className="font-medium">Prima di aprire le vendite completa:</p>
                    <ul className="mt-1 list-disc pl-5">
                      {blockers.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {links.map((l) => (
            <li key={l.href + l.label}>
              <Link href={l.href} className={cn('flex items-start gap-3 px-3 py-2.5 hover:bg-surface-sunken', focusRing)}>
                <ExternalLink size={16} aria-hidden className="mt-0.5 shrink-0 text-muted" />
                <span className="flex flex-col">
                  <span className="text-body font-medium text-primary">{l.label}</span>
                  <span className="text-label text-muted">{l.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-body text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          {prevHref ? (
            <ButtonLink href={prevHref} variant="ghost" icon={ArrowLeft}>
              Indietro
            </ButtonLink>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">
            {item.key !== 'publish' && item.status !== 'done' && (
              <Button variant="secondary" icon={SkipForward} onClick={skip} disabled={busy}>
                Salta per ora
              </Button>
            )}
            <Button iconEnd={ArrowRight} onClick={saveAndNext} loading={busy}>
              {item.key === 'publish' ? 'Torna alla panoramica' : 'Salva e continua'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
