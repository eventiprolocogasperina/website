'use client';

import { motion } from 'framer-motion';
import { Check, Clock, Plus, Users } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import type { CheckoutProduct, CheckoutView } from '@/server/domain/checkout';
import { spring, stagger } from '../motion';
import { card, Pill, SectionTitle } from './parts';

type Activity = NonNullable<CheckoutView['activities']>['activities'][number];

type Props = {
  view: CheckoutView;
  sessionId: string | null;
  childCount: number;
  selected: string[];
  onToggle: (key: string, on: boolean) => void;
  lab: CheckoutProduct | undefined;
  labQuantity: number;
  onAddLab: () => void;
};

/** Perché un'attività non si può scegliere, o null. */
function unavailable(a: Activity, sessionId: string | null, children: number, left: number | undefined, sessionLabels: Map<string, string>): string | null {
  if (a.sessionIds.length && (!sessionId || !a.sessionIds.includes(sessionId))) {
    return `Solo ${a.sessionIds.map((id) => sessionLabels.get(id)).filter(Boolean).join(', ')}`;
  }
  if (left === 0) return 'Al completo';
  if (a.target === 'bambini' && children === 0) return 'Indica prima quanti bambini';
  return null;
}

/**
 * Attività gratuite come card selezionabili (produzione 1500–1774): icona che ruota quando è scelta, pill con
 * orario, destinatari e posti; quelle di altri giorni restano visibili ma spente, col motivo. Sotto, la
 * proposta del laboratorio a pagamento se non è già nel carrello.
 */
export function ActivityCards({ view, sessionId, childCount, selected, onToggle, lab, labQuantity, onAddLab }: Props) {
  const acts = view.activities?.activities ?? [];
  const labels = new Map(view.sessions.map((s) => [s.id, s.label]));
  const placesLeft = (sessionId && view.activities?.placesLeft[sessionId]) || {};
  // Prima quelle del giorno scelto.
  const sorted = [...acts].sort((a, b) => Number(!!unavailable(a, sessionId, 1, 1, labels)) - Number(!!unavailable(b, sessionId, 1, 1, labels)));
  return (
    <>
      {acts.length > 0 && (
        <section className={`${card} p-4 sm:p-6`} aria-labelledby="titolo-attivita">
          <SectionTitle id="titolo-attivita" emoji="🎨" title="Laboratori e attività gratuite" hint="Sono inclusi nel biglietto: scegli a quali partecipate, così prepariamo i posti." />
          <fieldset>
            <legend className="sr-only">Attività gratuite incluse</legend>
            <ul className="grid gap-3 sm:grid-cols-2">
              {sorted.map((a, i) => {
                const left = placesLeft[a.key];
                const reason = unavailable(a, sessionId, childCount, left, labels);
                const on = selected.includes(a.key) && !reason;
                return (
                  <motion.li key={a.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: stagger(i) }}>
                    <label
                      className={`relative flex h-full gap-3 rounded-[1.25rem] border-2 p-4 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--ev-glow)] ${
                        reason ? 'cursor-not-allowed border-dashed border-border bg-surface-sunken/60 opacity-70' : on ? 'cursor-pointer border-[var(--ev-accent)] bg-gradient-to-br from-[var(--ev-softer)] to-[var(--ev-soft)] shadow-[0_10px_24px_-14px_var(--ev-glow)]' : 'cursor-pointer border-[var(--ev-border)] bg-white hover:border-[var(--ev-accent)]/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!!reason}
                        onChange={(e) => onToggle(a.key, e.target.checked)}
                        aria-label={reason ? `${a.label} (${reason})` : a.label}
                        className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      />
                      <motion.span
                        aria-hidden
                        animate={on ? { rotate: -6, scale: 1.05 } : { rotate: 0, scale: 1 }}
                        transition={spring}
                        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-[1.3rem] ${on ? 'bg-[var(--ev-brand)]' : 'bg-[var(--ev-soft)]'}`}
                      >
                        {a.target === 'bambini' ? '🧒' : '🎨'}
                      </motion.span>
                      <span className="min-w-0 flex-1">
                        <span className="block pr-7 text-pub-base font-extrabold text-[var(--ev-ink)]">{a.label}</span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {a.details && (
                            <Pill>
                              <Clock size={12} aria-hidden /> {a.details}
                            </Pill>
                          )}
                          <Pill tone="neutral">
                            <Users size={12} aria-hidden /> {a.target === 'bambini' ? 'Per i bambini' : 'Per tutti'}
                          </Pill>
                          {reason ? (
                            <Pill tone={reason === 'Al completo' ? 'danger' : 'neutral'}>{reason}</Pill>
                          ) : left !== undefined && left <= 10 ? (
                            <Pill tone="warning">{left === 1 ? 'Ultimo posto' : `Ultimi ${left} posti`}</Pill>
                          ) : a.maxPlaces ? (
                            <Pill tone="success">Max {a.maxPlaces} posti</Pill>
                          ) : null}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className={`absolute right-3 top-3 flex size-6 items-center justify-center rounded-full border-2 transition-colors ${on ? 'border-[var(--ev-accent)] bg-[var(--ev-accent)] text-white' : 'border-[var(--ev-border)] bg-white'}`}
                      >
                        {on && <Check size={14} strokeWidth={3.5} />}
                      </span>
                    </label>
                  </motion.li>
                );
              })}
            </ul>
          </fieldset>
        </section>
      )}
      {lab && labQuantity === 0 && (
        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="flex flex-col gap-3 rounded-[1.25rem] border-2 border-dashed border-[var(--ev-accent)]/50 bg-gradient-to-br from-[var(--ev-softer)] to-[var(--ev-soft)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <p className="text-pub-base text-[var(--ev-ink)]">
            <span aria-hidden>✨ </span>Vuoi aggiungere <strong>{lab.name}</strong>
            {lab.priceCents > 0 && <> ({formatMoney(lab.priceCents)} di contributo)</>}?
            {lab.description && <span className="mt-0.5 block text-pub-sm text-muted">{lab.description}</span>}
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onAddLab}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-pub-sm font-bold text-primary-fg shadow-[0_8px_18px_-8px_var(--ev-glow)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)]"
          >
            <Plus size={16} strokeWidth={3} aria-hidden /> Aggiungi {lab.name}
          </motion.button>
        </motion.section>
      )}
    </>
  );
}
