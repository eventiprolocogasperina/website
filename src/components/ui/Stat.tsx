import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export type StatProps = {
  /** Cosa misura ("Incassato oggi"). */
  label: ReactNode;
  /** Valore già formattato (usa formatMoney per gli importi). */
  value: ReactNode;
  /** Variazione, es. "+12% rispetto a ieri". */
  delta?: ReactNode;
  /** Direzione della variazione: decide colore e freccia. */
  trend?: 'up' | 'down' | 'flat';
  /** true se "giù" è un buon segno (es. rimborsi). */
  invertTrend?: boolean;
  /** Nota sotto il valore. */
  help?: ReactNode;
  className?: string;
};

/** Numero chiave per la riga di KPI della panoramica (al massimo 4 per riga, §11.5). */
export function Stat({ label, value, delta, trend = 'flat', invertTrend, help, className }: StatProps) {
  const good = trend === 'flat' ? null : (trend === 'up') !== !!invertTrend;
  const Arrow = trend === 'down' ? ArrowDownRight : ArrowUpRight;
  return (
    <div className={cn('flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-sm', className)}>
      <span className="text-label text-muted">{label}</span>
      <span className="text-kpi font-semibold tabular-nums text-fg">{value}</span>
      {(delta || help) && (
        <span className="flex flex-wrap items-center gap-2 text-caption">
          {delta && (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', good === null ? 'text-muted' : good ? 'text-success' : 'text-danger')}>
              {trend !== 'flat' && <Arrow size={14} aria-hidden />}
              {delta}
            </span>
          )}
          {help && <span className="text-muted">{help}</span>}
        </span>
      )}
    </div>
  );
}
