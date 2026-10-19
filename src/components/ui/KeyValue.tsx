import type { ReactNode } from 'react';
import { cn } from './cn';

export type KeyValueItem = { label: ReactNode; value: ReactNode };

export type KeyValueProps = {
  items: KeyValueItem[];
  /** "stacked": etichetta sopra il valore (colonne laterali); "inline": affiancati. */
  layout?: 'stacked' | 'inline';
  className?: string;
};

/** Elenco etichetta → valore per i metadati di un dettaglio. */
export function KeyValue({ items, layout = 'inline', className }: KeyValueProps) {
  return (
    <dl className={cn(layout === 'inline' ? 'grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-2' : 'flex flex-col gap-3', className)}>
      {items.map((item, i) =>
        layout === 'inline' ? (
          <div key={i} className="contents">
            <dt className="text-label text-muted">{item.label}</dt>
            <dd className="text-body text-fg tabular-nums break-words">{item.value}</dd>
          </div>
        ) : (
          <div key={i} className="flex flex-col gap-0.5">
            <dt className="text-caption text-muted">{item.label}</dt>
            <dd className="text-body text-fg tabular-nums break-words">{item.value}</dd>
          </div>
        ),
      )}
    </dl>
  );
}
