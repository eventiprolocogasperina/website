'use client';

import { CheckCircle2, FileText, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button, Field } from '@/components/ui';
import { receiptHref, type ReceiptRef } from '@/lib/costs';

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';

/** `keep`: la ricevuta già salvata resta; un ReceiptRef: appena caricata; null: nessuna. */
export type ReceiptValue = ReceiptRef | 'keep' | null;

/**
 * Ricevuta o fattura di un costo: va su Cloudinary come file privato. Si apre solo dall'admin,
 * passando dal server (permesso e registro), mai con un link pubblico.
 */
export function ReceiptField({ costId, saved, value, onChange, disabled }: { costId: string | null; saved: boolean; value: ReceiptValue; onChange: (v: ReceiptValue) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hasSaved = value === 'keep' && saved && !!costId;

  async function upload(file: File) {
    setError('');
    if (!ACCEPT.split(',').includes(file.type)) return setError('Formato non supportato: carica un PDF o un’immagine.');
    if (file.size > MAX_BYTES) return setError('Il file è troppo grande: al massimo 8 MB.');
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/costi/ricevuta', { method: 'POST', body });
      const data = (await res.json().catch(() => ({}))) as { receipt?: ReceiptRef; error?: string };
      if (!res.ok || !data.receipt) throw new Error(data.error || 'Caricamento non riuscito.');
      onChange(data.receipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Caricamento non riuscito.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  const present = hasSaved || (value !== null && value !== 'keep');
  return (
    <Field label="Ricevuta o fattura" help="PDF o foto, al massimo 8 MB. Resta privata: la vede solo chi può leggere i costi." error={error || undefined}>
      <div className="flex flex-wrap items-center gap-2">
        {hasSaved && (
          <a href={receiptHref(costId!)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-body text-primary hover:underline">
            <FileText size={16} aria-hidden /> Apri ricevuta
          </a>
        )}
        {value !== null && value !== 'keep' && (
          <span className="inline-flex items-center gap-1 text-body text-fg">
            <CheckCircle2 size={16} className="text-success" aria-hidden /> Caricata: si salva con il costo
          </span>
        )}
        {!disabled && (
          <>
            <Button variant="secondary" size="sm" icon={Upload} loading={busy} onClick={() => input.current?.click()}>
              {present ? 'Cambia' : 'Carica'}
            </Button>
            {present && (
              <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onChange(null)}>
                Togli
              </Button>
            )}
            <input ref={input} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </>
        )}
      </div>
    </Field>
  );
}
