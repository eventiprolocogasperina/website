import { Badge } from '@/components/ui';

/** Stato di un segreto dell'env: solo "impostato" o "mancante", mai il valore (§18.2). */
export function SecretBadge({ label, set, hint }: { label: string; set: boolean | undefined; hint?: string }) {
  return (
    <Badge tone={set ? 'success' : 'warning'}>
      {label}: {set ? (hint ?? 'impostato') : 'mancante'}
    </Badge>
  );
}
