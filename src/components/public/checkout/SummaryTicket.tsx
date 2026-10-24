'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, HeartHandshake, Loader2, Mail, ShieldCheck, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/money';
import type { Quote } from '@/server/domain/checkout';
import { springTap } from '../motion';
import { card } from './parts';

export type SummaryData = {
  editionTitle: string;
  sessionLabel: string | null;
  /** Righe del carrello, con il prezzo di listino mostrato sulla card (solo per la stima). */
  lines: Array<{ productId: string; name: string; quantity: number; unitCents: number }>;
  admissions: number;
  children: number | null;
  activities: string[];
  /**
   * Riepilogo calcolato dal server (quoteAction) per il carrello di adesso: c'è dal Riepilogo in poi.
   * Prima il totale è una stima dai prezzi di listino, solo da mostrare: al server non si manda mai.
   */
  quote: Quote | null;
};

const totalOf = (d: SummaryData) => d.quote?.totalCents ?? d.lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);

export type StepCta = { label: string; onClick: () => void; busy?: boolean; icon?: LucideIcon } | null;

function Amount({ data, className }: { data: SummaryData; className: string }) {
  const total = totalOf(data);
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={total} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={springTap} className={className}>
        {formatMoney(total)}
      </motion.span>
    </AnimatePresence>
  );
}

const countLabel = (d: SummaryData) =>
  [d.admissions ? `${d.admissions} ${d.admissions === 1 ? 'ingresso' : 'ingressi'}` : null, d.children ? `${d.children} ${d.children === 1 ? 'bimbo' : 'bimbi'}` : null].filter(Boolean).join(' · ');

/**
 * Riepilogo a forma di biglietto (produzione 1937–2104): gradiente del format, totale grande, linea di
 * strappo, pulsante del passo dentro (solo da desktop: su telefono c'è la barra in basso) e sigillo Nexi.
 * Il gradiente parte dal colore scuro del format, così il testo bianco resta leggibile (AA).
 */
