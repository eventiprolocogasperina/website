'use client';

import { LogOut, Store } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState, ErrorState, ForbiddenState, Skeleton } from '@/components/ui';
import { FieldGate, type FieldSession } from '@/components/field/FieldGate';
import { makeApi } from './api';
import { SellScreen } from './SellScreen';
import { useCassaState } from './useCassaData';

/**
 * App della nuova cassa (§12.1), pensata per telefoni e tablet dei volontari da 360 px in su.
 * Ingresso: dispositivo abbinato → nome → PIN (FieldGate). Dall'admin si apre con ?edizione=.
 */
export function CassaApp({ adminEdition }: { adminEdition: string | null }) {
  return (
    <FieldGate kind="pos" posHref="/cassa" allowLegacyCode={false} offlineCacheKey="proloco-cassa-sessione">
      {(session, logout) => <CassaRoot session={session} logout={logout} adminEdition={adminEdition} />}
    </FieldGate>
  );
}

function CassaRoot({ session, logout, adminEdition }: { session: FieldSession; logout: () => Promise<void>; adminEdition: string | null }) {
  const edition = session.device ? null : adminEdition;
  if (!session.device && !edition) {
    return (
      <Shell>
        <EmptyState
          icon={Store}
          title="Scegli l’edizione dall’admin"
          description="Da computer apri la cassa dall’admin dell’edizione, in Cassa › Apri la cassa. Sui telefoni dei volontari serve un dispositivo abbinato."
        />
      </Shell>
    );
  }
  return <CassaLoaded session={session} logout={logout} adminEdition={edition} />;
}

function CassaLoaded({ session, logout, adminEdition }: { session: FieldSession; logout: () => Promise<void>; adminEdition: string | null }) {
  const api = useMemo(() => makeApi(adminEdition), [adminEdition]);
  const { state, reload } = useCassaState(api);

  if (state.status === 'loading') {
    return (
      <Shell>
        <div className="mx-auto flex w-full max-w-md flex-col gap-2" aria-busy="true" aria-label="Caricamento della cassa">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </Shell>
    );
  }
  if (state.status === 'forbidden') {
    return (
      <Shell onLogout={session.device ? logout : undefined}>
        <ForbiddenState />
      </Shell>
    );
  }
  if (state.status === 'error') {
    return (
      <Shell onLogout={session.device ? logout : undefined}>
        <ErrorState message={state.message} onRetry={reload} />
      </Shell>
    );
  }
  return <SellScreen api={api} state={state.data} cached={state.cached} reloadState={reload} logout={session.device ? logout : null} />;
}

export function Shell({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  return (
    <div className="ui-root min-h-dvh bg-bg px-4 py-6 text-fg">
      {onLogout && (
        <div className="mx-auto mb-4 flex max-w-md justify-end">
          <button type="button" onClick={onLogout} className="flex min-h-11 items-center gap-1 text-label text-muted">
            <LogOut size={16} aria-hidden /> Esci
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
