'use client';

import { BellOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EmptyState, StatusBadge, Switch, toast } from '@/components/ui';
import type { EditionStatus } from '@/server/domain/editions/types';
import { saveEditionNotificationsAction } from '../actions';

export type TypeInfo = { key: string; label: string; description: string };
export type EditionRow = { slug: string; title: string; status: EditionStatus; settings: Record<string, boolean> };

/**
 * Interruttori per edizione. Si salvano subito (azione reversibile, §11.7): in caso d'errore
 * l'interruttore torna com'era.
 */
export function EditionNotifications({ editions, types }: { editions: EditionRow[]; types: TypeInfo[] }) {
  const router = useRouter();
  const [state, setState] = useState(() => Object.fromEntries(editions.map((e) => [e.slug, e.settings])));

  async function toggle(slug: string, key: string, value: boolean) {
    const before = state[slug];
    const next = { ...before, [key]: value };
    setState((s) => ({ ...s, [slug]: next }));
    const res = await saveEditionNotificationsAction(slug, next);
    if (!res.ok) {
      setState((s) => ({ ...s, [slug]: before }));
      return toast.error(res.error);
    }
    toast.success(value ? 'Avviso acceso' : 'Avviso spento');
    router.refresh();
  }

  if (!editions.length) return <EmptyState icon={BellOff} title="Nessuna edizione pubblicata" description="Gli avvisi si scelgono qui quando un’edizione viene pubblicata." />;

  return (
    <ul className="flex flex-col gap-3">
      {editions.map((e) => {
        const ro = e.status === 'archived';
        return (
          <li key={e.slug} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-fg">{e.title}</span>
              <StatusBadge status={e.status} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {types.map((t) => (
                <Switch
                  key={t.key}
                  checked={state[e.slug]?.[t.key] ?? true}
                  disabled={ro}
                  onCheckedChange={(v) => toggle(e.slug, t.key, v)}
                  label={t.label}
                  description={t.description}
                />
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
