'use client';

import { ExternalLink, Info, Monitor, Plus, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BlockPage } from '@/components/public/blocks/BlockRenderer';
import { BLOCK_TYPES, newBlock, type Block } from '@/components/public/blocks/schema';
import type { BlockData } from '@/components/public/blocks/types';
import { ButtonLink, ContextualSaveBar, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Button, PageHeader, toast, cn } from '@/components/ui';
import type { ActionResult } from '@/server/admin/run-action';
import { BlockList } from './BlockList';
import { BlockSheet } from './BlockSheet';
import { BLOCK_META } from './fields';

export type SavePage = (key: string, blocks: Block[], version: string) => Promise<ActionResult<{ version: string }>>;

type Props = {
  title: string;
  subtitle: string;
  back: { href: string; label: string };
  pageKey: string;
  initialBlocks: Block[];
  isDefault: boolean;
  version: string;
  data: BlockData;
  theme: string | null;
  publicUrl: string | null;
  readOnly: boolean;
  save: SavePage;
};

/**
 * Editor a blocchi (§13.4): elenco dei blocchi a sinistra (aggiungi, trascina, modifica in Sheet,
 * nascondi) e anteprima affiancata a destra, larga come un telefono o come un computer.
 * Si salva tutto insieme con la barra in basso; il server rivalida ogni blocco con zod.
 */
export function BlockEditor(p: Props) {
  const router = useRouter();
  const [blocks, setBlocks] = useState(p.initialBlocks);
  const [version, setVersion] = useState(p.version);
  const [dirty, setDirty] = useState(p.isDefault);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone');
  const editingBlock = blocks.find((b) => b.id === editing) ?? null;
  const previewData = useMemo(() => ({ ...p.data, preview: true }), [p.data]);

  const change = (next: Block[]) => {
    setBlocks(next);
    setDirty(true);
  };
  const add = (type: Block['type']) => {
    const b = newBlock(type);
    change([...blocks, b]);
    setEditing(b.id);
  };

  async function submit() {
    setSaving(true);
    const res = await p.save(p.pageKey, blocks, version);
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    if (res.data) setVersion(res.data.version);
    setDirty(false);
    toast.success('Pagina salvata');
    router.refresh();
  }

  return (
    <>
      <PageHeader
        title={p.title}
        subtitle={p.subtitle}
        back={p.back}
        secondaryActions={
          p.publicUrl ? (
            <ButtonLink href={p.publicUrl} variant="secondary" icon={ExternalLink} target="_blank">
              Apri la pagina
            </ButtonLink>
          ) : undefined
        }
        primaryAction={
          !p.readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button icon={Plus}>Aggiungi blocco</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-[70vh] w-80 overflow-y-auto">
                {BLOCK_TYPES.map((t) => (
                  <DropdownMenuItem key={t} onSelect={() => add(t)}>
                    <span className="flex flex-col">
                      <span className="font-medium">{BLOCK_META[t].label}</span>
                      <span className="text-label text-muted">{BLOCK_META[t].description}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />
      {(p.isDefault || p.readOnly) && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-surface-sunken px-4 py-3 text-body text-muted">
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
          {p.readOnly ? 'L’edizione è archiviata: la pagina si può guardare ma non modificare.' : 'Questa pagina non è ancora stata salvata: ti proponiamo una struttura di partenza. Modificala e salva.'}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,400px)_1fr]">
        <BlockList blocks={blocks} readOnly={p.readOnly} onChange={change} onEdit={setEditing} />
        <section aria-label="Anteprima" className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-section font-semibold text-fg">Anteprima</h2>
            <div role="group" aria-label="Larghezza dell’anteprima" className="flex gap-1 rounded-md border border-border p-0.5">
              {(
                [
                  ['phone', Smartphone, 'Telefono'],
                  ['desktop', Monitor, 'Computer'],
                ] as const
              ).map(([key, Icon, label]) => (
                <button key={key} type="button" aria-pressed={device === key} onClick={() => setDevice(key)} className={cn('inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-label', device === key ? 'bg-primary text-primary-fg' : 'text-muted hover:bg-surface-sunken')}>
                  <Icon size={15} aria-hidden /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="sticky top-4 max-h-[calc(100vh-7rem)] overflow-auto rounded-xl border border-border bg-surface-sunken p-2 lg:p-4">
            <div className={cn('mx-auto overflow-hidden rounded-lg shadow-md', device === 'phone' ? 'max-w-[390px]' : 'max-w-full')} inert>
              <BlockPage blocks={blocks} data={previewData} theme={p.theme} style={{ minHeight: 0 }} />
            </div>
          </div>
        </section>
      </div>
      {editingBlock && !p.readOnly && <BlockSheet key={editingBlock.id} block={editingBlock} onChange={(b) => change(blocks.map((x) => (x.id === b.id ? b : x)))} onClose={() => setEditing(null)} />}
      {!p.readOnly && <ContextualSaveBar dirty={dirty} saving={saving} onSave={submit} onDiscard={() => (setBlocks(p.initialBlocks), setDirty(p.isDefault))} />}
    </>
  );
}
