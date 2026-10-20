'use client';

import { useState } from 'react';
import { BLOCK_SCHEMAS, type Block } from '@/components/public/blocks/schema';
import { Button, Sheet, SheetContent } from '@/components/ui';
import { BLOCK_META } from './fields';
import { FieldInput } from './FieldInput';

/**
 * Modifica di un blocco nella Sheet (a sinistra, così l'anteprima resta visibile). Ogni modifica
 * valida passa subito all'anteprima; "Annulla" rimette le props com'erano all'apertura.
 */
export function BlockSheet({ block, onChange, onClose }: { block: Block; onChange: (b: Block) => void; onClose: () => void }) {
  const [original] = useState(block);
  const [draft, setDraft] = useState<Record<string, unknown>>(block.props as Record<string, unknown>);
  const [error, setError] = useState('');
  const meta = BLOCK_META[block.type];

  function update(key: string, value: unknown) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    const r = BLOCK_SCHEMAS[block.type].safeParse(next);
    if (r.success) {
      setError('');
      onChange({ ...block, props: r.data } as Block);
    } else {
      const issue = r.error.issues[0];
      const where = issue?.path.length ? meta.fields.find((f) => f.key === issue.path[0])?.label : null;
      setError(`${where ? `${where}: ` : ''}${issue?.message ?? 'Valore non valido.'}`);
    }
  }

  function cancel() {
    onChange(original);
    onClose();
  }

  return (
    <Sheet open modal={false} onOpenChange={(o) => !o && (error ? cancel() : onClose())}>
      <SheetContent
        side="left"
        title={meta.label}
        description={meta.description}
        footer={
          <>
            <Button variant="secondary" onClick={cancel}>
              Annulla
            </Button>
            <Button onClick={onClose} disabled={!!error}>
              Fatto
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {meta.fields.map((f) => (
            <FieldInput key={f.key} spec={f} value={draft[f.key]} onChange={(v) => update(f.key, v)} />
          ))}
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