export function SummaryTicket({ data, cta }: { data: SummaryData; cta: StepCta }) {
  const amountOf = (id: string) => data.quote?.lines.find((l) => l.productId === id);
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-20" aria-label="Il tuo ordine">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="relative overflow-hidden rounded-[1.5rem] text-white shadow-[0_24px_48px_-20px_var(--ev-glow)]"
        style={{ background: 'linear-gradient(140deg, var(--ev-brand-strong) 0%, color-mix(in srgb, var(--ev-brand-strong) 72%, black) 100%)' }}
      >
        <div aria-hidden className="h-1.5 bg-[var(--ev-brand)]" />
        <div aria-hidden className="absolute -right-12 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-pub-xs font-bold uppercase tracking-[0.18em] text-white/80">Riepilogo ordine</p>
              <p className="mt-0.5 font-ev-display text-pub-xl font-bold leading-tight">{data.editionTitle}</p>
            </div>
            {countLabel(data) && <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-pub-xs font-bold">{countLabel(data)}</span>}
          </div>
          {data.sessionLabel && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2 text-pub-sm font-semibold">
              <CalendarDays size={16} aria-hidden /> {data.sessionLabel}
            </p>
          )}
          {data.lines.length === 0 ? (
            <p className="mt-4 text-pub-sm italic text-white/85">Scegli il giorno e i biglietti: qui vedi il totale.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-1.5 text-pub-sm">
              {data.lines.map((l) => {
                const q = amountOf(l.productId);
                const amount = q ? q.unitPriceCents * q.quantity : l.unitCents * l.quantity;
                return (
                  <li key={l.productId} className="flex justify-between gap-3">
                    <span>
                      <strong>{l.quantity}×</strong> {l.name}
                    </span>
                    <span className="tabular-nums text-white/90">{formatMoney(amount)}</span>
                  </li>
                );
              })}
              {!!data.children && (
                <li className="mt-1 rounded-lg border border-white/25 px-2.5 py-1.5 text-white/90">
                  <span aria-hidden>👶 </span>di cui {data.children} {data.children === 1 ? 'bambino' : 'bambini'}
                </li>
              )}
              {data.activities.length > 0 && (
                <li className="mt-1 border-t border-dashed border-white/30 pt-2 text-white/90">
                  <span aria-hidden>🎨 </span>
                  {data.activities.join(', ')}
                </li>
              )}
              {data.quote && data.quote.discountCents > 0 && (
                <li className="flex justify-between gap-3 font-semibold text-warning-bg">
                  <span>Sconto {data.quote.discountCode}</span>
                  <span className="tabular-nums">−{formatMoney(data.quote.discountCents)}</span>
                </li>
              )}
            </ul>
          )}
        </div>
        {/* Linea di strappo con le due tacche del biglietto. */}
        <div aria-hidden className="relative h-0 border-t-2 border-dashed border-white/35">
          <span className="absolute -left-3 -top-3 size-6 rounded-full bg-[var(--ev-softer)]" />
          <span className="absolute -right-3 -top-3 size-6 rounded-full bg-[var(--ev-softer)]" />
        </div>
        <div className="relative p-5 pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-pub-sm font-bold">{data.quote || !data.lines.length ? 'Totale' : 'Totale indicativo'}</p>
              <p className="text-pub-xs text-white/80">{data.quote || !data.lines.length ? 'Contributo all’evento' : 'Sconti e totale esatto nel riepilogo'}</p>
            </div>
            <Amount data={data} className="text-[2.25rem] font-black leading-none tabular-nums" />
          </div>
          {cta && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={cta.onClick}
              disabled={cta.busy}
              className="mt-5 hidden min-h-13 w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-pub-base font-black text-primary shadow-lg transition hover:bg-[var(--ev-softer)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-70 lg:flex"
            >
              {cta.busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : cta.icon ? <cta.icon size={18} aria-hidden /> : null}
              {cta.label}
            </motion.button>
          )}
          <p className="mt-4 flex items-center justify-center gap-1.5 text-pub-xs font-semibold text-white/90">
            <ShieldCheck size={16} aria-hidden /> Pagamento 100% sicuro con Nexi
          </p>
        </div>
      </motion.section>
      <ul className={`${card} flex flex-col gap-3 p-4`}>
        <Perk icon={Mail} title="Biglietti subito via email">
          Con il QR da mostrare all’ingresso, anche dal telefono.
        </Perk>
        <Perk icon={HeartHandshake} title="Organizzato dalla Pro Loco">
          Volontari di Gasperina: per qualsiasi dubbio scrivici dalla pagina Contatti.
        </Perk>
      </ul>
    </aside>
  );
}

function Perk({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ev-soft)] text-primary">
        <Icon size={17} aria-hidden />
      </span>
      <span className="text-pub-sm">
        <strong className="block text-[var(--ev-ink)]">{title}</strong>
        <span className="text-muted">{children}</span>
      </span>
    </li>
  );
}

/** Barra fissa in basso su telefono (produzione 2106–2200): quanti biglietti, totale e pulsante del passo. */
export function MobileTotalBar({ data, cta }: { data: SummaryData; cta: StepCta }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ev-border)] bg-white/95 px-4 pt-3 shadow-[0_-10px_30px_-12px_rgb(0_0_0_/_0.18)] backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-pub-xs font-semibold text-muted">{data.lines.length ? countLabel(data) || `${data.lines.reduce((s, l) => s + l.quantity, 0)} articoli` : 'Nessun biglietto'}</p>
          <Amount data={data} className="block text-pub-xl font-black tabular-nums text-primary" />
        </div>
        {cta && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={cta.onClick}
            disabled={cta.busy}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-pub-base font-black text-primary-fg shadow-[0_10px_22px_-10px_var(--ev-glow)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)] disabled:opacity-70"
          >
            {cta.busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : cta.icon ? <cta.icon size={18} aria-hidden /> : null}
            {cta.label}
          </motion.button>
        )}
      </div>
    </div>
  );
}
