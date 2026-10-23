'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Field, Input, toast } from '@/components/ui';
import { setOwnPinAction } from './actions';

export function PinForm({ hasPin, locked }: { hasPin: boolean; locked: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const valid = /^\d{4,6}$/.test(pin);
  return (
    <div className="space-y-3">
      <div>{locked ? <Badge tone="danger">PIN bloccato</Badge> : hasPin ? <Badge tone="success">PIN impostato</Badge> : <Badge tone="warning">Nessun PIN</Badge>}</div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setSaving(true);
          const res = await setOwnPinAction(pin);
          setSaving(false);
          if (res.ok) {
            toast.success('PIN salvato.');
            setPin('');
            router.refresh();
          } else toast.error(res.error);
        }}
      >
        <Field label={hasPin ? 'Nuovo PIN' : 'PIN'} className="w-40">
          <Input inputMode="numeric" autoComplete="off" type="password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="tracking-[0.3em]" />
        </Field>
        <Button type="submit" disabled={!valid} loading={saving}>
          {hasPin ? 'Cambia PIN' : 'Imposta PIN'}
        </Button>
      </form>
    </div>
  );
}
