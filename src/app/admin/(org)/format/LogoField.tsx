'use client';

import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, Field, cn } from '@/components/ui';

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Logo del format: si carica un PNG (meglio trasparente) o un JPG, va su Cloudinary come le altre
 * immagini dell'admin e si salva con il format. Nessun ritaglio: un logo resta com'è.
 */
export function LogoField({ label, help, value, onChange, dark = false }: { label: string; help: string; value: string | null; onChange: (url: string | null) => void; dark?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setError('');
    if (!['image/png', 'image/jpeg'].includes(file.type)) return setError('Carica un PNG o un JPG.');
    if (file.size > MAX_BYTES) return setError('Il file è troppo grande: al massimo 4 MB.');
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'pro-loco-gasperina/format');
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || 'Caricamento non riuscito.');
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Caricamento non riuscito.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <Field label={label} help={help} error={error || undefined}>
      <div className="flex flex-wrap items-center gap-3">
        <div className={cn('flex h-20 w-40 items-center justify-center overflow-hidden rounded-lg border border-border', dark ? 'bg-neutral-900' : 'bg-surface-sunken')}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- anteprima di un indirizzo qualsiasi appena caricato
            <img src={value} alt={`Anteprima: ${label}`} className="max-h-16 max-w-36 object-contain" />
          ) : (
            <ImageIcon aria-hidden className="text-muted" />
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Upload} loading={busy} onClick={() => input.current?.click()}>
            {value ? 'Cambia' : 'Carica'}
          </Button>
          {value && (
            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onChange(null)}>
              Togli
            </Button>
          )}
        </div>
        <input ref={input} type="file" accept="image/png,image/jpeg" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
    </Field>
  );
}
