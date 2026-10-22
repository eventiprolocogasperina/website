'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { spring } from '../motion';

export type StepDef<K extends string = string> = { key: K; label: string; short: string; emoji: string };

/**
 * Passi dell'acquisto a pillola (produzione 813–866): il passo attivo è pieno col colore del format e
 * scivola da un passo all'altro, quelli fatti hanno la spunta e si possono riaprire. Su telefono i passi
 * non attivi mostrano solo l'icona.
 */
export function Stepper<K extends string>({ steps, current, onGo, locked }: { steps: StepDef<K>[]; current: K; onGo: (k: K) => void; locked?: boolean }) {
  const index = steps.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Passi dell’acquisto">
      <ol className="flex gap-1 rounded-full border border-[var(--ev-border)] bg-white/90 p-1.5 shadow-[0_8px_24px_-14px_var(--ev-glow)] backdrop-blur">
        {steps.map((s, i) => {
          const active = i === index;
          const done = i < index;
          const clickable = done && !locked;
          const inner = (
            <>
              {active && <motion.span layoutId="step-active" transition={spring} aria-hidden className="absolute inset-0 -z-10 rounded-full bg-primary shadow-[0_6px_16px_-6px_var(--ev-glow)]" />}
              <span className="sr-only">
                Passo {i + 1} di {steps.length}
                {done ? ', fatto' : ''}:{' '}
              </span>
              {done ? (
                <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-success text-white">
                  <Check size={12} strokeWidth={3.5} />
                </span>
              ) : (
                <span aria-hidden>{s.emoji}</span>
              )}
              <span className={active ? '' : 'hidden md:inline'}>
                <span className="sm:hidden">{s.short}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </span>
            </>
          );
          const cls = `relative isolate flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-pub-sm font-bold whitespace-nowrap transition-colors ${
            active ? 'text-primary-fg' : done ? 'text-[var(--ev-ink)]' : 'text-muted'
          }`;
          return (
            <li key={s.key} aria-current={active ? 'step' : undefined} className={`flex ${active ? 'flex-[2.2] md:flex-1' : 'flex-1'}`}>
              {clickable ? (
                <button type="button" onClick={() => onGo(s.key)} className={`${cls} w-full hover:bg-[var(--ev-soft)] focus-visible:outline-2 focus-visible:outline-[var(--ev-accent)]`}>
                  {inner}
                </button>
              ) : (
                <span className={`${cls} w-full`}>{inner}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
