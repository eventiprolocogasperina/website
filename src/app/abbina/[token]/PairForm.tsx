'use client';

import { useActionState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { pairDevice, type PairState } from './actions';

export function PairForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<PairState, FormData>(pairDevice, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="PIN di abbinamento" help="Sono le 6 cifre che vedi accanto al QR, sullo schermo di chi ti ha dato il codice." required>
        <Input name="pin" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} autoFocus required className="text-center text-section tracking-[0.3em] tabular-nums" />
      </Field>
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
