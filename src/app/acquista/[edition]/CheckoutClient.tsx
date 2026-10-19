'use client';

import { AlertCircle, ArrowLeft, CalendarDays, Check, Clock, CreditCard, HeartHandshake, Lock, Mail, Minus, Plus, ShieldCheck, ShoppingBag, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { eventCard } from '@/components/public/event-card';
import { Button, Checkbox, Field, Input, Select, Textarea } from '@/components/ui';
import { formatMoney } from '@/lib/money';
import type { CheckoutView, Quote } from '@/server/domain/checkout';
import { placeOrderAction, quoteAction } from './actions';

type Step = 'scegli' | 'dati' | 'riepilogo' | 'pagamento';
const STEPS: Array<{ key: Step; label: string; emoji: string }> = [
  { key: 'scegli', label: 'Scegli', emoji: '🎟️' },
  { key: 'dati', label: 'Dati', emoji: '🧑' },
  { key: 'riepilogo', label: 'Riepilogo', emoji: '🧾' },
  { key: 'pagamento', label: 'Pagamento', emoji: '💳' },
];

type Cart = {
  sessionId: string | null;
  qty: Record<string, number>;
  discountCode: string;
  name: string;
  email: string;
  phone: string;
  privacy: boolean;
  marketing: boolean;
  children: number;
  activities: string[];
  answers: Record<string, string>;
  idempotencyKey: string;
};
type PlacedOrder = { token: string; code: string; expiresAt: string | null; totalCents: number };

const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const emptyCart = (): Cart => ({
  sessionId: null,
  qty: {},
  discountCode: '',
  name: '',
  email: '',
  phone: '',
  privacy: false,
  marketing: false,
  children: 0,
  activities: [],
  answers: {},
  idempotencyKey: newKey(),
});

/** Carrello e passi del checkout. Il client mostra solo quello che calcola il server (quoteAction). */
export function CheckoutClient({ view }: { view: CheckoutView }) {
  const router = useRouter();
  const storageKey = `acquista:${view.edition.slug}`;
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [step, setStep] = useState<Step>('scegli');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [reminded, setReminded] = useState(false);

  // Il carrello resta in sessionStorage se la pagina si ricarica; i prezzi si ricalcolano sempre.
  // Si legge dopo il montaggio (non nello stato iniziale) per non rompere l'idratazione.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { cart: Cart; step: Step; order: PlacedOrder | null };
        setCart({ ...emptyCart(), ...parsed.cart });
        setCodeInput(parsed.cart.discountCode ?? '');
        const stillValid = parsed.order?.expiresAt && new Date(parsed.order.expiresAt).getTime() > Date.now();
        if (parsed.order && stillValid) {
          setOrder(parsed.order);
          setStep('pagamento');
        } else setStep(parsed.step === 'pagamento' ? 'riepilogo' : parsed.step);
      }
    } catch {
      // sessionStorage non disponibile (navigazione privata): si riparte da zero.
    }
  }, [storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ cart, step, order }));
    } catch {}
  }, [storageKey, cart, step, order]);

  // A ogni passo si riparte dall'alto: su telefono il pulsante Continua è in fondo alla pagina.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const set = (patch: Partial<Cart>) => setCart((c) => ({ ...c, ...patch }));
  const needsSession = view.timeSlots && view.products.some((p) => p.requiresSession);
  const session = view.sessions.find((s) => s.id === cart.sessionId) ?? null;
  const lines = Object.entries(cart.qty)
    .filter(([, n]) => n > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
  const admissions = lines.reduce((s, l) => s + (view.products.find((p) => p.id === l.productId)?.kind === 'ticket' ? l.quantity : 0), 0);

  const remainingFor = (productId: string) => {
    const p = view.products.find((x) => x.id === productId)!;
    const key = p.requiresSession ? (cart.sessionId ?? '') : '';
    return p.remaining[key] ?? null;
  };
  // Posti della data condivisi da tutti i biglietti d'ingresso.
  const sessionLeft = session?.remaining ?? null;

  const activities = useMemo(
    () => (view.activities?.activities ?? []).filter((a) => !a.sessionIds.length || (cart.sessionId && a.sessionIds.includes(cart.sessionId))),
    [view.activities, cart.sessionId],
  );
  const labProduct = view.activities?.labProductId ? view.products.find((p) => p.id === view.activities!.labProductId) : undefined;

  function changeQty(productId: string, delta: number) {
    const p = view.products.find((x) => x.id === productId)!;
    const current = cart.qty[productId] ?? 0;
    let next = Math.max(0, current + delta);
    const max = Math.min(p.maxPerOrder ?? 50, remainingFor(productId) ?? 50);
    if (p.kind === 'ticket' && sessionLeft !== null) next = Math.min(next, current + Math.max(0, sessionLeft - admissions));
    next = Math.min(next, max);
    if (delta > 0 && next === current) return setError('Non ci sono altri posti per questa scelta.');
    if (delta > 0 && current === 0 && p.minPerOrder && next < p.minPerOrder) next = Math.min(p.minPerOrder, max);
    if (delta < 0 && p.minPerOrder && next < p.minPerOrder) next = 0;
    setError('');
    set({ qty: { ...cart.qty, [productId]: next } });
  }

  function answersPayload() {
    const out: Array<{ questionKey: string; value: unknown }> = [];
    if (view.activities) {
      if (view.activities.askChildren) out.push({ questionKey: 'bambini', value: cart.children });
      if (cart.activities.length) out.push({ questionKey: 'attivita', value: cart.activities.filter((k) => activities.some((a) => a.key === k)) });
      for (const q of view.activities.questions) {
        const v = cart.answers[q.key]?.trim();
        if (v) out.push({ questionKey: q.key, value: q.type === 'numero' ? Number(v) : v });
      }
    }
    return out;
  }

  async function refreshQuote(code = cart.discountCode): Promise<Quote | null> {
    setBusy(true);
    setError('');
    const res = await quoteAction({ editionId: view.edition.id, sessionId: cart.sessionId, lines, discountCode: code || null });
    setBusy(false);
    if (!res.ok) {
      if (res.code === 'DISCOUNT_INVALID' && code) {
        // Riepilogo senza il codice, con il messaggio sul codice.
        set({ discountCode: '' });
        const plain = await refreshQuote('');
        setError(res.error);
        return plain;
      }
      setQuote(null);
      setError(res.error);
      return null;
    }
    setQuote(res.data);
    if (code !== cart.discountCode) set({ discountCode: code });
    return res.data;
  }

  function goDati() {
    if (needsSession && !session) return setError('Scegli la data.');
    if (!lines.length) return setError('Scegli almeno un biglietto.');
    setError('');
    setStep('dati');
  }

  async function goRiepilogo() {
    if (cart.name.trim().length < 2) return setError('Scrivi nome e cognome.');
    if (!/^\S+@\S+\.\S+$/.test(cart.email.trim())) return setError('Scrivi un’email valida: ti mandiamo lì i biglietti.');
    if (view.activities?.askChildren && cart.children > admissions) return setError('I bambini non possono essere più degli ingressi.');
    for (const q of view.activities?.questions ?? []) if (q.required && !cart.answers[q.key]?.trim()) return setError(`Rispondi a: ${q.label}`);
    if (!cart.privacy) return setError('Per continuare serve il consenso al trattamento dei dati.');
    const missingLab = labProduct && !(cart.qty[labProduct.id] > 0);
    const missingActivity = activities.length > 0 && cart.activities.length === 0;
    if (view.activities?.remindIfMissing && !reminded && (missingLab || missingActivity)) {
      setReminded(true);
      return setError(
        [missingActivity && 'Non hai scelto nessuna attività gratuita.', missingLab && `Non hai aggiunto “${labProduct!.name}”.`, 'Se va bene così, premi di nuovo Continua.']
          .filter(Boolean)
          .join(' '),
      );
    }
    setError('');
    if (await refreshQuote()) setStep('riepilogo');
  }

  async function pay() {
    if (!quote) return;
    setBusy(true);
    setError('');
    const res = await placeOrderAction({
      editionId: view.edition.id,
      sessionId: cart.sessionId,
      lines,
      discountCode: cart.discountCode || null,
      customer: { name: cart.name, email: cart.email, phone: cart.phone || null, marketingConsent: cart.marketing },
      privacyConsent: cart.privacy as true,
      answers: answersPayload(),
      idempotencyKey: cart.idempotencyKey,
      expectedTotalCents: quote.totalCents,
    });
    setBusy(false);
    if (!res.ok) {
      // Il prezzo o i posti sono cambiati: si ricalcola e si riprova con una chiave nuova.
      set({ idempotencyKey: newKey() });
      if (res.code === 'PRICE_CHANGED') await refreshQuote();
      return setError(res.error);
    }
    if (res.data.status === 'paid') {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
      return router.push(`/acquista/${view.edition.slug}/conferma/${res.data.token}`);
    }
    setOrder(res.data);
    setStep('pagamento');
  }

  function restart() {
    setOrder(null);
    setQuote(null);
    set({ idempotencyKey: newKey() });
    setStep('scegli');
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const productName = (id: string) => view.products.find((p) => p.id === id)?.name ?? '';
  const estimateCents = lines.reduce((sum, l) => sum + (view.products.find((p) => p.id === l.productId)?.priceCents ?? 0) * l.quantity, 0);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <ol className={`${eventCard} flex gap-1 p-1.5 text-label`} aria-label="Passi dell’acquisto">
          {STEPS.map((s, i) => {
            const current = i === stepIndex;
            const done = i < stepIndex;
            return (
              <li
                key={s.key}
                aria-current={current ? 'step' : undefined}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-center font-semibold transition-colors ${current ? 'bg-primary text-primary-fg shadow-md' : done ? 'bg-[var(--ev-soft)] text-[var(--ev-ink)]' : 'text-muted'}`}
              >
                <span className="sr-only">Passo {i + 1}: </span>
                {done ? <Check size={14} strokeWidth={3} aria-hidden className="text-success" /> : <span aria-hidden className="hidden sm:inline">{s.emoji}</span>}
                <span>{s.label}</span>
              </li>
            );
          })}
        </ol>

        {error && (
          <p role="alert" data-testid="errore" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-body text-danger">
            <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        {step === 'scegli' && (
          <>
            {needsSession && (
              <section className={`${eventCard} p-4 sm:p-5`}>
                <SectionTitle emoji="📅" title="Scegli il giorno" hint="I biglietti valgono per la data che scegli." />
                <div role="radiogroup" aria-label="Data" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {view.sessions.map((s) => {
                    const d = dayParts(s.startsAt);
                    const checked = cart.sessionId === s.id;
                    const note = !s.open
                      ? s.status === 'sold_out'
                        ? 'Esaurito'
                        : s.status === 'postponed'
                          ? 'Rinviata'
                          : 'Non in vendita'
                      : view.showRemaining && s.remaining !== null && s.low
                        ? `Ultimi ${s.remaining} posti`
                        : `Dalle ${d.time}`;
                    return (
                      <label
                        key={s.id}
                        className={`relative flex cursor-pointer flex-col items-center rounded-xl border-2 px-2 py-3 text-center transition ${checked ? 'border-primary bg-[var(--ev-softer)] shadow-md' : 'border-[var(--ev-border)] bg-white hover:border-primary/60'} ${!s.open ? 'cursor-not-allowed opacity-55' : ''} has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary`}
                      >
                        <input
                          type="radio"
                          name="data"
                          value={s.id}
                          checked={checked}
                          disabled={!s.open}
                          onChange={() => set({ sessionId: s.id, activities: [] })}
                          aria-label={`${s.label}${s.open ? '' : ` (${note})`}`}
                          className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        />
                        {checked && <Check size={16} strokeWidth={3} aria-hidden className="absolute right-2 top-2 text-primary" />}
                        <span className="text-label font-semibold uppercase tracking-wide text-muted">{d.weekday}</span>
                        <span className="text-[2rem] font-bold leading-none text-[var(--ev-ink)]">{d.day}</span>
                        <span className="text-label font-medium text-[var(--ev-ink)]">{d.month}</span>
                        <span className={`mt-1.5 rounded-full px-2 py-0.5 text-caption font-semibold ${!s.open ? 'bg-danger-bg text-danger' : s.low ? 'bg-warning-bg text-warning' : 'bg-[var(--ev-soft)] text-[var(--ev-ink)]'}`}>
                          {note}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            )}
            <section className={`${eventCard} p-4 sm:p-5`}>
              <SectionTitle emoji="🎟️" title="Biglietti" hint={needsSession && !session ? 'Scegli prima il giorno, poi quanti biglietti.' : 'Scegli quanti ne vuoi: il prezzo è per persona.'} />
              <ul className="flex flex-col gap-2.5">
                {view.products.map((p) => {
                  const n = cart.qty[p.id] ?? 0;
                  const left = remainingFor(p.id);
                  const blocked = p.requiresSession && needsSession && !session;
                  return (
                    <li
                      key={p.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition sm:p-4 ${n > 0 ? 'border-primary/50 bg-[var(--ev-softer)]' : 'border-[var(--ev-border)] bg-white'}`}
                    >
                      <span aria-hidden className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ev-soft)] text-[1.35rem] sm:flex">
                        {KIND_EMOJI[p.kind] ?? '🛍️'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-section font-semibold text-[var(--ev-ink)]">{p.name}</p>
                        {p.description && <p className="mt-0.5 text-label text-muted">{p.description}</p>}
                        <p className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-section font-bold text-primary">{p.priceCents === 0 ? 'Gratis' : formatMoney(p.priceCents)}</span>
                          {left === 0 && !blocked && <span className="rounded-full bg-danger-bg px-2 py-0.5 text-caption font-semibold text-danger">Esaurito</span>}
                          {left !== null && left > 0 && left <= 10 && !blocked && <span className="rounded-full bg-warning-bg px-2 py-0.5 text-caption font-semibold text-warning">Ultimi {left}</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white p-1 shadow-sm ring-1 ring-[var(--ev-border)]">
                        <button
                          type="button"
                          aria-label={`Togli un ${p.name}`}
                          onClick={() => changeQty(p.id, -1)}
                          disabled={n === 0}
                          className="flex size-10 items-center justify-center rounded-full text-[var(--ev-ink)] transition hover:bg-[var(--ev-soft)] focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-35"
                        >
                          <Minus size={18} aria-hidden />
                        </button>
                        <span className="w-6 text-center text-section font-bold tabular-nums text-[var(--ev-ink)]" aria-live="polite" aria-label={`${n} ${p.name}`}>
                          {n}
                        </span>
                        <button
                          type="button"
                          aria-label={`Aggiungi un ${p.name}`}
                          onClick={() => changeQty(p.id, 1)}
                          disabled={blocked || left === 0}
                          className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-fg shadow transition hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-35"
                        >
                          <Plus size={18} aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
            <StepActions>
              <span />
              <Button size="lg" onClick={goDati} icon={Ticket} className="rounded-full px-6 shadow-lg">
                Continua
              </Button>
            </StepActions>
          </>
        )}

        {step === 'dati' && (
          <>
            <section className={`${eventCard} flex flex-col gap-4 p-4 sm:p-5`}>
              <SectionTitle emoji="🧑" title="I tuoi dati" hint="Ti mandiamo i biglietti per email, con il QR da mostrare all’ingresso." />
              <Field label="Nome e cognome" required>
                <Input autoComplete="name" value={cart.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" help="Ti mandiamo qui i biglietti." required>
                  <Input type="email" inputMode="email" autoComplete="email" value={cart.email} onChange={(e) => set({ email: e.target.value })} maxLength={200} />
                </Field>
                <Field label="Telefono" help="Facoltativo: solo per avvisi sull’evento.">
                  <Input type="tel" inputMode="tel" autoComplete="tel" value={cart.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={30} />
                </Field>
              </div>
            </section>

            {view.activities && (
              <section className={`${eventCard} flex flex-col gap-4 p-4 sm:p-5`}>
                <SectionTitle emoji="🎨" title="Bambini e attività" hint="Le attività gratuite sono incluse nel biglietto: dicci a quali partecipate." />
                {view.activities.askChildren && (
                  <Field label="Quanti bambini ci sono?" help={`Su ${admissions} ${admissions === 1 ? 'ingresso' : 'ingressi'}.`}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={admissions}
                      value={String(cart.children)}
                      onChange={(e) => set({ children: Math.max(0, Math.min(admissions, Number(e.target.value) || 0)) })}
                      className="max-w-28"
                    />
                  </Field>
                )}
                {activities.length > 0 && (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-body font-semibold text-[var(--ev-ink)]">Attività gratuite incluse</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {activities.map((a) => {
                        const on = cart.activities.includes(a.key);
                        return (
                          <div key={a.key} className={`rounded-xl border p-3 transition ${on ? 'border-primary/60 bg-[var(--ev-softer)]' : 'border-[var(--ev-border)] bg-white'}`}>
                            <Checkbox
                              label={a.label}
                              description={[a.details, a.target === 'bambini' ? 'Per i bambini' : 'Per tutti', a.maxPlaces ? `${a.maxPlaces} posti per giorno` : ''].filter(Boolean).join(' · ')}
                              checked={on}
                              onCheckedChange={(c) => set({ activities: c ? [...cart.activities, a.key] : cart.activities.filter((k) => k !== a.key) })}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                {labProduct && !(cart.qty[labProduct.id] > 0) && (
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/50 bg-[var(--ev-softer)] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-body text-[var(--ev-ink)]">
                      <span aria-hidden>✨ </span>Vuoi aggiungere <strong>{labProduct.name}</strong> ({formatMoney(labProduct.priceCents)})?
                    </p>
                    <Button size="sm" onClick={() => changeQty(labProduct.id, 1)} icon={Plus} className="rounded-full">
                      Aggiungi
                    </Button>
                  </div>
                )}
                {view.activities.questions.map((q) => (
                  <Field key={q.key} label={q.label} required={q.required}>
                    {q.type === 'scelta' ? (
                      <Select
                        value={cart.answers[q.key] ?? ''}
                        onValueChange={(v) => set({ answers: { ...cart.answers, [q.key]: v } })}
                        placeholder="Scegli"
                        options={q.options
                          .split(',')
                          .map((o) => o.trim())
                          .filter(Boolean)
                          .map((o) => ({ value: o, label: o }))}
                      />
                    ) : q.type === 'numero' ? (
                      <Input type="number" inputMode="numeric" value={cart.answers[q.key] ?? ''} onChange={(e) => set({ answers: { ...cart.answers, [q.key]: e.target.value } })} className="max-w-28" />
                    ) : (
                      <Textarea rows={2} maxLength={500} value={cart.answers[q.key] ?? ''} onChange={(e) => set({ answers: { ...cart.answers, [q.key]: e.target.value } })} />
                    )}
                  </Field>
                ))}
              </section>
            )}

            <section className={`${eventCard} flex flex-col gap-3 p-4 sm:p-5`}>
              <Checkbox
                checked={cart.privacy}
                onCheckedChange={(c) => set({ privacy: c })}
                label={
                  <>
                    Ho letto l’
                    <a href="/privacy" target="_blank" className="text-primary underline">
                      informativa privacy
                    </a>{' '}
                    e acconsento al trattamento dei dati per l’acquisto.
                  </>
                }
              />
              <Checkbox checked={cart.marketing} onCheckedChange={(c) => set({ marketing: c })} label="Voglio ricevere le novità sui prossimi eventi (facoltativo)." />
            </section>
            <StepActions>
              <Button variant="ghost" icon={ArrowLeft} onClick={() => (setError(''), setStep('scegli'))}>
                Indietro
              </Button>
              <Button size="lg" onClick={goRiepilogo} loading={busy} className="rounded-full px-6 shadow-lg">
                Continua
              </Button>
            </StepActions>
          </>
        )}

        {step === 'riepilogo' && quote && (
          <>
            <section className={`${eventCard} overflow-hidden`}>
              <div className="flex items-center gap-3 bg-[var(--ev-soft)] px-4 py-3 sm:px-5">
                <span aria-hidden className="text-[1.4rem]">🧾</span>
                <div>
                  <h2 className="text-section font-bold text-[var(--ev-ink)]">Riepilogo</h2>
                  <p className="text-label text-[var(--ev-ink)]/80">
                    {[session?.label, cart.name, cart.email].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <ul className="flex flex-col gap-2">
                  {quote.lines.map((l) => (
                    <li key={l.productId} className="flex justify-between gap-3 text-body">
                      <span>
                        <span className="font-semibold text-[var(--ev-ink)]">{l.quantity}×</span> {l.name}
                        <span className="text-muted"> · {formatMoney(l.unitPriceCents)} cad.</span>
                      </span>
                      <span className="tabular-nums">{formatMoney(l.unitPriceCents * l.quantity)}</span>
                    </li>
                  ))}
                  {quote.discountCents > 0 && (
                    <li className="flex justify-between gap-3 text-body font-medium text-success">
                      <span>Sconto {quote.discountCode}</span>
                      <span className="tabular-nums">−{formatMoney(quote.discountCents)}</span>
                    </li>
                  )}
                </ul>
                <p className="mt-4 flex items-baseline justify-between border-t-2 border-dashed border-[var(--ev-border)] pt-4 font-bold">
                  <span className="text-section text-[var(--ev-ink)]">Totale</span>
                  <span className="text-[1.75rem] tabular-nums text-primary" data-testid="totale">
                    {formatMoney(quote.totalCents)}
                  </span>
                </p>
                <form
                  className="mt-4 flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    refreshQuote(codeInput.trim().toUpperCase());
                  }}
                >
                  <Field label="Codice sconto" className="flex-1">
                    <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} maxLength={40} autoCapitalize="characters" />
                  </Field>
                  <Button type="submit" variant="secondary" disabled={!codeInput.trim() || busy}>
                    Applica
                  </Button>
                </form>
              </div>
            </section>
            <StepActions>
              <Button variant="ghost" icon={ArrowLeft} onClick={() => (setError(''), setStep('dati'))}>
                Indietro
              </Button>
              <Button size="lg" onClick={pay} loading={busy} icon={quote.totalCents ? CreditCard : Ticket} className="rounded-full px-6 shadow-lg">
                {quote.totalCents ? 'Vai al pagamento' : 'Conferma'}
              </Button>
            </StepActions>
          </>
        )}

        {step === 'pagamento' && order && <PaymentStep order={order} slug={view.edition.slug} onRestart={restart} />}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
        <section className={`${eventCard} overflow-hidden`} aria-label="Il tuo ordine">
          <h2 className="flex items-center gap-2 bg-primary px-4 py-3 text-section font-bold text-primary-fg">
            <ShoppingBag size={18} aria-hidden /> Il tuo ordine
          </h2>
          <div className="p-4">
            {session && (
              <p className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--ev-soft)] px-3 py-2 text-body font-medium text-[var(--ev-ink)]">
                <CalendarDays size={16} aria-hidden /> {session.label} · {dayParts(session.startsAt).time}
              </p>
            )}
            {lines.length === 0 ? (
              <p className="py-4 text-center text-body text-muted">
                <span aria-hidden className="mb-1 block text-[1.75rem]">🛒</span>
                Ancora nessun biglietto.
              </p>
            ) : (
              <>
                <ul className="flex flex-col gap-1.5 text-body">
                  {lines.map((l) => (
                    <li key={l.productId} className="flex justify-between gap-3">
                      <span>
                        {l.quantity}× {productName(l.productId)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex justify-between border-t border-[var(--ev-border)] pt-3 text-section font-bold text-[var(--ev-ink)]">
                  <span>{quote && step !== 'scegli' ? 'Totale' : 'Totale indicativo'}</span>
                  <span className="tabular-nums">{formatMoney(quote && step !== 'scegli' ? quote.totalCents : estimateCents)}</span>
                </p>
                {!(quote && step !== 'scegli') && <p className="mt-1 text-caption text-muted">Il totale esatto, con eventuali sconti, lo vedi nel riepilogo.</p>}
              </>
            )}
          </div>
        </section>
        <ul className={`${eventCard} flex flex-col gap-3 p-4 text-label text-fg`}>
          <Perk icon={Lock} title="Pagamento sicuro" text="Paghi sulla pagina protetta di Nexi: noi non vediamo i dati della carta." />
          <Perk icon={Mail} title="Biglietti subito via email" text="Con il QR da mostrare all’ingresso, anche dal telefono." />
          <Perk icon={HeartHandshake} title="Organizzato dalla Pro Loco" text="Volontari di Gasperina: per qualsiasi dubbio scrivici dalla pagina Contatti." />
        </ul>
      </aside>
    </div>
  );
}

const KIND_EMOJI: Record<string, string> = { ticket: '🎟️', addon: '🎨', food: '🍽️', drink: '🥤', merch: '🛍️', donation: '💛', service: '🧩' };

const dayFmt = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Giorno della settimana, numero, mese e ora (Roma) per le schede delle date. */
function dayParts(iso: string) {
  const parts = Object.fromEntries(dayFmt.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return { weekday: parts.weekday.replace('.', ''), day: parts.day, month: parts.month.replace('.', ''), time: `${parts.hour}:${parts.minute}` };
}

function SectionTitle({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ev-soft)] text-[1.25rem]">
        {emoji}
      </span>
      <div>
        <h2 className="text-section font-bold text-[var(--ev-ink)]">{title}</h2>
        {hint && <p className="text-label text-muted">{hint}</p>}
      </div>
    </div>
  );
}

function StepActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-between gap-2">{children}</div>;
}

function Perk({ icon: Icon, title, text }: { icon: typeof Lock; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ev-soft)] text-primary">
        <Icon size={16} aria-hidden />
      </span>
      <span>
        <strong className="block text-body text-[var(--ev-ink)]">{title}</strong>
        <span className="text-muted">{text}</span>
      </span>
    </li>
  );
}

function PaymentStep({ order, slug, onRestart }: { order: PlacedOrder; slug: string; onRestart: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = order.expiresAt ? Math.max(0, new Date(order.expiresAt).getTime() - now) : null;
  const expired = left === 0;
  const mm = left === null ? '' : `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
  return (
    <section className={`${eventCard} overflow-hidden`}>
      <div className="flex flex-wrap items-end justify-between gap-3 bg-[var(--ev-soft)] px-4 py-4 sm:px-5">
        <div>
          <p className="text-label font-semibold uppercase tracking-wide text-[var(--ev-ink)]/75">Ordine {order.code}</p>
          <p className="text-[1.6rem] font-bold leading-tight text-[var(--ev-ink)]">Da pagare: {formatMoney(order.totalCents)}</p>
        </div>
        {left !== null && !expired && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-body font-semibold text-[var(--ev-ink)] shadow-sm" aria-live="off">
            <Clock size={16} aria-hidden className="text-primary" />
            <span>
              Ti teniamo i posti per <strong className="tabular-nums">{mm}</strong> minuti.
            </span>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {expired ? (
          <>
            <p role="alert" className="text-body text-danger">
              Il tempo per pagare è scaduto e i posti sono stati liberati. Ricomincia l’acquisto: se ci sono ancora posti li ritrovi.
            </p>
            <div>
              <Button onClick={onRestart} className="rounded-full">
                Ricomincia
              </Button>
            </div>
          </>
        ) : (
          <>
            <a
              href={`/acquista/paga/${order.token}`}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-6 text-[1.05rem] font-bold text-primary-fg shadow-lg transition hover:bg-primary-hover"
            >
              <Lock size={18} aria-hidden /> Paga con carta
            </a>
            <p className="flex items-center justify-center gap-2 text-label text-muted">
              <ShieldCheck size={16} aria-hidden className="text-success" /> Pagina sicura di Nexi · Visa, Mastercard, Maestro, Apple Pay e Google Pay
            </p>
            <p className="text-center text-label text-muted">Al termine torni qui con la conferma e i biglietti.</p>
            <a href={`/acquista/${slug}/conferma/${order.token}`} className="text-center text-label text-primary underline">
              Ho già pagato: vedi lo stato dell’ordine
            </a>
          </>
        )}
      </div>
    </section>
  );
}
