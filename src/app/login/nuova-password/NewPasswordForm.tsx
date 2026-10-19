'use client';

import { useActionState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { setNewPassword, type NewPasswordState } from '../actions';

export function NewPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<NewPasswordState, FormData>(setNewPassword, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Password">
        <Input type="password" name="password" autoComplete="new-password" minLength={10} required autoFocus />
      </Field>
      <Field label="Ripeti la password" error={state.error}>
        <Input type="password" name="confirm" autoComplete="new-password" minLength={10} required />
      </Field>
      <Button type="submit" loading={pending} className="w-full">
        Salva e accedi
      </Button>
    </form>
  );
}
