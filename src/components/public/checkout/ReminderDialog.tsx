'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { ArrowRight, Plus } from 'lucide-react';
import type { CSSProperties } from 'react';
import { formatMoney } from '@/lib/money';
import type { CheckoutProduct } from '@/server/domain/checkout';
import { brandFontVariables } from '../brand-fonts';
import { spring } from '../motion';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Variabili del tema: il dialogo vive in un portale fuori dalla pagina. */
  themeStyle: CSSProperties;
  missingActivity: boolean;
  lab: CheckoutProduct | null;
  onAddLab: () => void;
  onContinue: () => void;
};

/**
 * Promemoria amichevole prima dei dati (produzione 2206–2530): non è un errore, quindi niente rosso.
 * Ricorda che le attività sono incluse e propone il laboratorio a pagamento; si mostra una volta sola.
 */
export function ReminderDialog({ open, onOpenChange, themeStyle, missingActivity, lab, onAddLab, onContinue }: Props) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-[rgb(20_10_5_/_0.6)] backdrop-blur-[2px]" />
        <RadixDialog.Content
          data-theme="light"
          style={themeStyle}
          className={`ui-root ${brandFontVariables} fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 bg-transparent font-ev-body outline-none`}
          aria-describedby="promemoria-testo"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring}
            className="rounded-[1.5rem] border border-[var(--ev-border)] bg-gradient-to-b from-white to-[var(--ev-softer)] p-6 text-center shadow-2xl"
          >
            <span aria-hidden className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--ev-soft)] text-[2rem]">
              🎨
            </span>
            <RadixDialog.Title className="mt-3 font-ev-display text-pub-2xl font-bold text-[var(--ev-ink)]">Prima di continuare</RadixDialog.Title>
            <div id="promemoria-testo" className="mt-2 flex flex-col gap-2 text-pub-base text-fg">
              {missingActivity && <p>Non hai scelto nessuna attività gratuita: sono incluse nel biglietto e i posti sono limitati.</p>}
              {lab && (
                <p>
                  Non hai aggiunto <strong>{lab.name}</strong>
                  {lab.priceCents > 0 ? ` (${formatMoney(lab.priceCents)} di contributo)` : ''}. Vuoi aggiungerlo?
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-2">
              {lab && (
                <button
                  type="button"
                  onClick={onAddLab}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-pub-base font-bold text-primary-fg shadow-[0_10px_22px_-10px_var(--ev-glow)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)]"
                >
                  <Plus size={18} strokeWidth={3} aria-hidden /> Aggiungi {lab.name}
                </button>
              )}
              {missingActivity && (
                <RadixDialog.Close className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[var(--ev-accent)] bg-white px-5 text-pub-base font-bold text-primary hover:bg-[var(--ev-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)]">
                  Scegli le attività
                </RadixDialog.Close>
              )}
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-5 text-pub-sm font-semibold text-[var(--ev-ink)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)]"
              >
                Continua così <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          </motion.div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
