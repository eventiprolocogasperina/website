'use client';

import { useState } from 'react';
import { setOrdersV2Action } from '@/app/admin/(org)/ordini/actions';
import { Switch, toast } from '@/components/ui';

/**
 * Interruttore `orders_v2` (solo per chi gestisce le impostazioni): acceso, le vecchie pagine Ordini,
 * Rimborsi e Prenotazioni portano a quelle nuove. Si spegne in un clic se serve tornare indietro.
 */
export function OrdersV2Switch({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  async function change(v: boolean) {
    setBusy(true);
    setOn(v);
    const res = await setOrdersV2Action(v);
    setBusy(false);
    if (!res.ok) {
      setOn(!v);
      return toast.error(res.error);
    }
    toast.success(v ? 'Le vecchie pagine portano ora a quelle nuove' : 'Tornano le pagine di prima');
  }
  return <Switch checked={on} disabled={busy} onCheckedChange={change} label="Pagine nuove predefinite" />;
}
