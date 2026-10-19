'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui';
import { pairDevice, type PairState } from './actions';

export function PairForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<PairState, FormData>(pairDevice, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-body text-muted">Dopo l’abbinamento ogni volontario entra con il proprio PIN.</p>
      {state.error && (
        <p role="alert" className="text-body text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" loading={pending} className="w-full" size="lg">
        Abbina questo dispositivo
      </Button>
    </form>
  );
}
