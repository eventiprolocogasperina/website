'use client';

import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';
import { springTap } from '../motion';
import { card } from './parts';

/**
 * Quanti degli ingressi sono bambini (produzione 1345–1495): stepper e scorciatoie "Solo adulti · 1 · 2 · Tutti".
 * Il massimo sono gli ingressi scelti; il server lo ricontrolla (activityProblem).
 */
export function ChildrenCounter({ value, max, onChange, error }: { value: number; max: number; onChange: (n: number) => void; error?: string }) {
  const id = useId();
  const presets = [
    { n: 0, label: 'Solo adulti' },
    { n: 1, label: '1 bambino' },
    { n: 2, label: '2 bambini' },
    { n: max, label: `Tutti bambini (${max})` },
  ].filter((p, i, all) => p.n <= max && all.findIndex((q) => q.n === p.n) === i);
  return (
    <motion.section
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.35 }}
      className={`${card} overflow-hidden`}
      aria-labelledby={`${id}-title`}
    >
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning-bg text-[1.35rem]">
              👶
            </span>
            <div>
              <h2 id={`${id}-title`} className="font-ev-display text-pub-xl font-bold text-[var(--ev-ink)]">
                Biglietti per bambini
              </h2>
              <p className="text-pub-sm text-muted">
                Quanti dei <strong className="text-[var(--ev-ink)]">{max === 1 ? '1 biglietto' : `${max} biglietti`}</strong> sono per bambini?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label="Numero di bambini">
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              transition={springTap}
              aria-label="Togli un bambino"
              disabled={value <= 0}
              onClick={() => onChange(value - 1)}
              className="flex size-10 items-center justify-center rounded-full border-2 border-[var(--ev-border)] bg-white text-[var(--ev-ink)] hover:bg-[var(--ev-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)] disabled:opacity-35"
            >
              <Minus size={18} strokeWidth={3} aria-hidden />
            </motion.button>
            <output aria-live="polite" aria-label={`${value} bambini`} className="w-8 text-center text-pub-xl font-black tabular-nums text-[var(--ev-ink)]">
              {value}
            </output>
            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              transition={springTap}
              aria-label="Aggiungi un bambino"
              disabled={value >= max}
              onClick={() => onChange(value + 1)}
              className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-fg shadow-[0_6px_14px_-6px_var(--ev-glow)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)] disabled:opacity-35"
            >
              <Plus size={18} strokeWidth={3} aria-hidden />
            </motion.button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Scelte rapide">
          {presets.map((p) => (
            <motion.button
              key={p.label}
              type="button"
              whileTap={{ scale: 0.94 }}
              aria-pressed={value === p.n}
              onClick={() => onChange(p.n)}
              className={`min-h-10 rounded-full border-2 px-4 text-pub-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)] ${
                value === p.n ? 'border-[var(--ev-accent)] bg-[var(--ev-accent)] text-white' : 'border-[var(--ev-border)] bg-white text-[var(--ev-ink)] hover:bg-[var(--ev-soft)]'
              }`}
            >
              {p.label}
            </motion.button>
          ))}
        </div>
        <p className="rounded-xl bg-warning-bg px-3 py-2 text-pub-sm text-[var(--ev-ink)]">
          <span aria-hidden>💡 </span>Ci serve per preparare i laboratori: alcune attività sono riservate ai bambini.
        </p>
        {error && <p className="text-pub-sm font-medium text-danger">{error}</p>}
      </div>
    </motion.section>
  );
}
