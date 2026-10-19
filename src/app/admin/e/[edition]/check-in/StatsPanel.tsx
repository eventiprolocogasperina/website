'use client';

import { BarChart3, CalendarDays, ListChecks } from 'lucide-react';
import { Card, cn, EmptyState, Select, Stat } from '@/components/ui';
import { formatDate, romeDateKey, romeTime } from '@/lib/dates';
import type { CheckinStats } from '@/server/domain/checkin';

/** Entrati su attesi, con barra. */
export function Progress({ entered, expected, className }: { entered: number; expected: number; className?: string }) {
  const pct = expected ? Math.min(100, Math.round((entered / expected) * 100)) : 0;
  return (
    <div className={cn('flex min-w-40 flex-col gap-1', className)}>
      <div className="flex justify-between gap-2 text-label tabular-nums">
        <span>
          <span className="font-semibold text-fg">{entered}</span> / {expected} entrati
        </span>
        <span className="text-muted">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" role="meter" aria-valuemin={0} aria-valuemax={expected} aria-valuenow={entered} aria-label="Entrati sugli attesi">
        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatsPanel({ stats, onDay }: { stats: CheckinStats; onDay: (day: string) => void }) {
  const today = stats.sessions.find((s) => stats.day && romeDateKey(s.startsAt) === stats.day);
  const peak = stats.quarters.reduce((m, q) => Math.max(m, q.count), 0);
  const dayTotal = stats.quarters.reduce((n, q) => n + q.count, 0);
  const busiest = stats.quarters.find((q) => q.count === peak && peak > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entrati in totale" value={stats.total.entered} help={`su ${stats.total.expected} attesi`} />
        <Stat label={stats.day ? `Ingressi del ${formatDate(stats.day, 'short')}` : 'Ingressi del giorno'} value={dayTotal} />
        <Stat label="Quarto d’ora più pieno" value={busiest ? romeTime(busiest.start) : '—'} help={busiest ? `${peak} ingressi` : undefined} />
        <Stat label="Ancora da entrare" value={Math.max(0, (today?.expected ?? stats.total.expected) - (today?.entered ?? stats.total.entered))} help={today ? today.label : 'tutte le date'} />
      </div>

      <Card
        title="Ingressi per quarto d’ora"
        actions={
          stats.days.length > 1 ? (
            <Select aria-label="Giorno" value={stats.day ?? undefined} onValueChange={onDay} options={stats.days.map((d) => ({ value: d, label: formatDate(d, 'short') }))} className="w-40" />
          ) : undefined
        }
      >
        {stats.quarters.length === 0 ? (
          <EmptyState icon={BarChart3} title="Nessun ingresso ancora" description="Il grafico si riempie appena lo scanner registra i primi ingressi." />
        ) : (
          <QuarterChart quarters={stats.quarters} peak={peak} />
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Per data" description="Biglietti d’ingresso; quelli delle date rinviate contano nella data di recupero.">
          {stats.sessions.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nessuna data" description="L’edizione non ha date: conta il totale qui sopra." />
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.sessions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="font-medium text-fg">{s.label}</span>
                  <Progress entered={s.entered} expected={s.expected} className="w-full sm:w-56" />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Per lista" description="Tutti i biglietti che la lista accetta.">
          {stats.lists.length === 0 ? (
            <EmptyState icon={ListChecks} title="Nessuna lista" description="Crea una lista nella scheda Liste per iniziare il check-in." />
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.lists.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="font-medium text-fg">
                    {l.name}
                    {l.sessionLabel && <span className="ml-1 text-label font-normal text-muted">· {l.sessionLabel}</span>}
                  </span>
                  <Progress entered={l.entered} expected={l.expected} className="w-full sm:w-56" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Barre verticali, una per quarto d'ora; scorre in orizzontale su mobile. */
function QuarterChart({ quarters, peak }: { quarters: CheckinStats['quarters']; peak: number }) {
  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <ol className="flex h-48 min-w-full items-end gap-1" style={{ width: `${Math.max(quarters.length * 28, 0)}px` }} aria-label="Ingressi per quarto d’ora">
          {quarters.map((q) => (
            <li key={q.start} className="flex h-full w-6 shrink-0 flex-col items-center justify-end gap-1" title={`${romeTime(q.start)}: ${q.count} ingressi`}>
              <span className="text-caption text-muted tabular-nums">{q.count || ''}</span>
              <span className="w-full rounded-t bg-primary" style={{ height: `${peak ? Math.max(2, (q.count / peak) * 85) : 0}%` }} aria-hidden />
              <span className="sr-only">
                {romeTime(q.start)}: {q.count} ingressi
              </span>
            </li>
          ))}
        </ol>
        <ol className="mt-1 flex gap-1" style={{ width: `${quarters.length * 28}px` }} aria-hidden>
          {quarters.map((q, i) => (
            <li key={q.start} className="w-6 shrink-0 text-center text-caption text-muted">
              {i % 4 === 0 ? romeTime(q.start) : ''}
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="text-caption text-muted">Ora di Roma. Ingressi annullati esclusi.</figcaption>
    </figure>
  );
}
