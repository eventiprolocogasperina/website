'use client';

import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, LayoutTemplate, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { newBlock, type Block } from '@/components/public/blocks/schema';
import { ConfirmDialog, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, EmptyState, IconButton, cn } from '@/components/ui';
import { BLOCK_META, blockSummary } from './fields';

/** Sposta l'elemento `from` in posizione `to` (indici dell'array di partenza). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Elenco dei blocchi: si riordina trascinando la maniglia, oppure da tastiera con Alt+↑/↓ sulla
 * riga (e dal menu ⋯). L'occhio nasconde il blocco senza toglierlo.
 */
export function BlockList({ blocks, readOnly, onChange, onEdit }: { blocks: Block[]; readOnly: boolean; onChange: (b: Block[]) => void; onEdit: (id: string) => void }) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [removing, setRemoving] = useState<Block | null>(null);
  const [announce, setAnnounce] = useState('');

  const move = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    onChange(moveItem(blocks, from, to));
    setAnnounce(`${BLOCK_META[blocks[from].type].label} spostato in posizione ${to + 1} di ${blocks.length}.`);
  };
  const patch = (id: string, p: Partial<Block>) => onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...p } as Block) : b)));

  if (!blocks.length) {
    return <EmptyState icon={LayoutTemplate} title="Nessun blocco" description="Aggiungi il primo blocco con il pulsante in alto: di solito una Copertina." />;
  }

  return (
    <section aria-label="Blocchi della pagina">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <ol className="flex flex-col gap-2">
        {blocks.map((b, i) => {
          const meta = BLOCK_META[b.type];
          return (
            <li
              key={b.id}
              tabIndex={readOnly ? undefined : 0}
              aria-label={`${meta.label}, posizione ${i + 1} di ${blocks.length}${b.hidden ? ', nascosto' : ''}`}
              draggable={!readOnly}
              onDragStart={(e) => {
                setDragging(i);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                if (dragging === null) return;
                e.preventDefault();
                setOver(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging !== null) move(dragging, i);
                setDragging(null);
                setOver(null);
              }}
              onDragEnd={() => (setDragging(null), setOver(null))}
              onKeyDown={(e) => {
                if (readOnly || e.target !== e.currentTarget) return;
                if (e.altKey && e.key === 'ArrowUp') (e.preventDefault(), move(i, i - 1));
                else if (e.altKey && e.key === 'ArrowDown') (e.preventDefault(), move(i, i + 1));
                else if (e.key === 'Enter') onEdit(b.id);
              }}
              className={cn(
                'flex items-center gap-2 rounded-lg border bg-surface px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                over === i && dragging !== i ? 'border-primary' : 'border-border',
                dragging === i && 'opacity-50',
                b.hidden && 'bg-surface-sunken',
              )}
            >
              {!readOnly && <GripVertical size={18} className="shrink-0 cursor-grab text-muted" aria-hidden />}
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit(b.id)} disabled={readOnly}>
                <span className={cn('block text-body font-medium', b.hidden ? 'text-muted line-through' : 'text-fg')}>{meta.label}</span>
                <span className="block truncate text-label text-muted">{blockSummary(b.props as Record<string, unknown>) || meta.description}</span>
              </button>
              {!readOnly && (
                <>
                  <IconButton icon={b.hidden ? EyeOff : Eye} label={b.hidden ? 'Mostra il blocco' : 'Nascondi il blocco'} size="sm" onClick={() => patch(b.id, { hidden: !b.hidden })} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <IconButton icon={MoreHorizontal} label={`Azioni: ${meta.label}`} size="sm" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem icon={Pencil} onSelect={() => onEdit(b.id)}>
                        Modifica
                      </DropdownMenuItem>
                      <DropdownMenuItem icon={ArrowUp} disabled={i === 0} onSelect={() => move(i, i - 1)} shortcut="Alt ↑">
                        Sposta su
                      </DropdownMenuItem>
                      <DropdownMenuItem icon={ArrowDown} disabled={i === blocks.length - 1} onSelect={() => move(i, i + 1)} shortcut="Alt ↓">
                        Sposta giù
                      </DropdownMenuItem>
                      <DropdownMenuItem icon={Copy} onSelect={() => onChange([...blocks.slice(0, i + 1), newBlock(b.type, b.props as never), ...blocks.slice(i + 1)])}>
                        Duplica
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => setRemoving(b)}>
                        Elimina
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </li>
          );
        })}
      </ol>
      {!readOnly && <p className="mt-3 text-label text-muted">Trascina la maniglia per riordinare, oppure Alt+↑/↓ sulla riga selezionata.</p>}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Eliminare il blocco “${removing ? BLOCK_META[removing.type].label : ''}”?`}
        description="Il blocco sparisce dalla pagina quando salvi. Per toglierlo solo per un po’, nascondilo con l’occhio."
        confirmLabel="Elimina il blocco"
        tone="danger"
        onConfirm={() => {
          if (removing) onChange(blocks.filter((b) => b.id !== removing.id));
          setRemoving(null);
        }}
      />
    </section>
  );
}
