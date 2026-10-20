'use client';

import { BellRing, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';
import { subscribeNotifyAction } from '@/server/public/notify-actions';
import type { BlockProps } from './schema';
import { NOTIFY_CONSENT_TEXT, type BlockData } from './types';
import { display } from './ui';

/**
 * "Prossima edizione" con iscrizione Avvisami (§13.3): email e consenso esplicito. Quando la
 * prossima edizione apre le vendite parte un'email a tutti gli iscritti (src/server/domain/pages/notify.ts).
 */
export function Avvisami({ props, data }: { props: BlockProps<'Avvisami'>; data: BlockData }) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ status: 'idle' | 'busy' | 'done' | 'error'; message?: string }>({ status: 'idle' });
  const seriesId = data.series?.id;
  const when = props.nextDate;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (data.preview || !seriesId) return;
    if (!consent) return setState({ status: 'error', message: 'Per iscriverti serve il consenso.' });
    setState({ status: 'busy' });
    const res = await subscribeNotifyAction({ seriesId, email, consent, website: '' });
    setState(res.ok ? { status: 'done' } : { status: 'error', message: res.error });
  }

  return (
    <section id="avvisami" className="scroll-mt-28 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-3xl border-2 border-[var(--brand-border)] bg-white px-6 py-10 text-center shadow-[0_15px_40px_color-mix(in_srgb,var(--brand)_12%,transparent)] @3xl:px-12">
        <BellRing size={32} className="mx-auto text-[var(--brand)]" aria-hidden />
        <h2 className={`${display} mt-3 text-[clamp(1.8rem,5vw,2.4rem)] font-bold leading-tight text-[var(--brand)]`}>{props.title || 'Prossima edizione'}</h2>
        {when && <p className="mt-1 text-[1.05rem] font-bold text-[var(--brand-ink)]">{when}</p>}
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-[var(--brand-ink-soft)]">{props.text || 'Lasciaci la tua email: ti scriviamo appena aprono le vendite dei biglietti.'}</p>
        {state.status === 'done' ? (
          <p role="status" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-5 py-3 font-bold text-[var(--brand-ink)]">
            <CheckCircle2 size={20} className="text-[var(--brand)]" aria-hidden /> Fatto! Ti avviseremo per email.
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 text-left" noValidate>
            <label htmlFor={`${id}-email`} className="text-[0.9rem] font-semibold text-[var(--brand-ink)]">
              La tua email
            </label>
            <input
              id={`${id}-email`}
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-12 rounded-xl border-2 border-[var(--brand-border)] bg-white px-4 text-[1rem] text-[var(--brand-ink)] outline-none focus:border-[var(--brand)]"
              placeholder="nome@esempio.it"
            />
            <label className="flex items-start gap-2.5 text-[0.88rem] leading-snug text-[var(--brand-ink-soft)]">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" />
              <span>
                {NOTIFY_CONSENT_TEXT}{' '}
                <Link href="/privacy" className="underline">
                  Informativa privacy
                </Link>
              </span>
            </label>
            <button type="submit" disabled={state.status === 'busy' || data.preview} className="min-h-12 rounded-full bg-[var(--brand)] px-6 font-extrabold text-[var(--brand-fg)] shadow-sm hover:bg-[var(--brand-strong)] disabled:opacity-60">
              {state.status === 'busy' ? 'Un attimo…' : 'Avvisami'}
            </button>
            {state.status === 'error' && (
              <p role="alert" className="text-center text-[0.9rem] font-semibold text-red-700">
                {state.message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
