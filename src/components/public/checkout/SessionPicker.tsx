'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { CheckoutSession, CheckoutView } from '@/server/domain/checkout';
import { stagger } from '../motion';
import { card, SectionTitle } from './parts';

const dayFmt = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Giorno della settimana, numero, mese e ora (Roma) per le schede delle date. */
export function dayParts(iso: string) {
  const parts = Object.fromEntries(dayFmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return { weekday: parts.weekday.replace('.', ''), day: parts.day, month: parts.month.replace('.', ''), time: `${parts.hour}:${parts.minute}` };
}

/** Badge d'angolo della data (produzione: "Aperta!", "Sold Out", "Recupero del 10"). */
function badgeOf(s: CheckoutSession, showRemaining: boolean): { text: string; tone: string } | null {
  if (!s.open) {
    if (s.status === 'sold_out') return { text: 'Esaurito', tone: 'bg-danger text-white' };
    if (s.status === 'postponed') return { text: 'Rinviata', tone: 'bg-warning text-white' };
    return { text: 'Non in vendita', tone: 'bg-surface-sunken text-muted' };
  }
  if (showRemaining && s.remaining !== null && s.low) return { text: `Ultimi ${s.remaining}`, tone: 'bg-warning text-white' };
  return null;
}

/** Scelta del giorno: tessere con giorno grande, badge d'angolo, orario e attività di quel giorno. */
export function SessionPicker({ view, value, onChange }: { view: CheckoutView; value: string | null; onChange: (id: string) => void }) {
  const acts = view.activities?.activities ?? [];
  return (
    <section className={`${card} p-4 sm:p-6`} aria-labelledby="titolo-giorno">
      <SectionTitle id="titolo-giorno" emoji="📅" title="Scegli il giorno" hint="I biglietti valgono per la data che scegli." />
      <div role="radiogroup" aria-labelledby="titolo-giorno" className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3">
        {view.sessions.map((s, i) => {
          const d = dayParts(s.startsAt);
          const checked = value === s.id;
          const badge = badgeOf(s, view.showRemaining);
          const today = acts.filter((a) => !a.sessionIds.length || a.sessionIds.includes(s.id)).map((a) => a.label.replace(/\s*\(.*\)$/, ''));
          return (
            <motion.label
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: stagger(i) }}
              whileHover={s.open ? { y: -2 } : undefined}
              className={`relative flex cursor-pointer flex-col items-center rounded-2xl border-2 px-2 pb-3 pt-4 text-center transition-colors ${
                checked ? 'border-[var(--ev-accent)] bg-[var(--ev-softer)] shadow-[0_10px_24px_-12px_var(--ev-glow)]' : 'border-[var(--ev-border)] bg-white hover:border-[var(--ev-accent)]/60'
              } ${!s.open ? 'cursor-not-allowed opacity-60' : ''} has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--ev-glow)]`}
            >
              <input
                type="radio"
                name="data"
                value={s.id}
                checked={checked}
                disabled={!s.open}
                onChange={() => onChange(s.id)}
                aria-label={`${s.label}${badge && !s.open ? ` (${badge.text})` : ''}`}
                className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              />
              {badge && <span className={`absolute -right-1 -top-2.5 rounded-full px-2 py-0.5 text-pub-xs font-bold shadow-sm ${badge.tone}`}>{badge.text}</span>}
              {checked && (
                <span aria-hidden className="absolute left-2 top-2 flex size-5 items-center justify-center rounded-full bg-[var(--ev-accent)] text-white">
                  <Check size={12} strokeWidth={3.5} />
                </span>
              )}
              <span className="text-pub-xs font-bold uppercase tracking-wider text-muted">{d.weekday}</span>
              <span className={`font-ev-display text-[2.4rem] font-extrabold leading-none text-[var(--ev-ink)] ${!s.open ? 'line-through decoration-2' : ''}`}>{d.day}</span>
              <span className="text-pub-sm font-semibold text-[var(--ev-ink)]">{d.month}</span>
              <span className="mt-1.5 text-pub-xs font-medium text-muted">{s.open ? `Dalle ${d.time}` : 'Non acquistabile'}</span>
              {s.open && today.length > 0 && (
                <span className="mt-1 line-clamp-2 text-pub-xs text-[var(--ev-ink)]/80">
                  <span aria-hidden>🎨 </span>
                  {today.slice(0, 2).join(' · ')}
                  {today.length > 2 ? ` +${today.length - 2}` : ''}
                </span>
              )}
            </motion.label>
          );
        })}
      </div>
    </section>
  );
}
