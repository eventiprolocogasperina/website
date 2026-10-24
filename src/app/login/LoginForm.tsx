'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { login, type LoginState } from './actions';

export default function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {notice && (
        <p role="status" className="rounded-lg bg-success-bg px-3 py-2 text-body text-success">
          {notice}
        </p>
      )}
      <Field label="Email">
        <Input type="email" name="email" autoComplete="username" defaultValue={state.email} autoFocus inputMode="email" />
      </Field>
      <Field label="Password" error={state.error}>
        <Input type="password" name="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" loading={pending} className="w-full">
        Accedi
      </Button>
      <Link href="/login/password-dimenticata" className="self-center rounded text-label text-primary hover:underline">
        Password dimenticata?
      </Link>
    </form>
  );
}
