'use client';

import { Loader2, LogOut, Smartphone } from 'lucide-react';
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
  /** Indirizzo dell'app di cassa a cui rimandare un dispositivo pos (default la nuova /cassa). */
  posHref?: string;
  /** La vecchia cassa accetta anche il codice evento; la nuova /cassa no. */
  allowLegacyCode?: boolean;
  /**
   * Se indicata, l'ultima sessione si conserva sul telefono con questa chiave: senza rete l'app
   * si riapre lo stesso (la cassa offline, §12.1 punto 7). Il server ricontrolla tutto al rientro.
   */
  offlineCacheKey?: string;
};

function readCache(key?: string): FieldSession | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as FieldSession) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string | undefined, session: FieldSession) {
  if (!key) return;
  try {
    // Solo una sessione valida (dispositivo abbinato): una sessione scaduta non si riapre offline.
    if (session.device) localStorage.setItem(key, JSON.stringify(session));
    else localStorage.removeItem(key);
  } catch {
    // archivio del browser non disponibile: niente copia offline
  }
}

/**
 * Ingresso delle app da campo (§8.1): basta il dispositivo abbinato, il ruolo è scelto con il QR.
 * Senza dispositivo la cassa resta accessibile con il codice evento (flag legacy_event_code)
 * e lo scanner con la sessione dell'admin.
 */
export function FieldGate({ kind, children, posHref = '/cassa', allowLegacyCode = true, offlineCacheKey }: Props) {
  const [session, setSession] = useState<FieldSession | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/field/session', { cache: 'no-store' });
      const data = (await res.json()) as FieldSession;
      writeCache(offlineCacheKey, data);
      setSession(data);
      setFailed(false);
    } catch {
      const cached = readCache(offlineCacheKey);
      if (cached) setSession(cached);
      else setFailed(true);
    }
  }, [offlineCacheKey]);

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
          <a className="text-primary underline" href={device.kind === 'pos' ? posHref : '/scanner'}>
            {device.kind === 'pos' ? 'la cassa' : 'lo scanner'}
          </a>{' '}
          oppure chiedi un nuovo abbinamento.
        </p>
      </Screen>
    );
  }
  if (!device && kind === 'scanner' && !session.admin) {
    return (
      <Screen title="Dispositivo non abbinato">
        <p className="text-body text-muted">Chiedi a un responsabile di abbinare questo telefono allo scanner, dall’admin in Sistema › Utenti › Dispositivi.</p>
      </Screen>
    );
  }
  if (!device && kind === 'pos' && !(allowLegacyCode && session.legacyCode) && !session.admin) {
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
