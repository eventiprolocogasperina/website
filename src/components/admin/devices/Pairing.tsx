'use client';

import { useEffect, useState } from 'react';
import { Button, Checkbox, Dialog, DialogContent, Field, Input, RadioGroup, Select } from '@/components/ui';
import { DEVICE_KIND_LABEL, DEVICE_PERMISSIONS, DEVICE_PRESETS, presetFor, type DeviceKind } from '@/lib/devices/permissions';
import type { Permission } from '@/server/auth/permissions';
import type { DeviceRow, RegisterOption } from '@/server/domain/devices';

// Pezzi comuni ai dialoghi dei dispositivi (Sistema › Utenti, Cassa e Check-in dell'edizione):
// abbinamento con QR e PIN, già con nome, persona, cassa e permessi, e modifica dopo l'abbinamento.

export type { DeviceKind };

type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
export type PairingResult = { url: string; qr: string; pin: string; expiresAt: string };

export type DeviceConfig = { name: string; holderName: string; holderPhone: string; registerId: string | null; permissions: Permission[] };

/** Ruolo del dispositivo, scelto nel dialogo e assegnato all'abbinamento. */
export function DeviceRoleField({ value, onChange }: { value: DeviceKind; onChange: (kind: DeviceKind) => void }) {
  return (
    <Field label="Ruolo del dispositivo" help="Decide cosa apre il telefono dopo l’abbinamento.">
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as DeviceKind)}
        orientation="horizontal"
        options={[
          { value: 'pos', label: 'Cassa' },
          { value: 'scanner', label: 'Varco (scanner biglietti)' },
        ]}
      />
    </Field>
  );
}

/** PIN di abbinamento accanto al QR: si digita sul telefono, insieme al QR vale una volta sola. */
export function PairingPin({ pin }: { pin: string }) {
  return (
    <div className="w-full rounded-xl border border-border bg-surface-sunken px-4 py-3 text-center">
      <p className="text-label text-muted">PIN da digitare sul dispositivo</p>
      <p className="text-[2rem] leading-tight font-semibold tracking-[0.3em] tabular-nums" aria-label={`PIN ${pin.split('').join(' ')}`}>
        {pin.slice(0, 3)} {pin.slice(3)}
      </p>
      <p className="text-caption text-muted">Dopo 5 PIN sbagliati il QR non vale più.</p>
    </div>
  );
}

/** Riassunto dei permessi per gli elenchi: "Vendere, Omaggi, …". */
export function permissionSummary(kind: DeviceKind, permissions: readonly Permission[]): string {
  return DEVICE_PERMISSIONS[kind]
    .filter((p) => !p.required && permissions.includes(p.permission))
    .map((p) => p.label)
    .join(', ') || 'Solo il necessario';
}

