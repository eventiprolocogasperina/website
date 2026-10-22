'use client';

import { Field, RadioGroup } from '@/components/ui';

// Pezzi comuni ai tre dialoghi "Abbina dispositivo" (Sistema › Utenti, Cassa, Check-in).

export type DeviceKind = 'pos' | 'scanner';

/** Ruolo del dispositivo, scelto nel dialogo e assegnato all'abbinamento. */
export function DeviceRoleField({ value, onChange }: { value: DeviceKind; onChange: (kind: DeviceKind) => void }) {
  return (
    <Field label="Ruolo del dispositivo" help="Decide cosa apre il telefono dopo l’abbinamento e chi può entrare con il PIN.">
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
