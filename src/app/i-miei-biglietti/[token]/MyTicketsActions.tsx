'use client';

import { useState } from 'react';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import { changeDateAction, requestRefundAction } from './actions';

/** Cambio data dal cliente (se il modulo Rinvio lo consente). */
export function ChangeDate({ token, options }: { token: string; options: Array<{ id: string; label: string }> }) {
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!options.length) return <p className="text-body text-muted">Non ci sono altre date disponibili.</p>;
  async function submit() {
    setBusy(true);
    const res = await changeDateAction(token, to);
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: 'Data cambiata. Ti abbiamo mandato un’email con la conferma.' } : { ok: false, text: res.error });
  }
  return (
    <div className="flex flex-col gap-3">
      <Field label="Nuova data">
        <Select value={to} onValueChange={setTo} placeholder="Scegli la data" options={options.map((o) => ({ value: o.id, label: o.label }))} />
      </Field>
      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`text-body ${msg.ok ? 'text-success' : 'text-danger'}`}>
          {msg.text}
        </p>
      )}
      <div>
        <Button onClick={submit} disabled={!to} loading={busy}>
          Cambia data
        </Button>
      </div>
    </div>
  );
}

/** Richiesta di rimborso con IBAN (salvato cifrato dal server). */
export function RefundRequest({ token, code, amountCents }: { token: string; code: string; amountCents: number }) {
  const [f, setF] = useState({ reason: '', iban: '', holderName: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await requestRefundAction(token, { orderCode: code, ...f });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: `Richiesta inviata: ${formatMoney(res.data.amountCents)}. Ti scriviamo quando il bonifico parte.` } : { ok: false, text: res.error });
  }
  if (msg?.ok) return <p role="status" className="text-body text-success">{msg.text}</p>;
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-body text-fg">Puoi chiedere il rimborso di {formatMoney(amountCents)} con bonifico.</p>
      <Field label="Intestatario del conto" required>
        <Input autoComplete="name" value={f.holderName} onChange={(e) => setF({ ...f, holderName: e.target.value })} maxLength={120} />
      </Field>
      <Field label="IBAN" required>
        <Input autoComplete="off" spellCheck={false} value={f.iban} onChange={(e) => setF({ ...f, iban: e.target.value })} maxLength={40} />
      </Field>
      <Field label="Motivo" required>
        <Textarea rows={2} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} maxLength={1000} />
      </Field>
      {msg && (
        <p role="alert" className="text-body text-danger">
          {msg.text}
        </p>
      )}
      <div>
        <Button type="submit" loading={busy} disabled={!f.iban || !f.holderName || f.reason.trim().length < 3}>
          Chiedi il rimborso
        </Button>
      </div>
    </form>
  );
}
