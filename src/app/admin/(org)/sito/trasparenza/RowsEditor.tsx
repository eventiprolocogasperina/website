'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button, Field, IconButton, Input, Select, Textarea } from '@/components/ui';

// Editor di un elenco di righe strutturate (trattamenti, fornitori, cookie): una scheda per riga.

export type RowField<T> = { key: keyof T & string; label: string; kind?: 'text' | 'textarea' | 'select'; options?: Array<{ value: string; label: string }>; wide?: boolean };

type Props<T> = {
  rows: T[];
  fields: RowField<T>[];
  /** Titolo della scheda (es. il nome del fornitore). */
  title: (row: T, index: number) => string;
  blank: T;
  onChange: (rows: T[]) => void;
  addLabel: string;
  max: number;
};

export function RowsEditor<T extends Record<string, string>>({ rows, fields, title, blank, onChange, addLabel, max }: Props<T>) {
  const set = (i: number, key: keyof T, value: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const move = (i: number, to: number) => {
    const next = [...rows];
    const [it] = next.splice(i, 1);
    next.splice(to, 0, it);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => (
        <fieldset key={i} className="rounded-lg border border-border bg-surface p-3">
          <legend className="flex w-full items-center justify-between gap-2 px-1 text-body font-medium text-fg">
            <span className="truncate">{title(row, i) || 'Nuova riga'}</span>
            <span className="flex shrink-0 gap-1">
              <IconButton icon={ArrowUp} label="Sposta su" size="sm" disabled={i === 0} onClick={() => move(i, i - 1)} />
              <IconButton icon={ArrowDown} label="Sposta giù" size="sm" disabled={i === rows.length - 1} onClick={() => move(i, i + 1)} />
              <IconButton icon={Trash2} label="Togli la riga" size="sm" onClick={() => onChange(rows.filter((_, j) => j !== i))} />
            </span>
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} className={f.wide || f.kind === 'textarea' ? 'sm:col-span-2' : undefined}>
                {f.kind === 'textarea' ? (
                  <Textarea rows={2} value={row[f.key]} onChange={(e) => set(i, f.key, e.target.value)} />
                ) : f.kind === 'select' ? (
                  <Select value={row[f.key]} onValueChange={(v) => set(i, f.key, v)} options={f.options ?? []} />
                ) : (
                  <Input value={row[f.key]} onChange={(e) => set(i, f.key, e.target.value)} />
                )}
              </Field>
            ))}
          </div>
        </fieldset>
      ))}
      <div>
        <Button variant="secondary" size="sm" icon={Plus} disabled={rows.length >= max} onClick={() => onChange([...rows, { ...blank }])}>
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
