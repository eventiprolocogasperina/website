'use client';

import { ArrowLeft, CreditCard, Lock, Minus, Plus, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Field, Input, RadioGroup, Select, Textarea } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import type { CheckoutView, Quote } from '@/server/domain/checkout';
import { placeOrderAction, quoteAction } from './actions';

type Step = 'scegli' | 'dati' | 'riepilogo' | 'pagamento';
const STEPS: Array<{ key: Step; label: string }> = [
  { key: 'scegli', label: 'Scegli' },
  { key: 'dati', label: 'Dati' },
  { key: 'riepilogo', label: 'Riepilogo' },
  { key: 'pagamento', label: 'Pagamento' },
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

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex gap-2 text-label" aria-label="Passi dell’acquisto">
        {STEPS.map((s, i) => (
          <li
            key={s.key}
            aria-current={i === stepIndex ? 'step' : undefined}
            className={`flex-1 rounded-full px-3 py-1.5 text-center ${i === stepIndex ? 'bg-primary text-primary-fg' : i < stepIndex ? 'bg-surface-sunken text-fg' : 'bg-surface-sunken text-muted'}`}
          >
            <span className="sr-only">Passo {i + 1}: </span>
            {s.label}
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" data-testid="errore" className="rounded-lg bg-danger-bg px-4 py-3 text-body text-danger">
          {error}
        </p>
      )}

      {step === 'scegli' && (
        <>
          {needsSession && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="mb-3 text-section font-semibold">Scegli la data</h2>
              <RadioGroup
                aria-label="Data"
                value={cart.sessionId ?? ''}
                onValueChange={(v) => set({ sessionId: v, activities: [] })}
                options={view.sessions.map((s) => ({
                  value: s.id,
                  disabled: !s.open,
                  label: s.label,
                  description: !s.open
                    ? s.status === 'sold_out'
                      ? 'Esaurito'
                      : s.status === 'postponed'
                        ? 'Rinviata'
                        : 'Non più in vendita'
                    : view.showRemaining && s.remaining !== null && s.low
                      ? `Ultimi ${s.remaining} posti`
                      : formatDateTime(s.startsAt),
                }))}
              />
            </section>
          )}
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-3 text-section font-semibold">Biglietti</h2>
            <ul className="flex flex-col divide-y divide-border">
              {view.products.map((p) => {
                const n = cart.qty[p.id] ?? 0;
                const left = remainingFor(p.id);
                const blocked = p.requiresSession && needsSession && !session;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-section font-medium text-fg">{p.name}</p>
                      {p.description && <p className="text-label text-muted">{p.description}</p>}
                      <p className="text-body text-fg">{p.priceCents === 0 ? 'Gratis' : formatMoney(p.priceCents)}</p>
                      {left === 0 && !blocked && <p className="text-label text-danger">Esaurito</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button size="icon-lg" variant="secondary" aria-label={`Togli un ${p.name}`} onClick={() => changeQty(p.id, -1)} disabled={n === 0}>
                        <Minus size={18} aria-hidden />
                      </Button>
                      <span className="w-6 text-center text-section tabular-nums" aria-live="polite" aria-label={`${n} ${p.name}`}>
                        {n}
                      </span>
                      <Button size="icon-lg" variant="secondary" aria-label={`Aggiungi un ${p.name}`} onClick={() => changeQty(p.id, 1)} disabled={blocked || left === 0}>
                        <Plus size={18} aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {needsSession && !session && <p className="mt-2 text-label text-muted">Scegli prima la data.</p>}
          </section>
          <div className="flex justify-end">
            <Button size="lg" onClick={goDati} icon={Ticket}>
              Continua
            </Button>
          </div>
        </>
      )}

      {step === 'dati' && (
        <>
          <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
            <h2 className="text-section font-semibold">I tuoi dati</h2>
            <Field label="Nome e cognome" required>
              <Input autoComplete="name" value={cart.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} />
            </Field>
            <Field label="Email" help="Ti mandiamo qui i biglietti." required>
              <Input type="email" inputMode="email" autoComplete="email" value={cart.email} onChange={(e) => set({ email: e.target.value })} maxLength={200} />
            </Field>
            <Field label="Telefono" help="Facoltativo: solo per avvisi sull’evento.">
              <Input type="tel" inputMode="tel" autoComplete="tel" value={cart.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={30} />
            </Field>
          </section>

          {view.activities && (
            <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
              <h2 className="text-section font-semibold">Bambini e attività</h2>
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
                  <legend className="mb-1 text-body font-medium text-fg">Attività gratuite incluse</legend>
                  {activities.map((a) => (
                    <Checkbox
                      key={a.key}
                      label={a.label}
                      description={[a.details, a.target === 'bambini' ? 'Per i bambini' : 'Per tutti', a.maxPlaces ? `${a.maxPlaces} posti per giorno` : ''].filter(Boolean).join(' · ')}
                      checked={cart.activities.includes(a.key)}
                      onCheckedChange={(c) => set({ activities: c ? [...cart.activities, a.key] : cart.activities.filter((k) => k !== a.key) })}
                    />
                  ))}
                </fieldset>
              )}
              {labProduct && !(cart.qty[labProduct.id] > 0) && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-sunken p-3">
                  <p className="text-body text-fg">
                    Vuoi aggiungere <strong>{labProduct.name}</strong> ({formatMoney(labProduct.priceCents)})?
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => changeQty(labProduct.id, 1)}>
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

          <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
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
          <div className="flex justify-between gap-2">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => (setError(''), setStep('scegli'))}>
              Indietro
            </Button>
            <Button size="lg" onClick={goRiepilogo} loading={busy}>
              Continua
            </Button>
          </div>
        </>
      )}

      {step === 'riepilogo' && quote && (
        <>
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-3 text-section font-semibold">Riepilogo</h2>
            {session && <p className="mb-2 text-body text-muted">Data: {session.label}</p>}
            <ul className="flex flex-col gap-1.5">
              {quote.lines.map((l) => (
                <li key={l.productId} className="flex justify-between gap-3 text-body">
                  <span>
                    {l.quantity}× {l.name}
                  </span>
                  <span className="tabular-nums">{formatMoney(l.unitPriceCents * l.quantity)}</span>
                </li>
              ))}
              {quote.discountCents > 0 && (
                <li className="flex justify-between gap-3 text-body text-success">
                  <span>Sconto {quote.discountCode}</span>
                  <span className="tabular-nums">−{formatMoney(quote.discountCents)}</span>
                </li>
              )}
            </ul>
            <p className="mt-3 flex justify-between border-t border-border pt-3 text-title font-semibold">
              <span>Totale</span>
              <span className="tabular-nums" data-testid="totale">
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
          </section>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" icon={ArrowLeft} onClick={() => (setError(''), setStep('dati'))}>
              Indietro
            </Button>
            <Button size="lg" onClick={pay} loading={busy} icon={quote.totalCents ? CreditCard : Ticket}>
              {quote.totalCents ? 'Vai al pagamento' : 'Conferma'}
            </Button>
          </div>
        </>
      )}

      {step === 'pagamento' && order && <PaymentStep order={order} slug={view.edition.slug} onRestart={restart} />}
    </div>
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
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div>
        <p className="text-label text-muted">Ordine {order.code}</p>
        <p className="text-title font-semibold">Da pagare: {formatMoney(order.totalCents)}</p>
      </div>
      {expired ? (
        <>
          <p role="alert" className="text-body text-danger">
            Il tempo per pagare è scaduto e i posti sono stati liberati. Ricomincia l’acquisto: se ci sono ancora posti li ritrovi.
          </p>
          <div>
            <Button onClick={onRestart}>Ricomincia</Button>
          </div>
        </>
      ) : (
        <>
          {left !== null && (
            <p className="text-body text-fg" aria-live="off">
              Ti teniamo i posti per <strong className="tabular-nums">{mm}</strong> minuti.
            </p>
          )}
          <a
            href={`/acquista/paga/${order.token}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-section font-semibold text-primary-fg hover:bg-primary-hover"
          >
            <Lock size={18} aria-hidden /> Paga con carta
          </a>
          <p className="text-label text-muted">Ti portiamo sulla pagina sicura di Nexi. Al termine torni qui con la conferma e i biglietti.</p>
          <a href={`/acquista/${slug}/conferma/${order.token}`} className="text-label text-primary underline">
            Ho già pagato: vedi lo stato dell’ordine
          </a>
        </>
      )}
    </section>
  );
}
