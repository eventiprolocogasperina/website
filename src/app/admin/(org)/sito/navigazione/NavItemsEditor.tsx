'use client';

import { ArrowDown, ArrowUp, Layers, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Input } from '@/components/ui';
import type { NavChild, NavConfig, NavEntry } from '@/lib/public/nav';

// Elenco delle voci del menu: testo, indirizzo, ordine (frecce, accessibili da tastiera) e sottovoci.

type Props = { items: NavConfig['items']; onChange: (items: NavConfig['items']) => void; disabled?: boolean };

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

function Reorder({ index, length, onMove, label, disabled }: { index: number; length: number; onMove: (to: number) => void; label: string; disabled?: boolean }) {
  return (
    <span className="flex shrink-0 gap-1">
      <IconButton icon={ArrowUp} label={`Sposta su: ${label}`} size="sm" variant="ghost" disabled={disabled || index === 0} onClick={() => onMove(index - 1)} />
      <IconButton icon={ArrowDown} label={`Sposta giù: ${label}`} size="sm" variant="ghost" disabled={disabled || index === length - 1} onClick={() => onMove(index + 1)} />
    </span>
  );
}

export function NavItemsEditor({ items, onChange, disabled }: Props) {
  const update = (i: number, patch: Partial<NavEntry>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const updateChild = (i: number, c: number, patch: Partial<Extract<NavChild, { kind: 'link' }>>) =>
    update(i, { children: items[i].children.map((ch, k) => (k === c && ch.kind === 'link' ? { ...ch, ...patch } : ch)) });

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input aria-label={`Testo della voce ${i + 1}`} value={item.label} onChange={(e) => update(i, { label: e.target.value })} disabled={disabled} className="sm:w-48" />
              <Input aria-label={`Indirizzo della voce ${i + 1}`} value={item.href} onChange={(e) => update(i, { href: e.target.value })} disabled={disabled} placeholder="/pagina" />
              <span className="flex items-center gap-1">
                <Reorder index={i} length={items.length} label={item.label} disabled={disabled} onMove={(to) => onChange(move(items, i, to))} />
                <IconButton icon={Trash2} label={`Togli la voce ${item.label}`} size="sm" variant="ghost" disabled={disabled || items.length === 1} onClick={() => onChange(items.filter((_, j) => j !== i))} />
              </span>
            </div>

            {item.children.length > 0 && (
              <ol className="mt-3 flex flex-col gap-2 border-l-2 border-border pl-3" aria-label={`Sottovoci di ${item.label}`}>
                {item.children.map((child, c) => (
                  <li key={c} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {child.kind === 'link' ? (
                      <>
                        <Input aria-label="Testo della sottovoce" value={child.label} onChange={(e) => updateChild(i, c, { label: e.target.value })} disabled={disabled} className="sm:w-44" />
                        <Input aria-label="Indirizzo della sottovoce" value={child.href} onChange={(e) => updateChild(i, c, { href: e.target.value })} disabled={disabled} />
                      </>
                    ) : (
                      <span className="flex flex-1 items-center gap-2 text-body text-muted">
                        <Layers size={16} aria-hidden /> Format con una pagina pubblica (si aggiornano da soli)
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Reorder
                        index={c}
                        length={item.children.length}
                        label={child.kind === 'link' ? child.label : 'format'}
                        disabled={disabled}
                        onMove={(to) => update(i, { children: move(item.children, c, to) })}
                      />
                      <IconButton icon={Trash2} label="Togli la sottovoce" size="sm" variant="ghost" disabled={disabled} onClick={() => update(i, { children: item.children.filter((_, k) => k !== c) })} />
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" icon={Plus} disabled={disabled || item.children.length >= 12} onClick={() => update(i, { children: [...item.children, { kind: 'link', label: '', href: '/' }] })}>
                Sottovoce
              </Button>
              {!item.children.some((c) => c.kind === 'formats') && (
                <Button variant="ghost" size="sm" icon={Layers} disabled={disabled} onClick={() => update(i, { children: [...item.children, { kind: 'formats' }] })}>
                  Aggiungi i format
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div>
        <Button variant="secondary" icon={Plus} disabled={disabled || items.length >= 10} onClick={() => onChange([...items, { label: '', href: '/', children: [] }])}>
          Aggiungi una voce
        </Button>
      </div>
    </div>
  );
}
