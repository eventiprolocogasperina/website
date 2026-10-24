// Grafici semplici in CSS per panoramica e statistiche: niente librerie, leggibili anche da tastiera
// e con lo screen reader (ogni grafico ha la sua descrizione testuale).
import { cn } from '@/components/ui';

type Point = { label: string; value: number; hint?: string };

/** Colonne verticali, es. vendite per giorno o per ora. */
export function ColumnChart({ data, format = String, height = 'h-40', className }: { data: Point[]; format?: (n: number) => string; height?: string; className?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn('flex items-end gap-1', height, className)} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join('; ')}>
      {data.map((d) => (
        <div key={d.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${format(d.value)}${d.hint ? ` · ${d.hint}` : ''}`}>
          <div className={cn('w-full rounded-t-sm', d.value ? 'bg-primary group-hover:bg-primary-hover' : 'bg-surface-sunken')} style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }} />
          <span className="w-full truncate text-center text-caption text-muted tabular-nums">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Barre orizzontali con il valore a destra, es. per prodotto o per canale. */
export function BarList({ rows, format = String, empty = 'Nessun dato.' }: { rows: Array<{ label: string; value: number; sub?: string }>; format?: (n: number) => string; empty?: string }) {
  if (!rows.length) return <p className="text-body text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-body">
            <span className="min-w-0 truncate text-fg">
              {r.label}
              {r.sub && <span className="ml-2 text-label text-muted">{r.sub}</span>}
            </span>
            <span className="shrink-0 font-medium tabular-nums">{format(r.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
