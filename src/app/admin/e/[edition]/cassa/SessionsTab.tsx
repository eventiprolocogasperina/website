'use client';

import { AlertTriangle, CalendarClock, FileText } from 'lucide-react';
import { Badge, Card, EmptyState } from '@/components/ui';
import { needsDifferenceNote } from '@/lib/cash/denominations';
import { formatMoney } from '@/lib/money';
import { CorrectSaleCard } from './CorrectSaleCard';
import type { AdminSession, CashAdminData } from './types';

const when = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function SessionBadges({ s }: { s: AdminSession }) {
  return (
    <span className="flex flex-wrap gap-1">
      {!s.closedAt && <Badge tone="warning">Aperto</Badge>}
      {s.differenceCents !== null && needsDifferenceNote(s.differenceCents) && <Badge tone="danger">Differenza {formatMoney(s.differenceCents)}</Badge>}
    </span>
  );
}

function ZLink({ s }: { s: AdminSession }) {
  if (s.zReportNumber === null) return <span className="text-muted">—</span>;
  return (
    <a href={`/api/admin/cassa/z/${s.id}`} target="_blank" rel="noopener" className="inline-flex min-h-9 items-center gap-1 text-primary underline">
      <FileText size={16} aria-hidden /> Z n. {s.zReportNumber}
    </a>
  );
}

/** Turni e chiusure Z, con le anomalie: differenze di cassa oltre 1 € e vendite segnalate. */
export function SessionsTab({ data }: { data: CashAdminData }) {
  const sessions = data.sessions ?? [];
  const flagged = data.flagged ?? [];
  return (
    <div className="flex flex-col gap-4 pt-4">
      {data.can.correct && !data.edition.readOnly && <CorrectSaleCard edition={data.edition.slug} />}
      {flagged.length > 0 && (
        <Card title="Vendite da controllare" description="Fatte senza rete oltre la scorta disponibile, oppure arrivate dopo la chiusura del turno. Sono già registrate: verifica con chi era in cassa.">
          <ul className="divide-y divide-border">
            {flagged.map((f) => (
              <li key={f.orderId} className="flex flex-wrap items-center gap-2 py-2 text-body">
                <AlertTriangle size={16} className="text-warning" aria-hidden />
                <span className="font-semibold tabular-nums">{f.number ?? f.code}</span>
                <span className="text-muted">
                  {f.register} · {when(f.at)} · {formatMoney(f.totalCents)}
                </span>
                {f.oversold && <Badge tone="warning">Oltre la scorta</Badge>}
                {f.afterClose && <Badge tone="warning">Dopo la chiusura</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {sessions.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarClock} title="Ancora nessun turno" description="I turni si aprono dai telefoni, nell’app Cassa, con il fondo cassa." />
        </Card>
      ) : (
        <>
          <ul className="flex flex-col gap-2 md:hidden">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-xl border border-border bg-surface p-3 text-body">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{s.registerName}</p>
                    <p className="text-label text-muted">
                      {when(s.openedAt)}
                      {s.closedAt ? ` → ${when(s.closedAt)}` : ''} · {s.openedByName ?? '—'}
                    </p>
                  </div>
                  <ZLink s={s} />
                </div>
                <p className="mt-1 text-label">
                  Fondo {formatMoney(s.openingFloatCents)}
                  {s.netCents !== null && ` · contributi ${formatMoney(s.netCents)}`}
                  {s.differenceCents !== null && ` · differenza ${formatMoney(s.differenceCents)}`}
                </p>
                <SessionBadges s={s} />
                {s.notes && <p className="mt-1 text-label text-muted">“{s.notes}”</p>}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface md:block">
            <table className="w-full text-body">
              <thead className="border-b border-border text-left text-label text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Cassa</th>
                  <th className="px-3 py-2 font-medium">Aperto</th>
                  <th className="px-3 py-2 font-medium">Chiuso</th>
                  <th className="px-3 py-2 text-right font-medium">Fondo</th>
                  <th className="px-3 py-2 text-right font-medium">Contributi</th>
                  <th className="px-3 py-2 text-right font-medium">Differenza</th>
                  <th className="px-3 py-2 font-medium">Note</th>
                  <th className="px-3 py-2 font-medium">Chiusura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2 font-medium">{s.registerName}</td>
                    <td className="px-3 py-2">
                      {when(s.openedAt)}
                      <span className="block text-label text-muted">{s.openedByName ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2">{s.closedAt ? when(s.closedAt) : <SessionBadges s={s} />}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(s.openingFloatCents)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.netCents !== null ? formatMoney(s.netCents) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {s.differenceCents !== null ? (
                        <span className={needsDifferenceNote(s.differenceCents) ? 'font-semibold text-danger' : undefined}>{formatMoney(s.differenceCents)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-56 truncate px-3 py-2 text-muted" title={s.notes ?? undefined}>
                      {s.notes ?? ''}
                    </td>
                    <td className="px-3 py-2">
                      <ZLink s={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
