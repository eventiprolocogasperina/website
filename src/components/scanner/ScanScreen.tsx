'use client';

import { Scanner, setZXingModuleOverrides } from '@yudiel/react-qr-scanner';
import { Camera, CameraOff, ListChecks, LogOut, Search, Volume2, VolumeX, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { Button, cn, focusRing, IconButton, Input } from '@/components/ui';
import { unlockAudio } from './feedback';
import { ResultOverlay } from './ResultOverlay';
import { SearchSheet } from './SearchSheet';
import { UndoBar } from './UndoBar';
import type { Choice, ScannerSetup } from './types';
import { useScanner } from './useScanner';

type Props = { setup: ScannerSetup; choice: Choice; who: string | null; deviceName: string | null; onChange: () => void; logout: () => Promise<void> };

const MUTE_KEY = 'scanner:muto';

// Su iOS (niente BarcodeDetector) la lettura usa ZXing in WebAssembly: lo serviamo dal sito
// (public/vendor/zxing, stessa versione di zxing-wasm) invece che dalla CDN, così funziona anche senza rete.
setZXingModuleOverrides({ locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? `/vendor/zxing/${path}` : prefix + path) });

/** Schermata di lavoro: contatori sempre in alto, fotocamera, esito a tutto schermo, ricerca manuale. */
export function ScanScreen({ setup, choice, who, deviceName, onChange, logout }: Props) {
  const [muted, setMuted] = useState(() => typeof window !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1');
  const [camera, setCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [search, setSearch] = useState<string | null>(null);
  const s = useScanner(setup, choice.listId, choice.sessionId, muted);
  const list = setup.lists.find((l) => l.id === choice.listId);
  const session = setup.sessions.find((x) => x.id === (list?.sessionId ?? choice.sessionId));

  function submitManual() {
    const v = manual.trim();
    if (!v) return;
    setManual('');
    // Un QR letto da un lettore esterno (tastiera) è una parola lunga; il resto è una ricerca.
    if (/^\S{16,}$/.test(v)) s.onCode(v);
    else setSearch(v);
  }

  return (
    <div className="ui-root flex min-h-dvh flex-col bg-bg" onPointerDown={unlockAudio}>
      <header className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onChange} className={cn('min-w-0 flex-1 rounded-lg text-left', focusRing)} aria-label="Cambia lista o data">
            <p className="truncate text-label text-muted">
              {list?.name ?? 'Lista'} · {session?.label ?? 'Tutte le date'}
            </p>
            <p className="text-title font-semibold tabular-nums" aria-live="polite">
              {s.counter ? (
                <>
                  {s.counter.entered} <span className="text-section font-normal text-muted">/ {s.counter.expected} entrati</span>
                </>
              ) : (
                <span className="text-section text-muted">—</span>
              )}
            </p>
          </button>
          <IconButton
            icon={muted ? VolumeX : Volume2}
            label={muted ? 'Riattiva il suono' : 'Silenzia'}
            variant="ghost"
            onClick={() => {
              setMuted(!muted);
              try {
                localStorage.setItem(MUTE_KEY, muted ? '0' : '1');
              } catch {}
            }}
          />
          <IconButton icon={ListChecks} label="Cambia lista o data" variant="ghost" onClick={onChange} />
          {deviceName && <IconButton icon={LogOut} label="Esci" variant="ghost" onClick={logout} />}
        </div>
        <p className="truncate text-caption text-muted">{[who, deviceName].filter(Boolean).join(' · ')}</p>
      </header>

      {(!s.online || s.offline.queued > 0) && (
        <div role="status" className="flex items-center gap-2 bg-warning-bg px-4 py-2 text-label text-warning">
          <WifiOff size={16} aria-hidden />
          <span className="flex-1">
            {!s.online ? 'Offline · sola lettura dall’elenco scaricato' : 'Sincronizzazione in corso'}
            {s.offline.queued > 0 && ` · ${s.offline.queued} da sincronizzare`}
          </span>
        </div>
      )}
      {s.offline.conflicts.length > 0 && (
        <div role="alert" className="flex items-center gap-2 bg-danger-bg px-4 py-2 text-label text-danger">
          <span className="flex-1">
            {s.offline.conflicts.length === 1 ? '1 ingresso offline non è stato registrato' : `${s.offline.conflicts.length} ingressi offline non sono stati registrati`} (già entrati da un altro telefono o non validi).
          </span>
          <button type="button" className={cn('underline', focusRing)} onClick={s.offline.clearConflicts}>
            Ok
          </button>
        </div>
      )}

      <main className="flex flex-1 flex-col gap-3 p-4">
        <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface-sunken">
          {camera ? (
            <Scanner
              onScan={(codes) => codes[0] && s.onCode(codes[0].rawValue)}
              onError={() => setCameraError('Fotocamera non disponibile. Controlla il permesso nelle impostazioni del browser, oppure cerca a mano.')}
              constraints={{ facingMode: 'environment' }}
              paused={!!s.outcome || s.busy}
              sound={false}
              allowMultiple
              scanDelay={400}
              components={{ finder: true, torch: true }}
              styles={{ container: { width: '100%', height: '100%' } }}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-body text-muted">Fotocamera spenta. Usa un lettore esterno o la ricerca qui sotto.</div>
          )}
          <button
            type="button"
            onClick={() => (setCamera(!camera), setCameraError(null))}
            className={cn('absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-surface/90 px-3 py-2 text-label shadow', focusRing)}
          >
            {camera ? <CameraOff size={16} aria-hidden /> : <Camera size={16} aria-hidden />} {camera ? 'Spegni' : 'Accendi'}
          </button>
        </div>
        {cameraError && <p className="text-center text-label text-danger">{cameraError}</p>}
        {s.error && (
          <p role="alert" className="text-center text-body text-danger">
            {s.error}
          </p>
        )}

        {s.undo && <UndoBar until={s.undo.until} onUndo={s.revertLast} />}

        <form
          className="mx-auto flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitManual();
          }}
        >
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Nome, codice ordine o QR" aria-label="Cerca per nome o codice" enterKeyHint="search" autoComplete="off" />
          <Button type="submit" icon={Search} variant="secondary" disabled={!s.online && !/^\S{16,}$/.test(manual.trim())}>
            Cerca
          </Button>
        </form>
      </main>

      {s.outcome && <ResultOverlay outcome={s.outcome} actions={setup.actions} onAction={s.runAction} onClose={s.dismiss} undo={s.undo} onUndo={s.revertLast} />}
      {search !== null && <SearchSheet listId={choice.listId} initial={search} onClose={() => setSearch(null)} onCheckIn={(ticketId) => (setSearch(null), s.submit({ ticketId }))} />}
    </div>
  );
}
