'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { unsubscribeNotifyAction } from '@/server/public/notify-actions';

export function UnsubscribeClient({ token }: { token: string }) {
  const [state, setState] = useState<{ status: 'idle' | 'busy' | 'done' | 'error'; message?: string }>({ status: 'idle' });

  async function confirm() {
    setState({ status: 'busy' });
    const res = await unsubscribeNotifyAction(token);
    if (!res.ok) return setState({ status: 'error', message: res.error });
    if (!res.data) return setState({ status: 'error', message: 'Il link non è valido o è scaduto.' });
    setState({ status: 'done', message: `Non riceverai più gli avvisi di ${res.data}.` });
  }

  if (state.status === 'done') {
    return (
      <p role="status" className="mt-3 text-body text-fg">
        {state.message}
      </p>
    );
  }
  return (
    <>
      <p className="mt-2 text-body text-muted">Non vuoi più ricevere l’email quando aprono le vendite della prossima edizione?</p>
      <Button className="mt-5" onClick={confirm} loading={state.status === 'busy'}>
        Sì, non avvisarmi più
      </Button>
      {state.status === 'error' && (
        <p role="alert" className="mt-3 text-body text-danger">
          {state.message}
        </p>
      )}
    </>
  );
}
