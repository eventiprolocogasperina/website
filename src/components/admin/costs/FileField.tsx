'use client';

import { FileText, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, Field } from '@/components/ui';

const MAX_BYTES = 8 * 1024 * 1024;

/** Allegato (ricevuta in PDF o immagine, foto del materiale): va su Cloudinary come gli altri caricamenti dell'admin. */
export function FileField({ label, help, value, onChange, folder, accept = 'application/pdf,image/png,image/jpeg,image/webp' }: { label: string; help?: string; value: string | null; onChange: (url: string | null) => void; folder: string; accept?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setError('');
    if (!accept.split(',').includes(file.type)) return setError('Formato non supportato: carica un PDF o un’immagine.');
    if (file.size > MAX_BYTES) return setError('Il file è troppo grande: al massimo 8 MB.');
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', folder);
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
      <div className="flex flex-wrap items-center gap-2">
        {value && (
          <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-body text-primary hover:underline">
            <FileText size={16} aria-hidden /> Apri allegato
          </a>
        )}
        <Button variant="secondary" size="sm" icon={Upload} loading={busy} onClick={() => input.current?.click()}>
          {value ? 'Cambia' : 'Carica'}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onChange(null)}>
            Togli
          </Button>
        )}
        <input ref={input} type="file" accept={accept} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
    </Field>
  );
}
