import { Badge, type BadgeTone } from './Badge';

/** Mappa unica stato → tono e testo (§14.5). Ogni stato del dominio passa da qui. */
export const STATUS_META = {
  // ordini, pagamenti, biglietti
  paid: { tone: 'success', label: 'Pagato' },
  pending: { tone: 'warning', label: 'In attesa' },
  cancelled: { tone: 'danger', label: 'Annullato' },
  failed: { tone: 'danger', label: 'Non riuscito' },
  expired: { tone: 'neutral', label: 'Scaduto' },
  refunded: { tone: 'neutral', label: 'Rimborsato' },
  partially_refunded: { tone: 'neutral', label: 'Rimborsato in parte' },
  succeeded: { tone: 'success', label: 'Riuscito' },
  valid: { tone: 'success', label: 'Valido' },
  void: { tone: 'danger', label: 'Annullato' },
  // rimborsi
  requested: { tone: 'warning', label: 'Richiesto' },
  approved: { tone: 'info', label: 'Approvato' },
  rejected: { tone: 'danger', label: 'Respinto' },
  // edizioni
  draft: { tone: 'neutral', label: 'Bozza' },
  published: { tone: 'warning', label: 'Pubblicata' },
  on_sale: { tone: 'success', label: 'In vendita' },
  sold_out: { tone: 'info', label: 'Esaurita' },
  live: { tone: 'info', label: 'In corso' },
  concluded: { tone: 'info', label: 'Conclusa' },
  archived: { tone: 'neutral', label: 'Archiviata' },
  suspended: { tone: 'danger', label: 'Sospesa' },
} as const satisfies Record<string, { tone: BadgeTone; label: string }>;

export type KnownStatus = keyof typeof STATUS_META;

export type StatusBadgeProps = {
  /** Stato del dominio (paid, on_sale, refunded…). Gli stati sconosciuti appaiono neutri. */
  status: KnownStatus | (string & {});
  /** Sostituisce il testo predefinito (es. "Pagato · POS"). */
  label?: string;
  className?: string;
};

/** Badge di stato con il tono deciso dalla mappa unica dell'admin. */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const meta = (STATUS_META as Record<string, { tone: BadgeTone; label: string }>)[status.toLowerCase()];
  return (
    <Badge tone={meta?.tone ?? 'neutral'} dot className={className}>
      {label ?? meta?.label ?? status}
    </Badge>
  );
}
