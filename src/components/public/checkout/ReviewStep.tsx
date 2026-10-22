'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Tag } from 'lucide-react';
import { useState } from 'react';
import { Field } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { Quote } from '@/server/domain/checkout';
import { card, PublicInput } from './parts';

type Props = {
  quote: Quote;
  details: string;
  initialCode: string;
  codeError?: string;
  busy: boolean;
  onApply: (code: string) => void;
  onCodeEdit: () => void;
};

/**
 * Riepilogo calcolato dal server, con il codice sconto nascosto dietro un link (produzione 1828–1872):
 * l'esito (applicato o non valido) compare sotto il campo, non nel riquadro d'errore della pagina.
 */
export function ReviewStep({ quote, details, initialCode, codeError, busy, onApply, onCodeEdit }: Props) {
  const [open, setOpen] = useState(!!initialCode || !!codeError);
  const [code, setCode] = useState(initialCode);
  return (
    <section className={`${card} overflow-hidden`} aria-labelledby="titolo-riepilogo">
      <div className="flex items-center gap-3 bg-gradient-to-br from-[var(--ev-soft)] to-[var(--ev-softer)] px-5 py-4">
        <span aria-hidden className="flex size-11 items-center justify-center rounded-2xl bg-white text-[1.35rem] shadow-sm">
          🧾
        </span>
        <div className="min-w-0">
          <h2 id="titolo-riepilogo" className="font-ev-display text-pub-xl font-bold text-[var(--ev-ink)]">
            Controlla e conferma
          </h2>
          <p className="truncate text-pub-sm text-[var(--ev-ink)]/80">{details}</p>
        </div>
      </div>
      <div className="p-5">
        <ul className="flex flex-col gap-2.5">
          {quote.lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-3 text-pub-base">
              <span>
                <span className="font-bold text-[var(--ev-ink)]">{l.quantity}×</span> {l.name}
                <span className="text-pub-sm text-muted"> · {formatMoney(l.unitPriceCents)} cad.</span>
              </span>
              <span className="font-semibold tabular-nums">{formatMoney(l.unitPriceCents * l.quantity)}</span>
            </li>
          ))}
          {quote.discountCents > 0 && (
            <li className="flex justify-between gap-3 text-pub-base font-semibold text-success">
              <span>Sconto {quote.discountCode}</span>
              <span className="tabular-nums">−{formatMoney(quote.discountCents)}</span>
            </li>
          )}
        </ul>
        <p className="mt-4 flex items-end justify-between border-t-2 border-dashed border-[var(--ev-border)] pt-4">
          <span>
            <span className="block text-pub-lg font-bold text-[var(--ev-ink)]">Totale</span>
            <span className="text-pub-xs font-semibold uppercase tracking-wider text-muted">Contributo all’evento</span>
          </span>
          <span className="text-[2.25rem] font-black leading-none tabular-nums text-primary" data-testid="totale">
            {formatMoney(quote.totalCents)}
          </span>
        </p>

        <div className="mt-5">
          {!open ? (
            <button
              type="button"
              aria-expanded={false}
              onClick={() => setOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-pub-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--ev-accent)]"
            >
              <Tag size={16} aria-hidden /> Hai un codice sconto o convenzione?
            </button>
          ) : (
            <AnimatePresence initial={false}>
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex flex-col gap-2 rounded-2xl bg-[var(--ev-softer)] p-4 [&_label]:text-pub-sm [&_label]:font-semibold"
                onSubmit={(e) => {
                  e.preventDefault();
                  onApply(code.trim().toUpperCase());
                }}
              >
                <div className="flex items-start gap-2">
                  <Field label="Codice sconto" className="flex-1" error={codeError}>
                    <PublicInput
                      icon={Tag}
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        onCodeEdit();
                      }}
                      maxLength={40}
                      autoCapitalize="characters"
                      className="[&_input]:uppercase"
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={!code.trim() || busy}
                    className="mt-[26px] inline-flex h-12 shrink-0 items-center rounded-xl bg-[var(--ev-ink)] px-5 text-pub-sm font-bold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)] disabled:opacity-40"
                  >
                    Applica
                  </button>
                </div>
                {quote.discountCode && !codeError && (
                  <p role="status" className="flex items-center gap-1.5 text-pub-sm font-semibold text-success">
                    <CheckCircle2 size={16} aria-hidden /> Codice {quote.discountCode} applicato: −{formatMoney(quote.discountCents)}.
                  </p>
                )}
              </motion.form>
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}
