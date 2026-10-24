'use client';

import { CalendarDays, ListChecks, LogOut, ScanLine } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button, cn, focusRing } from '@/components/ui';
import { unlockAudio } from './feedback';
import type { Choice, ScannerSetup } from './types';

type Props = {
  boot: { setup: ScannerSetup; canChangeEdition: boolean } | { editions: Array<{ slug: string; title: string }> };
  who: string | null;
  deviceName: string | null;
  onEdition: (slug: string | null) => void;
  onChoose: (c: Choice) => void;
  logout: () => Promise<void>;
};

/** Scelta dell'edizione (solo admin senza dispositivo), della lista di check-in e della data. */
export function SetupScreen({ boot, who, deviceName, onEdition, onChoose, logout }: Props) {
  return (
    <div className="ui-root min-h-dvh bg-bg px-4 py-6" onPointerDown={unlockAudio}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="flex items-center justify-between gap-2 text-label text-muted">
          <span className="truncate">{[who, deviceName].filter(Boolean).join(' · ') || 'Scanner'}</span>
          {deviceName && (
            <button type="button" onClick={logout} className={cn('flex items-center gap-1 rounded px-2 py-1 hover:text-fg', focusRing)}>
              <LogOut size={14} aria-hidden /> Esci
            </button>
          )}
        </header>
        {'editions' in boot ? <Editions editions={boot.editions} onPick={onEdition} /> : <Lists setup={boot.setup} canChangeEdition={boot.canChangeEdition} onEdition={onEdition} onChoose={onChoose} />}
      </div>
    </div>
  );
}

function Editions({ editions, onPick }: { editions: Array<{ slug: string; title: string }>; onPick: (slug: string) => void }) {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-title font-semibold">Quale evento controlli?</h1>
      {editions.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-body text-muted">Non hai il permesso di fare check-in su nessuna edizione attiva.</p>
      ) : (
        editions.map((e) => (
          <BigChoice key={e.slug} onClick={() => onPick(e.slug)} icon={<ScanLine aria-hidden />}>
            {e.title}
          </BigChoice>
        ))
      )}
    </section>
  );
}

function Lists({ setup, canChangeEdition, onEdition, onChoose }: { setup: ScannerSetup; canChangeEdition: boolean; onEdition: (slug: string | null) => void; onChoose: (c: Choice) => void }) {
  const [listId, setListId] = useState<string | null>(setup.lists.length === 1 ? setup.lists[0].id : null);
  const [sessionId, setSessionId] = useState<string | null>(setup.todaySessionId);
  const list = setup.lists.find((l) => l.id === listId);
  const fixed = list?.sessionId ? setup.sessions.find((s) => s.id === list.sessionId) : null;

  return (
    <>
      <div>
        <p className="text-label text-muted">{setup.edition.title}</p>
        <h1 className="text-title font-semibold">Prepara lo scanner</h1>
        {canChangeEdition && (
          <button type="button" className={cn('mt-1 text-label text-primary underline', focusRing)} onClick={() => onEdition(null)}>
            Cambia evento
          </button>
        )}
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="scelta-lista">
        <h2 id="scelta-lista" className="flex items-center gap-2 text-section font-semibold">
          <ListChecks size={18} aria-hidden /> Lista di check-in
        </h2>
        {setup.lists.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-body text-muted">Nessuna lista per questo evento. Un responsabile la crea dall’admin, in Check-in › Liste.</p>
        ) : (
          setup.lists.map((l) => (
            <BigChoice key={l.id} selected={l.id === listId} onClick={() => setListId(l.id)}>
              {l.name}
              {l.allowMultiple && <span className="ml-2 text-label font-normal text-muted">più ingressi</span>}
            </BigChoice>
          ))
        )}
      </section>

      {setup.sessions.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="scelta-data">
          <h2 id="scelta-data" className="flex items-center gap-2 text-section font-semibold">
            <CalendarDays size={18} aria-hidden /> Data
          </h2>
          {fixed ? (
            <p className="text-body text-muted">Questa lista vale solo per {fixed.label}.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {setup.sessions.map((s) => (
                <Chip key={s.id} selected={sessionId === s.id} onClick={() => setSessionId(s.id)}>
                  {s.label}
                  {s.id === setup.todaySessionId ? ' · oggi' : ''}
                </Chip>
              ))}
              <Chip selected={sessionId === null} onClick={() => setSessionId(null)}>
                Tutte le date
              </Chip>
            </div>
          )}
          {!fixed && sessionId === null && <p className="text-label text-warning">Con “Tutte le date” un biglietto di un altro giorno entra senza avviso.</p>}
        </section>
      )}

      <Button size="lg" className="w-full" disabled={!list} onClick={() => list && onChoose({ edition: setup.edition.slug, listId: list.id, sessionId: list.sessionId ?? sessionId })}>
        Inizia a scansionare
      </Button>
    </>
  );
}

function BigChoice({ children, onClick, selected, icon }: { children: ReactNode; onClick: () => void; selected?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex min-h-16 w-full items-center gap-3 rounded-xl border bg-surface px-4 text-left text-section font-medium',
        selected ? 'border-primary ring-2 ring-primary' : 'border-border hover:bg-surface-sunken',
        focusRing,
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
    </button>
  );
}

function Chip({ children, onClick, selected }: { children: ReactNode; onClick: () => void; selected: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn('min-h-11 rounded-full border px-4 text-body', selected ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-fg', focusRing)}
    >
      {children}
    </button>
  );
}
