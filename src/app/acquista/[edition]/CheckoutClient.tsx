'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, CreditCard, Ticket } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ActivityCards } from '@/components/public/checkout/ActivityCards';
import { ChildrenCounter } from '@/components/public/checkout/ChildrenCounter';
import { ContactStep } from '@/components/public/checkout/ContactStep';
import { card, SectionTitle } from '@/components/public/checkout/parts';
import { PaymentStep, type PlacedOrder } from '@/components/public/checkout/PaymentStep';
import { ProductCard } from '@/components/public/checkout/ProductCard';
import { QuestionFields } from '@/components/public/checkout/QuestionFields';
import { ReminderDialog } from '@/components/public/checkout/ReminderDialog';
import { ReviewStep } from '@/components/public/checkout/ReviewStep';
import { dayParts, SessionPicker } from '@/components/public/checkout/SessionPicker';
import { Stepper, type StepDef } from '@/components/public/checkout/Stepper';
import { MobileTotalBar, SummaryTicket, type StepCta, type SummaryData } from '@/components/public/checkout/SummaryTicket';
import { editionThemeStyle } from '@/lib/edition-theme';
import type { CheckoutView, Quote } from '@/server/domain/checkout';
import { placeOrderAction, quoteAction } from './actions';

type Step = 'scegli' | 'attivita' | 'dati' | 'riepilogo' | 'pagamento';
const ALL_STEPS: StepDef<Step>[] = [
  { key: 'scegli', label: 'Biglietti', short: 'Biglietti', emoji: '🎟️' },
  { key: 'attivita', label: 'Attività', short: 'Attività', emoji: '🎨' },
  { key: 'dati', label: 'I tuoi dati', short: 'Dati', emoji: '🧑' },
  { key: 'riepilogo', label: 'Riepilogo', short: 'Riepilogo', emoji: '🧾' },
  { key: 'pagamento', label: 'Pagamento', short: 'Paga', emoji: '💳' },
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
/** Errori sotto i singoli campi e sezioni (chiavi: session, lines, children, name, email, privacy, code, q:<domanda>). */
type Errors = Partial<Record<string, string>>;

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
  const [quoted, setQuoted] = useState<{ key: string; quote: Quote } | null>(null);
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [reminded, setReminded] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  // Il carrello resta in sessionStorage se la pagina si ricarica; i prezzi si ricalcolano sempre.
  // Si legge dopo il montaggio (non nello stato iniziale) per non rompere l'idratazione.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as { cart: Cart; step: Step; order: PlacedOrder | null };
        setCart({ ...emptyCart(), ...parsed.cart });
        const stillValid = parsed.order?.expiresAt && new Date(parsed.order.expiresAt).getTime() > Date.now();
        if (parsed.order && stillValid) {
          setOrder(parsed.order);
          setStep('pagamento');
        } else setStep(parsed.step === 'pagamento' || parsed.step === 'riepilogo' ? 'dati' : parsed.step);
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

  // A ogni passo si riparte dall'alto: su telefono il pulsante è nella barra in basso.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const set = (patch: Partial<Cart>) => setCart((c) => ({ ...c, ...patch }));
  const clearError = (...keys: string[]) => setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))));
  const needsSession = view.timeSlots && view.products.some((p) => p.requiresSession);
  const session = view.sessions.find((s) => s.id === cart.sessionId) ?? null;
  const lines = Object.entries(cart.qty)
    .filter(([, n]) => n > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
  const admissions = lines.reduce((s, l) => s + (view.products.find((p) => p.id === l.productId)?.kind === 'ticket' ? l.quantity : 0), 0);
  const children = Math.min(cart.children, admissions);

  // Il riepilogo del server vale solo per il carrello con cui è stato chiesto.
  const quoteKey = JSON.stringify([cart.sessionId, lines, cart.discountCode]);
  const quote = quoted?.key === quoteKey ? quoted.quote : null;

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
  const hasActivityStep = !!view.activities && ((view.activities.activities.length ?? 0) > 0 || !!labProduct || view.activities.questions.length > 0);
  const steps = ALL_STEPS.filter((s) => s.key !== 'attivita' || hasActivityStep);
  // Attività scelte ancora valide per il giorno e per i bambini indicati.
  const chosenActivities = cart.activities.filter((k) => activities.some((a) => a.key === k && (a.target === 'tutti' || children > 0)));

  function changeQty(productId: string, delta: number) {
    const p = view.products.find((x) => x.id === productId)!;
    const current = cart.qty[productId] ?? 0;
    let next = Math.max(0, current + delta);
    const max = Math.min(p.maxPerOrder ?? 50, remainingFor(productId) ?? 50);
    if (p.kind === 'ticket' && sessionLeft !== null) next = Math.min(next, current + Math.max(0, sessionLeft - admissions));
    next = Math.min(next, max);
    if (delta > 0 && next === current) return setErrors((e) => ({ ...e, lines: 'Non ci sono altri posti per questa scelta.' }));
    if (delta > 0 && current === 0 && p.minPerOrder && next < p.minPerOrder) next = Math.min(p.minPerOrder, max);
    if (delta < 0 && p.minPerOrder && next < p.minPerOrder) next = 0;
    clearError('lines');
    set({ qty: { ...cart.qty, [productId]: next } });
  }

  function answersPayload() {
    const out: Array<{ questionKey: string; value: unknown }> = [];
    if (view.activities) {
      if (view.activities.askChildren) out.push({ questionKey: 'bambini', value: children });
      if (chosenActivities.length) out.push({ questionKey: 'attivita', value: chosenActivities });
      for (const q of view.activities.questions) {
        const v = cart.answers[q.key]?.trim();
        if (v) out.push({ questionKey: q.key, value: q.type === 'numero' ? Number(v) : v });
      }
    }
    return out;
  }

  async function refreshQuote(code = cart.discountCode): Promise<Quote | null> {
    setBusy(true);
    setServerError('');
    const res = await quoteAction({ editionId: view.edition.id, sessionId: cart.sessionId, lines, discountCode: code || null });
    setBusy(false);
    if (!res.ok) {
      if (res.code === 'DISCOUNT_INVALID' && code) {
        // Riepilogo senza il codice, con il messaggio sotto il campo del codice.
        const plain = await refreshQuote('');
        setErrors((e) => ({ ...e, code: res.error }));
        return plain;
      }
      setServerError(res.error);
      return null;
    }
    setQuoted({ key: JSON.stringify([cart.sessionId, lines, code]), quote: res.data });
    if (code !== cart.discountCode) set({ discountCode: code });
    clearError('code');
    return res.data;
  }

  /** Passo successivo a `from`, saltando quelli spenti. */
  const nextOf = (from: Step) => steps[steps.findIndex((s) => s.key === from) + 1].key;

  function leaveChoose() {
    const e: Errors = {};
    if (needsSession && !session) e.session = 'Scegli il giorno in cui vieni.';
    if (!lines.length) e.lines = 'Scegli almeno un biglietto.';
    setErrors(e);
    setServerError('');
    if (Object.keys(e).length) return document.getElementById(e.session ? 'sezione-giorno' : 'sezione-biglietti')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setStep(nextOf('scegli'));
  }

  function leaveActivities(skipReminder = false) {
    const e: Errors = {};
    for (const q of view.activities?.questions ?? []) if (q.required && !cart.answers[q.key]?.trim()) e[`q:${q.key}`] = 'Rispondi a questa domanda.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const missingLab = !!labProduct && !(cart.qty[labProduct.id] > 0);
    const missingActivity = activities.length > 0 && chosenActivities.length === 0;
    if (!skipReminder && view.activities?.remindIfMissing && !reminded && (missingLab || missingActivity)) {
      setReminded(true);
      return setReminderOpen(true);
    }
    setReminderOpen(false);
    setStep('dati');
  }

  async function leaveData() {
    const e: Errors = {};
    if (cart.name.trim().length < 2) e.name = 'Scrivi nome e cognome.';
    if (!/^\S+@\S+\.\S+$/.test(cart.email.trim())) e.email = 'Scrivi un’email valida: ti mandiamo lì i biglietti.';
    if (!cart.privacy) e.privacy = 'Per continuare serve il consenso al trattamento dei dati.';
    setErrors(e);
    const first = ['name', 'email'].find((k) => e[k]);
    if (first) document.getElementById(`campo-${first}`)?.focus();
    if (Object.keys(e).length) return;
    if (await refreshQuote()) setStep('riepilogo');
  }

  async function pay() {
    if (!quote) return;
    setBusy(true);
    setServerError('');
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
      return setServerError(res.error);
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
    setQuoted(null);
    set({ idempotencyKey: newKey() });
    setStep('scegli');
  }

  function goTo(s: Step) {
    setServerError('');
    setErrors({});
    setStep(s);
  }

  const cta: StepCta =
    step === 'scegli'
      ? { label: 'Continua', onClick: leaveChoose, icon: ArrowRight }
      : step === 'attivita'
        ? { label: 'Continua', onClick: () => leaveActivities(), icon: ArrowRight }
        : step === 'dati'
          ? { label: 'Continua', onClick: leaveData, busy, icon: ArrowRight }
          : step === 'riepilogo' && quote
            ? { label: quote.totalCents ? 'Vai al pagamento' : 'Conferma', onClick: pay, busy, icon: quote.totalCents ? CreditCard : Ticket }
            : null;

  const summary: SummaryData = {
    editionTitle: view.edition.title,
    sessionLabel: session ? `${session.label} · dalle ${dayParts(session.startsAt).time}` : null,
    lines: lines.map((l) => {
      const p = view.products.find((x) => x.id === l.productId)!;
      return { ...l, name: p.name, unitCents: p.priceCents };
    }),
    admissions,
    children: view.activities?.askChildren ? children : null,
    activities: chosenActivities.map((k) => activities.find((a) => a.key === k)?.label ?? k),
    quote: step === 'riepilogo' || step === 'pagamento' ? quote : null,
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Stepper steps={steps} current={step} onGo={goTo} locked={step === 'pagamento'} />

        {serverError && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            data-testid="errore"
            className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger-bg px-4 py-3 text-pub-sm font-medium text-danger"
          >
            <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0" />
            {serverError}
          </motion.p>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} transition={{ duration: 0.25 }} className="flex flex-col gap-5">
            {step === 'scegli' && (
              <>
                {needsSession && (
                  <div id="sezione-giorno" className="flex flex-col gap-2">
                    <SessionPicker
                      view={view}
                      value={cart.sessionId}
                      onChange={(id) => {
                        set({ sessionId: id, activities: [] });
                        clearError('session');
                      }}
                    />
                    {errors.session && <InlineError>{errors.session}</InlineError>}
                  </div>
                )}
                <section id="sezione-biglietti" className={`${card} p-4 sm:p-6`} aria-labelledby="titolo-biglietti">
                  <SectionTitle id="titolo-biglietti" emoji="🎟️" title="Biglietti" hint={needsSession && !session ? 'Scegli prima il giorno, poi quanti biglietti.' : 'Scegli quanti ne vuoi: il contributo è per persona.'} />
                  <ul className="flex flex-col gap-3">
                    {view.products.map((p, i) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        index={i}
                        quantity={cart.qty[p.id] ?? 0}
                        left={remainingFor(p.id)}
                        blocked={!!(p.requiresSession && needsSession && !session)}
                        mark={view.edition.brand.mark}
                        onChange={(d) => changeQty(p.id, d)}
                      />
                    ))}
                  </ul>
                  {errors.lines && <InlineError className="mt-3">{errors.lines}</InlineError>}
                </section>
                {view.activities?.askChildren && admissions > 0 && <ChildrenCounter value={children} max={admissions} onChange={(n) => set({ children: Math.max(0, Math.min(admissions, n)) })} />}
              </>
            )}

            {step === 'attivita' && view.activities && (
              <>
                <ActivityCards
                  view={view}
                  sessionId={cart.sessionId}
                  childCount={children}
                  selected={chosenActivities}
                  onToggle={(key, on) => set({ activities: on ? [...chosenActivities, key] : chosenActivities.filter((k) => k !== key) })}
                  lab={labProduct}
                  labQuantity={labProduct ? (cart.qty[labProduct.id] ?? 0) : 0}
                  onAddLab={() => labProduct && changeQty(labProduct.id, 1)}
                />
                {view.activities.questions.length > 0 && (
                  <QuestionFields questions={view.activities.questions} answers={cart.answers} errors={errors} onChange={(key, v) => set({ answers: { ...cart.answers, [key]: v } })} />
                )}
              </>
            )}

            {step === 'dati' && (
              <ContactStep
                data={cart}
                errors={errors}
                rulesUrl={view.edition.rulesUrl}
                onChange={(patch) => {
                  set(patch);
                  clearError(...Object.keys(patch));
                }}
              />
            )}

            {step === 'riepilogo' && quote && (
              <ReviewStep
                quote={quote}
                details={[session?.label, cart.name, cart.email].filter(Boolean).join(' · ')}
                initialCode={cart.discountCode}
                codeError={errors.code}
                busy={busy}
                onApply={(code) => refreshQuote(code)}
                onCodeEdit={() => clearError('code')}
              />
            )}

            {step === 'pagamento' && order && <PaymentStep order={order} slug={view.edition.slug} onRestart={restart} />}
          </motion.div>
        </AnimatePresence>

        {step !== 'scegli' && step !== 'pagamento' && (
          <div>
            <button
              type="button"
              onClick={() => goTo(steps[steps.findIndex((s) => s.key === step) - 1].key)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-pub-sm font-semibold text-[var(--ev-ink)] hover:bg-[var(--ev-soft)] focus-visible:outline-2 focus-visible:outline-[var(--ev-accent)]"
            >
              <ArrowLeft size={16} aria-hidden /> Indietro
            </button>
          </div>
        )}
      </div>

      <SummaryTicket data={summary} cta={cta} />
      {step !== 'pagamento' && <MobileTotalBar data={summary} cta={cta} />}

      <ReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        themeStyle={editionThemeStyle(view.edition.theme, view.edition.brand)}
        missingActivity={activities.length > 0 && chosenActivities.length === 0}
        lab={labProduct && !(cart.qty[labProduct.id] > 0) ? labProduct : null}
        onAddLab={() => {
          if (labProduct) changeQty(labProduct.id, 1);
          setReminderOpen(false);
        }}
        onContinue={() => leaveActivities(true)}
      />
    </div>
  );
}

function InlineError({ children, className = '' }: { children: string; className?: string }) {
  return (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className={`flex items-center gap-2 text-pub-sm font-semibold text-danger ${className}`}>
      <AlertCircle size={16} aria-hidden className="shrink-0" /> {children}
    </motion.p>
  );
}

