'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/components/ui';
import { saveSettingsAction } from '@/app/admin/(org)/sistema/actions';
import type { SettingsSection } from '@/server/domain/settings';

type Values = Record<string, unknown>;

/**
 * Stato di un modulo di Sistema con una o più sezioni di impostazioni: salva solo le sezioni
 * cambiate, una alla volta, e mostra il primo errore.
 */
export function useSettingsForm<S extends SettingsSection>(initial: Record<S, Values>) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const changed = (Object.keys(initial) as S[]).filter((s) => JSON.stringify(values[s]) !== JSON.stringify(initial[s]));

  function set(section: S, patch: Values) {
    setValues((v) => ({ ...v, [section]: { ...v[section], ...patch } }));
  }

  async function save() {
    setSaving(true);
    setError('');
    for (const s of changed) {
      const res = await saveSettingsAction(s, values[s]);
      if (!res.ok) {
        setSaving(false);
        return setError(res.error);
      }
    }
    setSaving(false);
    toast.success('Impostazioni salvate');
    router.refresh();
  }

  return { values, set, dirty: changed.length > 0, saving, error, save, discard: () => (setValues(initial), setError('')) };
}
