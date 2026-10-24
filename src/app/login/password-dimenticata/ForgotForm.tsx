'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { forgotPassword, type ForgotState } from '../actions';

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(forgotPassword, {});
  if (state.sent) {
    return (
      <div className="flex flex-col gap-4 text-body">
        <p role="status">Se l’email è registrata, tra poco ti arriva un link. Vale 30 minuti.</p>
        <Link href="/login" className="rounded text-label text-primary hover:underline">
          Torna all’accesso
        </Link>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Email" error={state.error}>
        <Input type="email" name="email" autoComplete="username" required autoFocus />
      </Field>
      <Button type="submit" loading={pending} className="w-full">
        Mandami il link
      </Button>
      <Link href="/login" className="self-center rounded text-label text-primary hover:underline">
        Torna all’accesso
      </Link>
    </form>
  );
}
