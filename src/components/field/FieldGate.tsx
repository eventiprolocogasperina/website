'use client';

import { ArrowLeft, Delete, Loader2, LogOut, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button, cn, focusRing } from '@/components/ui';

export type FieldSession = {
  device: { name: string; kind: 'pos' | 'scanner'; edition: string; editionTitle: string } | null;
  user: { id: string; name: string } | null;
  users: Array<{ id: string; name: string }>;
  admin: { name: string } | null;
  legacyCode: boolean;
};

type Props = {
  kind: 'pos' | 'scanner';
  /** Contenuto dell'app; riceve chi è entrato (null se si usa il vecchio codice evento o l'admin). */
  children: (session: FieldSession, logout: () => Promise<void>) => ReactNode;
};

/**
 * Ingresso delle app da campo (§8.1): dispositivo abbinato → nome → PIN.
 * Senza dispositivo la cassa resta accessibile con il codice evento (flag legacy_event_code)
 * e lo scanner con la sessione dell'admin.
 */
export function FieldGate({ kind, children }: Props) {
  const [session, setSession] = useState<FieldSession | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/field/session', { cache: 'no-store' });
      setSession(await res.json());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const logout = useCallback(async () => {
    await fetch('/api/field/logout', { method: 'POST' });
    await load();
  }, [load]);

  if (failed) {
    return (
      <Screen>
        <p className="text-body">Connessione assente. Controlla la rete e riprova.</p>
        <Button onClick={load} className="mt-4">
          Riprova
        </Button>
      </Screen>
    );
  }
  if (!session) {
    return (
      <Screen>
        <Loader2 aria-label="Caricamento" className="mx-auto animate-spin text-muted" />
      </Screen>
    );
  }

  const { device } = session;
  if (device && device.kind !== kind) {
    return (
      <Screen title="Dispositivo per un’altra app">
        <p className="text-body text-muted">
          “{device.name}” è abbinato {device.kind === 'pos' ? 'alla cassa' : 'allo scanner'}. Apri{' '}
          <a className="text-primary underline" href={device.kind === 'pos' ? '/cashier' : '/scanner'}>
            {device.kind === 'pos' ? 'la cassa' : 'lo scanner'}
          </a>{' '}
          oppure chiedi un nuovo abbinamento.
        </p>
      </Screen>
    );
  }
  if (device && !session.user) return <PinScreen session={session} onDone={load} />;
  if (!device && kind === 'scanner' && !session.admin) {
    return (
      <Screen title="Dispositivo non abbinato">
        <p className="text-body text-muted">Chiedi a un responsabile di abbinare questo telefono allo scanner, dall’admin in Sistema › Utenti › Dispositivi.</p>
      </Screen>
    );
  }
  if (!device && kind === 'pos' && !session.legacyCode && !session.admin) {
    return (
      <Screen title="Dispositivo non abbinato">
        <p className="text-body text-muted">Chiedi a un responsabile di abbinare questo dispositivo alla cassa, dall’admin in Sistema › Utenti › Dispositivi.</p>
      </Screen>
    );
  }
  return <>{children(session, logout)}</>;
}

function Screen({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="ui-root flex min-h-dvh items-center justify-center bg-bg px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        {title && (
          <>
            <Smartphone aria-hidden className="mx-auto mb-3 text-muted" />
            <h1 className="mb-2 text-section font-semibold">{title}</h1>
          </>
        )}
        {children}
      </div>
    </div>
  );
}

function PinScreen({ session, onDone }: { session: FieldSession; onDone: () => Promise<void> }) {
  const [who, setWho] = useState<{ id: string; name: string } | null>(session.users.length === 1 ? session.users[0] : null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const device = session.device!;

  async function submit(value = pin) {
    if (!who || value.length < 4) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/field/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: who.id, pin: value }) });
    setBusy(false);
    if (res.ok) return onDone();
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? 'PIN non accettato.');
    setPin('');
    if (data.locked) setWho(null);
  }

  const press = (d: string) => {
    if (busy) return;
    setError('');
    setPin((p) => (p.length < 6 ? p + d : p));
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!who) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1));
      else if (e.key === 'Enter') submit();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="ui-root flex min-h-dvh flex-col items-center bg-bg px-4 py-8">
      <div className="w-full max-w-sm">
        <p className="text-center text-label text-muted">
          {device.name} · {device.editionTitle}
        </p>
        {!who ? (
          <>
            <h1 className="mt-1 mb-6 text-center text-title font-semibold">Chi sei?</h1>
            {error && (
              <p role="alert" className="mb-4 text-center text-body text-danger">
                {error}
              </p>
            )}
            {session.users.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface p-4 text-center text-body text-muted">
                Nessun volontario può entrare qui. Un responsabile deve assegnare il ruolo per {device.editionTitle} e impostare il PIN.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {session.users.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setWho(u);
                        setError('');
                      }}
                      className={cn('flex min-h-16 w-full items-center rounded-xl border border-border bg-surface px-4 text-left text-section font-medium hover:bg-surface-sunken', focusRing)}
                    >
                      {u.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="mt-1 mb-6 flex items-center justify-center gap-2">
              {session.users.length > 1 && (
                <button type="button" onClick={() => (setWho(null), setPin(''), setError(''))} aria-label="Cambia persona" className={cn('rounded-lg p-2 text-muted hover:bg-surface-sunken', focusRing)}>
                  <ArrowLeft size={20} aria-hidden />
                </button>
              )}
              <h1 className="text-title font-semibold">Ciao {who.name.split(' ')[0]}, il tuo PIN</h1>
            </div>
            <div className="mb-2 flex justify-center gap-3" aria-live="polite" aria-label={`${pin.length} cifre inserite`}>
              {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                <span key={i} className={cn('h-4 w-4 rounded-full border-2 border-border-strong', i < pin.length && 'border-primary bg-primary')} />
              ))}
            </div>
            <p role="alert" className="mb-4 min-h-6 text-center text-body text-danger">
              {error}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <Key key={d} onClick={() => press(d)}>
                  {d}
                </Key>
              ))}
              <Key onClick={() => setPin((p) => p.slice(0, -1))} label="Cancella">
                <Delete aria-hidden />
              </Key>
              <Key onClick={() => press('0')}>0</Key>
              <Key onClick={() => submit()} label="Entra" primary disabled={pin.length < 4 || busy}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : 'OK'}
              </Key>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Key({ children, onClick, label, primary, disabled }: { children: ReactNode; onClick: () => void; label?: string; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'flex h-16 items-center justify-center rounded-xl text-title font-semibold tabular-nums disabled:opacity-40',
        primary ? 'bg-primary text-primary-fg' : 'border border-border bg-surface text-fg active:bg-surface-sunken',
        focusRing,
      )}
    >
      {children}
    </button>
  );
}

/** Barra sottile con chi è entrato e il pulsante Esci, per lo scanner. */
export function FieldUserBar({ session, logout }: { session: FieldSession; logout: () => Promise<void> }) {
  if (!session.user || !session.device) return null;
  return (
    <div className="ui-root flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2 text-label">
      <span className="truncate text-muted">
        <span className="font-medium text-fg">{session.user.name}</span> · {session.device.name}
      </span>
      <button type="button" onClick={logout} className={cn('flex items-center gap-1 rounded px-2 py-1 text-muted hover:text-fg', focusRing)}>
        <LogOut size={14} aria-hidden /> Esci
      </button>
    </div>
  );
}
