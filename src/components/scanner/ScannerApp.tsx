'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FieldGate, type FieldSession } from '@/components/field/FieldGate';
import { Button, TooltipProvider } from '@/components/ui';
import { api, qs } from './api';
import { ScanScreen } from './ScanScreen';
import { SetupScreen } from './SetupScreen';
import type { Choice, ScannerSetup } from './types';

const CHOICE_KEY = 'scanner:scelta:v1';

function readChoice(): Choice | null {
  try {
    return JSON.parse(localStorage.getItem(CHOICE_KEY) ?? 'null') as Choice | null;
  } catch {
    return null;
  }
}
function saveChoice(c: Choice | null) {
  try {
    if (c) localStorage.setItem(CHOICE_KEY, JSON.stringify(c));
    else localStorage.removeItem(CHOICE_KEY);
  } catch {
    // Navigazione privata: la scelta vale finché la pagina resta aperta.
  }
}

/** Scanner nuovo (§12.3): dispositivo → PIN → lista e data → fotocamera. */
export function ScannerApp() {
  return (
    <TooltipProvider>
      <FieldGate kind="scanner">{(session, logout) => <Scanner session={session} logout={logout} />}</FieldGate>
    </TooltipProvider>
  );
}

type Boot = { setup: ScannerSetup; canChangeEdition: boolean } | { editions: Array<{ slug: string; title: string }> };

function Scanner({ session, logout }: { session: FieldSession; logout: () => Promise<void> }) {
  const [edition, setEdition] = useState<string | null>(() => (session.device ? null : (readChoice()?.edition ?? null)));
  const [boot, setBoot] = useState<Boot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const b = await api<Boot>(`bootstrap?${qs({ edizione: edition })}`, { timeoutMs: 10_000 });
      setBoot(b);
      if ('setup' in b) {
        // Riprende la lista e la data scelte prima, se esistono ancora.
        const saved = readChoice();
        const list = b.setup.lists.find((l) => l.id === saved?.listId);
        if (saved && list && saved.edition === b.setup.edition.slug) setChoice({ ...saved, sessionId: list.sessionId ?? saved.sessionId });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossibile avviare lo scanner.');
    }
  }, [edition]);

  useEffect(() => {
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  if (error) {
    return (
      <Centered>
        <p className="text-body">{error}</p>
        <Button className="mt-4" onClick={load}>
          Riprova
        </Button>
      </Centered>
    );
  }
  if (!boot) {
    return (
      <Centered>
        <Loader2 aria-label="Caricamento" className="mx-auto animate-spin text-muted" />
      </Centered>
    );
  }

  if ('editions' in boot || !choice) {
    return (
      <SetupScreen
        boot={boot}
        who={session.user?.name ?? session.admin?.name ?? null}
        deviceName={session.device?.name ?? null}
        onEdition={(slug) => {
          setBoot(null);
          setEdition(slug);
        }}
        onChoose={(c) => {
          saveChoice(c);
          setChoice(c);
        }}
        logout={logout}
      />
    );
  }

  return (
    <ScanScreen
      key={choice.listId}
      setup={boot.setup}
      choice={choice}
      who={session.user?.name ?? session.admin?.name ?? null}
      deviceName={session.device?.name ?? null}
      onChange={() => setChoice(null)}
      logout={logout}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="ui-root flex min-h-dvh items-center justify-center bg-bg px-4 text-center">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
