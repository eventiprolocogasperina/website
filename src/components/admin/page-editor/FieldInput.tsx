'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { romeDateKey, romeDateTime, romeTime } from '@/lib/dates';
import { Button, Field, IconButton, Input, Select, Switch, Textarea } from '@/components/ui';
import type { FieldSpec, ListField, ScalarField, SelectField } from './fields';

type Values = Record<string, unknown>;

/** Data e ora di Roma ↔ ISO con fuso: il campo datetime-local non sa niente di fusi orari. */
const toLocal = (iso: string) => (iso && !Number.isNaN(Date.parse(iso)) ? `${romeDateKey(iso)}T${romeTime(iso)}` : '');
const fromLocal = (v: string) => (v ? romeDateTime(v.slice(0, 10), v.slice(11, 16)).toISOString() : '');

function Scalar({ spec, value, onChange }: { spec: ScalarField | SelectField; value: unknown; onChange: (v: unknown) => void }) {
  const str = typeof value === 'string' ? value : '';
  switch (spec.kind) {
    case 'switch':
      return <Switch label={spec.label} description={spec.help} checked={value === true} onCheckedChange={onChange} />;
    case 'select':
      return (
        <Field label={spec.label} help={spec.help}>
          <Select value={str} onValueChange={onChange} options={spec.options} />
        </Field>
      );
    case 'textarea':
      return (
        <Field label={spec.label} help={spec.help}>
          <Textarea value={str} onChange={(e) => onChange(e.target.value)} rows={5} />
        </Field>
      );
    case 'lines':
      return (
        <Field label={spec.label} help={spec.help}>
          <Textarea value={Array.isArray(value) ? value.join('\n') : ''} onChange={(e) => onChange(e.target.value.split('\n'))} rows={4} />
        </Field>
      );
    case 'number':
      return (
        <Field label={spec.label} help={spec.help}>
          <Input type="number" inputMode="decimal" step="any" value={typeof value === 'number' ? String(value) : ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
        </Field>
      );
    case 'datetime':
      return (
        <Field label={spec.label} help={spec.help ?? 'Ora italiana.'}>
          <Input type="datetime-local" value={toLocal(str)} onChange={(e) => onChange(fromLocal(e.target.value))} />
        </Field>
      );
    case 'color':
      return (
        <Field label={spec.label} help={spec.help ?? 'Esadecimale, es. #fed7aa.'}>
          <div className="flex items-center gap-2">
            <input type="color" aria-label={`${spec.label}: tavolozza`} value={/^#[0-9a-f]{6}$/i.test(str) ? str : '#ffffff'} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface" />
            <Input value={str} onChange={(e) => onChange(e.target.value)} placeholder="#rrggbb" />
          </div>
        </Field>
      );
    case 'image':
      return (
        <Field label={spec.label} help={spec.help ?? 'Indirizzo dell’immagine (Cloudinary o /img/…).'}>
          <div className="flex items-center gap-2">
            {/^(https:\/\/|\/)/.test(str) && <Image src={str} alt="" width={40} height={40} className="size-10 shrink-0 rounded-md border border-border object-cover" />}
            <Input value={str} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
          </div>
        </Field>
      );
    default:
      return (
        <Field label={spec.label} help={spec.help}>
          <Input value={str} type={spec.kind === 'url' ? 'url' : 'text'} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
  }
}

function List({ spec, value, onChange }: { spec: ListField; value: unknown; onChange: (v: unknown) => void }) {
  const items = Array.isArray(value) ? (value as Values[]) : [];
  const set = (i: number, patch: Values) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-label font-medium text-fg">{spec.label}</legend>
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface-sunken p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-label font-medium text-muted">
              {spec.item} {i + 1}
            </span>
            <span className="flex gap-1">
              <IconButton icon={ArrowUp} label="Sposta su" size="sm" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon={ArrowDown} label="Sposta giù" size="sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} />
              <IconButton icon={Trash2} label={`Togli ${spec.item.toLowerCase()} ${i + 1}`} size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))} />
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {spec.fields.map((f) => (
              <Scalar key={f.key} spec={f} value={it[f.key]} onChange={(v) => set(i, { [f.key]: v })} />
            ))}
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" icon={Plus} onClick={() => onChange([...items, {}])} className="self-start">
        Aggiungi {spec.item.toLowerCase()}
      </Button>
    </fieldset>
  );
}

export function FieldInput({ spec, value, onChange }: { spec: FieldSpec; value: unknown; onChange: (v: unknown) => void }) {
  return spec.kind === 'list' ? <List spec={spec} value={value} onChange={onChange} /> : <Scalar spec={spec} value={value} onChange={onChange} />;
}
