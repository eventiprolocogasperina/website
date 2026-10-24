'use client';

import { motion } from 'framer-motion';
import { Clock, Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/money';
import { spring } from '../motion';
import { card } from './parts';

export type PlacedOrder = { token: string; code: string; expiresAt: string | null; totalCents: number };

const CARDS = ['Visa', 'Mastercard', 'Maestro', 'Apple Pay', 'Google Pay'];

/** Pagamento: posti tenuti con il conto alla rovescia, pulsante verso la pagina sicura di Nexi. */
export function PaymentStep({ order, slug, onRestart }: { order: PlacedOrder; slug: string; onRestart: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = order.expiresAt ? Math.max(0, new Date(order.expiresAt).getTime() - now) : null;
  const expired = left === 0;
  const mm = left === null ? '' : `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
  return (
    <section className={`${card} overflow-hidden`} aria-labelledby="titolo-pagamento">
      <div className="flex flex-wrap items-end justify-between gap-3 bg-gradient-to-br from-[var(--ev-soft)] to-[var(--ev-softer)] px-5 py-5">
        <div>
          <p className="text-pub-xs font-bold uppercase tracking-[0.14em] text-[var(--ev-ink)]/75">Ordine {order.code}</p>
          <h2 id="titolo-pagamento" className="font-ev-display text-pub-2xl font-bold leading-tight text-[var(--ev-ink)]">
            Da pagare: <span className="tabular-nums text-primary">{formatMoney(order.totalCents)}</span>
          </h2>
        </div>
        {left !== null && !expired && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-pub-sm font-semibold text-[var(--ev-ink)] shadow-sm" aria-live="off">
            <Clock size={16} aria-hidden className="text-primary" />
            <span>
              Ti teniamo i posti per <strong className="tabular-nums">{mm}</strong> minuti.
            </span>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4 p-5">
        {expired ? (
          <>
            <p role="alert" className="text-pub-base text-danger">
              Il tempo per pagare è scaduto e i posti sono stati liberati. Ricomincia l’acquisto: se ci sono ancora posti li ritrovi.
            </p>
            <div>
              <button type="button" onClick={onRestart} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 text-pub-base font-bold text-primary-fg hover:bg-primary-hover">
                <RotateCcw size={18} aria-hidden /> Ricomincia
              </button>
            </div>
          </>
        ) : (
          <>
            <motion.a
              href={`/acquista/paga/${order.token}`}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring}
              whileTap={{ scale: 0.97 }}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-6 text-pub-lg font-black text-primary-fg shadow-[0_14px_28px_-12px_var(--ev-glow)] transition-colors hover:bg-primary-hover"
            >
              <Lock size={18} aria-hidden /> Paga con carta
            </motion.a>
            <ul aria-label="Metodi accettati" className="flex flex-wrap justify-center gap-1.5">
              {CARDS.map((c) => (
                <li key={c} className="rounded-md border border-border bg-white px-2 py-1 text-pub-xs font-bold text-muted">
                  {c}
                </li>
              ))}
            </ul>
            <p className="flex items-center justify-center gap-2 rounded-xl bg-success-bg px-3 py-2 text-pub-sm font-semibold text-success">
              <ShieldCheck size={18} aria-hidden /> Pagina protetta di Nexi: noi non vediamo i dati della carta.
            </p>
            <p className="text-center text-pub-sm text-muted">Al termine torni qui con la conferma e i biglietti.</p>
            <a href={`/acquista/${slug}/conferma/${order.token}`} className="text-center text-pub-sm font-semibold text-primary underline underline-offset-4">
              Ho già pagato: vedi lo stato dell’ordine
            </a>
          </>
        )}
      </div>
    </section>
  );
}