/** Nome, persona, cassa e permessi del dispositivo. Usato prima del QR e nella modifica. */
function DeviceConfigFields({ kind, config, onChange, registers, error }: { kind: DeviceKind; config: DeviceConfig; onChange: (c: DeviceConfig) => void; registers: RegisterOption[]; error?: string }) {
  const set = (patch: Partial<DeviceConfig>) => onChange({ ...config, ...patch });
  const register = registers.find((r) => r.id === config.registerId) ?? null;
  const toggle = (p: Permission, on: boolean) => set({ permissions: on ? [...config.permissions, p] : config.permissions.filter((x) => x !== p) });
  const presets = DEVICE_PRESETS.filter((p) => p.kind === kind);
  const choosable = registers.filter((r) => r.active || r.id === config.registerId);

  return (
    <div className="flex flex-col gap-4">
      <Field label="Nome del dispositivo" help="Come lo riconosci all’evento, es. “Cassa 1” o “Ingresso nord”." required>
        <Input value={config.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Affidato a" help="Chi lo usa, facoltativo.">
          <Input value={config.holderName} onChange={(e) => set({ holderName: e.target.value })} maxLength={80} placeholder="Es. Anna dello stand" />
        </Field>
        <Field label="Telefono" help="Facoltativo, per chiamarlo all’evento.">
          <Input value={config.holderPhone} onChange={(e) => set({ holderPhone: e.target.value })} maxLength={30} inputMode="tel" autoComplete="off" />
        </Field>
      </div>
      {kind === 'pos' && (
        <Field label="Cassa" required help={choosable.length ? 'Il telefono lavora solo su questa cassa, senza sceglierla.' : 'Crea prima una cassa in Cassa › Casse.'}>
          <Select
            value={config.registerId ?? ''}
            onValueChange={(v) => set({ registerId: v || null })}
            placeholder="Scegli la cassa"
            options={choosable.map((r) => ({ value: r.id, label: r.active ? r.name : `${r.name} (spenta)` }))}
          />
        </Field>
      )}
      <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <legend className="px-1 text-label font-medium text-fg">Cosa può fare</legend>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button key={p.key} size="sm" variant="secondary" onClick={() => set({ permissions: p.permissions.filter((x) => x !== 'pos.open_amount' || !register || register.allowOpenAmount) })}>
              {p.label}
            </Button>
          ))}
        </div>
        {DEVICE_PERMISSIONS[kind].map((p) => {
          const altroOff = p.permission === 'pos.open_amount' && !!register && !register.allowOpenAmount;
          return (
            <Checkbox
              key={p.permission}
              label={p.label}
              description={altroOff ? `«Altro» è spento su ${register!.name}.` : p.help}
              checked={p.required || (!altroOff && config.permissions.includes(p.permission))}
              disabled={p.required || altroOff}
              onCheckedChange={(on) => toggle(p.permission, on)}
            />
          );
        })}
      </fieldset>
      {error && (
        <p role="alert" className="text-body text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** «Altro» non si concede su una cassa che non lo permette (il server lo rifiuterebbe). */
function cleanConfig(kind: DeviceKind, config: DeviceConfig, registers: RegisterOption[]): DeviceConfig {
  if (kind !== 'pos') return { ...config, registerId: null };
  const register = registers.find((r) => r.id === config.registerId);
  return register && !register.allowOpenAmount ? { ...config, permissions: config.permissions.filter((p) => p !== 'pos.open_amount') } : config;
}

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
  return <p className="text-label text-muted">{left ? `Vale ancora ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Scaduto: generane uno nuovo.'}</p>;
}

const emptyConfig = (kind: DeviceKind): DeviceConfig => ({ name: '', holderName: '', holderPhone: '', registerId: null, permissions: presetFor(kind).permissions });

/**
 * Abbina un dispositivo: prima nome, persona, edizione, ruolo, cassa e permessi, poi QR e PIN.
 * `editions` con una sola voce = dialogo di un'edizione (niente scelta).
 */
export function PairDeviceDialog({
  editions,
  registersByEdition,
  defaultKind,
  onPair,
  onClose,
}: {
  editions: Array<{ slug: string; title: string }>;
  registersByEdition: Record<string, RegisterOption[]>;
  defaultKind: DeviceKind;
  onPair: (input: Omit<DeviceConfig, 'registerId'> & { registerId: string | null; edition: string; kind: DeviceKind }) => Promise<ActionResult<PairingResult>>;
  onClose: () => void;
}) {
  const [edition, setEdition] = useState(editions[0]?.slug ?? '');
  const [kind, setKind] = useState<DeviceKind>(defaultKind);
  const registers = registersByEdition[edition] ?? [];
  const firstRegister = (slug: string) => (registersByEdition[slug] ?? []).find((r) => r.active)?.id ?? null;
  const [config, setConfig] = useState<DeviceConfig>(() => ({ ...emptyConfig(defaultKind), registerId: firstRegister(editions[0]?.slug ?? '') }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PairingResult | null>(null);

  function changeKind(k: DeviceKind) {
    setKind(k);
    setConfig((c) => ({ ...c, permissions: presetFor(k).permissions }));
  }

  async function create() {
    setBusy(true);
    setError('');
    const res = await onPair({ ...cleanConfig(kind, config, registers), edition, kind });
    setBusy(false);
    if (!res.ok) setError(res.error);
    else if (res.data) setResult(res.data);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={result ? `Inquadra il QR con “${config.name}”` : 'Abbina un dispositivo'}
        description={result ? 'Apri la fotocamera del telefono o del tablet, inquadra il codice e digita il PIN. Vale 10 minuti e una sola volta.' : 'Scegli prima a chi va e cosa può fare: puoi cambiarlo anche dopo.'}
        footer={
          result ? (
            <Button onClick={onClose}>Fatto</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Annulla
              </Button>
              <Button onClick={create} loading={busy} disabled={!edition}>
                Genera QR e PIN
              </Button>
            </>
          )
        }
      >
        {result ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex w-full flex-col items-center gap-3 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.qr} alt="QR di abbinamento" width={240} height={240} className="rounded-lg border border-border bg-white p-2" />
              <PairingPin pin={result.pin} />
            </div>
            <Countdown until={result.expiresAt} />
            <p className="text-label text-muted">
              {DEVICE_KIND_LABEL[kind]} · {permissionSummary(kind, config.permissions)}
            </p>
            <details className="w-full text-left text-caption text-muted">
              <summary className="cursor-pointer">Non riesci a inquadrarlo?</summary>
              <p className="mt-1 break-all">Apri questo indirizzo sul dispositivo: {result.url}</p>
            </details>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {editions.length > 1 && (
              <Field label="Edizione">
                <Select
                  value={edition}
                  onValueChange={(v) => {
                    setEdition(v);
                    setConfig((c) => ({ ...c, registerId: firstRegister(v) }));
                  }}
                  options={editions.map((e) => ({ value: e.slug, label: e.title }))}
                />
              </Field>
            )}
            <DeviceRoleField value={kind} onChange={changeKind} />
            <DeviceConfigFields kind={kind} config={config} onChange={setConfig} registers={registers} error={error} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Dettagli e permessi di un dispositivo già abbinato: le modifiche valgono dalla prossima richiesta. */
export function EditDeviceDialog({
  device,
  registers,
  onSave,
  onClose,
}: {
  device: DeviceRow;
  registers: RegisterOption[];
  onSave: (input: DeviceConfig) => Promise<ActionResult<unknown>>;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<DeviceConfig>({
    name: device.name,
    holderName: device.holderName ?? '',
    holderPhone: device.holderPhone ?? '',
    registerId: device.registerId,
    permissions: device.permissions,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    const res = await onSave(cleanConfig(device.kind, config, registers));
    setBusy(false);
    if (!res.ok) setError(res.error);
    else onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={`Modifica “${device.name}”`}
        description={`${DEVICE_KIND_LABEL[device.kind]}. Le modifiche valgono subito, senza abbinarlo di nuovo.${device.customPermissions ? '' : ' Finora valevano i permessi del ruolo.'}`}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Annulla
            </Button>
            <Button onClick={save} loading={busy}>
              Salva
            </Button>
          </>
        }
      >
        <DeviceConfigFields kind={device.kind} config={config} onChange={setConfig} registers={registers} error={error} />
      </DialogContent>
    </Dialog>
  );
}
