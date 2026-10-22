'use client';

import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import { formatMoney } from '@/lib/money';
import type { CheckoutProduct } from '@/server/domain/checkout';
import { spring, springTap, stagger } from '../motion';
import { Pill } from './parts';

const KIND_EMOJI: Record<string, string> = { ticket: '🎟️', addon: '🎨', food: '🍽️', drink: '🥤', merch: '🛍️', donation: '💛', service: '🧩' };

type Props = {
  product: CheckoutProduct;
  index: number;
  quantity: number;
  /** Posti residui per la data scelta (null = senza limite). */
  left: number | null;
  /** Serve prima scegliere la data. */
  blocked: boolean;
  /** Icona del format (es. la zucca) per i biglietti d'ingresso. */
  mark: string | null;
  onChange: (delta: number) => void;
};

/**
 * Card di un prodotto (produzione 1175–1340): icona che si colora e ruota quando è scelto, prezzo grande con
 * "contributo", badge EXTRA, stepper rotondo. Un tocco sulla card aggiunge uno (come in produzione); da
 * tastiera e lettore di schermo si usano i pulsanti + e −.
 */
export function ProductCard({ product: p, index, quantity: n, left, blocked, mark, onChange }: Props) {
  const selected = n > 0;
  const soldOut = left === 0 && !blocked;
  const canAdd = !blocked && left !== 0;
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: stagger(index) }}
      whileHover={canAdd ? { scale: 1.01 } : undefined}
      onClick={(e) => {
        if (canAdd && !(e.target as HTMLElement).closest('button')) onChange(1);
      }}
      className={`relative overflow-hidden rounded-[1.25rem] border-2 bg-white transition-colors ${canAdd ? 'cursor-pointer' : ''} ${
        selected ? 'border-[var(--ev-accent)] bg-[var(--ev-softer)] shadow-[0_12px_28px_-14px_var(--ev-glow)]' : 'border-[var(--ev-border)]'
      } ${soldOut ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3 p-4 sm:gap-4">
        <motion.span
          aria-hidden
          animate={selected ? { rotate: -6, scale: 1.05 } : { rotate: 0, scale: 1 }}
          transition={spring}
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-[1.5rem] transition-colors ${selected ? 'bg-[var(--ev-brand)] shadow-[0_8px_18px_-8px_var(--ev-glow)]' : 'bg-[var(--ev-soft)]'}`}
        >
          {p.kind === 'ticket' && mark ? <Image src={mark} alt="" width={32} height={32} className="size-8 object-contain" /> : (KIND_EMOJI[p.kind] ?? '🛍️')}
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-pub-lg font-extrabold leading-tight text-[var(--ev-ink)]">{p.name}</span>
            {p.kind === 'addon' && <span className="rounded-md bg-[var(--ev-ink)] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">Extra</span>}
          </p>
          {p.description && <p className="mt-1 text-pub-sm text-muted">{p.description}</p>}
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-pub-xl font-black tabular-nums text-primary">{p.priceCents === 0 ? 'Gratis' : formatMoney(p.priceCents)}</span>
            {p.priceCents > 0 && <span className="text-pub-xs font-bold uppercase tracking-wider text-muted">contributo</span>}
            {soldOut && <Pill tone="danger">Esaurito</Pill>}
            {left !== null && left > 0 && left <= 10 && !blocked && <Pill tone="warning">Ultimi {left}</Pill>}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--ev-border)]/70 px-4 py-2.5">
        <span className="text-pub-sm font-semibold text-[var(--ev-ink)]">{blocked ? 'Scegli prima il giorno' : selected ? `${n} ${n === 1 ? 'selezionato' : 'selezionati'}` : 'Scegli quanti'}</span>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            transition={springTap}
            aria-label={`Togli un ${p.name}`}
            onClick={() => onChange(-1)}
            disabled={n === 0}
            className="flex size-10 items-center justify-center rounded-full border-2 border-[var(--ev-border)] bg-white text-[var(--ev-ink)] transition hover:bg-[var(--ev-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)] disabled:opacity-35"
          >
            <Minus size={18} strokeWidth={3} aria-hidden />
          </motion.button>
          <motion.span key={n} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={springTap} className="w-7 text-center text-pub-lg font-black tabular-nums text-[var(--ev-ink)]" aria-live="polite" aria-label={`${n} ${p.name}`}>
            {n}
          </motion.span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            transition={springTap}
            aria-label={`Aggiungi un ${p.name}`}
            onClick={() => onChange(1)}
            disabled={!canAdd}
            className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-fg shadow-[0_6px_14px_-6px_var(--ev-glow)] transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ev-accent)] disabled:opacity-35"
          >
            <Plus size={18} strokeWidth={3} aria-hidden />
          </motion.button>
        </div>
      </div>
    </motion.li>
  );
}
