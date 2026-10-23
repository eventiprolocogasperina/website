'use client';

import { History, LockKeyhole, LogOut, MoreVertical, Repeat } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, ErrorState, Skeleton, cn } from '@/components/ui';
import { kv } from '@/lib/cash/offline-queue';
import { CassaError, LEGACY_CASSA_PERMISSIONS, type CassaState, type PosProduct, type Sale } from '@/lib/cash/types';
import type { ApiFn } from './api';
import { CartBar, CartLines, CartPanel } from './Cart';
import { CloseShift } from './CloseShift';
import { OpenAmount } from './OpenAmount';
import { Payment, type PaymentChoice } from './Payment';
import { ProductGrid } from './ProductGrid';
import { RecentSales } from './RecentSales';
import { SaleDone } from './SaleDone';
import { ShiftStart } from './ShiftStart';
import { OfflineBanner, PrinterButton } from './StatusBars';
import { usePosCatalog } from './useCassaData';
import { cartTotal, openLine, useSaleQueue, type CartLine } from './useSaleQueue';

type Current = { registerId: string; sessionId: string };
type View = 'sell' | 'cart' | 'pay' | 'done' | 'recent' | 'close' | 'other';

type Props = { api: ApiFn; state: CassaState; cached: boolean; reloadState: () => Promise<void>; logout: (() => Promise<void>) | null };

/** Il turno in corso: vendita, pagamento, ultime vendite, chiusura. */
export function SellScreen({ api, state, cached, reloadState, logout }: Props) {
  const [current, setCurrent] = useState<Current | null>(null);
  const [restored, setRestored] = useState(false);
  const [view, setView] = useState<View>('sell');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sale, setSale] = useState<Sale | null>(null);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState('');
  const queue = useSaleQueue(api);
  const perms = state.permissions ?? LEGACY_CASSA_PERMISSIONS;
  const { catalog, error: catalogError, live, reload: reloadCatalog } = usePosCatalog(api, current?.registerId ?? null);

  // Ripresa del turno dopo una ricarica: vale se il turno è ancora aperto (o se siamo offline).
  useEffect(() => {
    kv.get<Current>('current').then((saved) => {
      const reg = saved && state.registers.find((r) => r.id === saved.registerId);
      if (saved && reg && (cached || reg.openSession?.id === saved.sessionId)) setCurrent(saved);
      setRestored(true);
    });
  }, [state, cached]);

  const choose = useCallback((registerId: string, sessionId: string) => {
    const c = { registerId, sessionId };
    kv.set('current', c);
    setCurrent(c);
    setView('sell');
  }, []);

  const leave = useCallback(async () => {
    await kv.set('current', null);
    setCurrent(null);
    setCart([]);
    setView('sell');
    await reloadState();
  }, [reloadState]);

  const setQty = (productId: string, quantity: number) =>
    setCart((c) => (quantity <= 0 ? c.filter((l) => l.productId !== productId) : c.map((l) => (l.productId === productId ? { ...l, quantity } : l))));

  const add = (p: PosProduct) =>
    setCart((c) => (c.some((l) => l.productId === p.id) ? c.map((l) => (l.productId === p.id ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l)) : [...c, { productId: p.id, quantity: 1 }]));

  // "Altro": stesso importo → stessa riga, una in più.
  const addOpen = (cents: number) => {
    const line = openLine(cents);
    setCart((c) => (c.some((l) => l.productId === line.productId) ? c.map((l) => (l.productId === line.productId ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l)) : [...c, line]));
    setView('sell');
  };

  async function pay(choice: PaymentChoice) {
    if (!catalog || !current) return;
    setBusy(true);
    setPayError('');
    try {
      const done = await queue.submit({ sessionId: current.sessionId, catalog, cart, ...choice });
      setSale(done);
      setCart([]);
      setView('done');
    } catch (e) {
      const err = e as CassaError;
      setPayError(err.message);
      // Esaurito o prezzo cambiato: il listino si ricarica e il carrello resta da correggere.
      if (['SOLD_OUT', 'PRICE_CHANGED', 'NOT_ON_SALE'].includes(err.code)) reloadCatalog();
      if (err.code === 'CONFLICT') reloadState();
    } finally {
      setBusy(false);
    }
  }

  if (!restored) return <Skeleton className="m-4 h-64 rounded-xl" />;
  const offline = !queue.online || cached;
  const banner = <OfflineBanner online={queue.online} pending={queue.pending} failed={queue.failed} syncing={queue.syncing} onSync={queue.flush} onRetry={queue.retry} />;

  if (!current) {
    return (
      <div className="ui-root min-h-dvh bg-bg text-fg">
        {banner}
        <Header title="Cassa" subtitle={state.user ? `${state.user.name}${state.device ? ` · ${state.device.name}` : ''}` : state.edition.title} logout={logout} />
        <main className="px-4 py-4">
          <ShiftStart api={api} state={state} onReady={choose} offline={offline} />
        </main>
      </div>
    );
  }

  const register = state.registers.find((r) => r.id === current.registerId);
  const total = catalog ? cartTotal(catalog, cart) : 0;
  const inCart = Object.fromEntries(cart.map((l) => [l.productId, l.quantity]));

  return (
    <div className="ui-root min-h-dvh bg-bg text-fg">
      {banner}
      <Header
        title={register?.name ?? 'Cassa'}
        subtitle={`${state.user?.name ?? ''}${state.user ? ' · ' : ''}${state.edition.title}`}
        live={live}
        printer={catalog ? <PrinterButton settings={catalog.register.printer} /> : null}
        logout={logout}
        menu={
          <>
            <DropdownMenuItem icon={History} onSelect={() => setView('recent')} disabled={offline}>
              Ultime vendite e annulli
            </DropdownMenuItem>
            {state.canClose && (
              <DropdownMenuItem icon={LockKeyhole} onSelect={() => setView('close')} disabled={offline}>
                Chiudi il turno
              </DropdownMenuItem>
            )}
            {!state.assignedRegister && (
              <DropdownMenuItem icon={Repeat} onSelect={leave}>
                Cambia cassa
              </DropdownMenuItem>
            )}
          </>
        }
      />
      <main className={cn('px-4 py-4', (view === 'sell' || view === 'cart') && 'pb-28 lg:pb-4')}>
        {view === 'recent' && <RecentSales api={api} sessionId={current.sessionId} state={state} onBack={() => setView('sell')} />}
        {view === 'close' && <CloseShift api={api} sessionId={current.sessionId} pendingQueue={queue.pending} canViewTotals={perms.viewTotals} onBack={() => setView('sell')} onClosed={leave} />}
        {view === 'done' && sale && catalog && (
          <SaleDone sale={sale} printer={catalog.register.printer} editionTitle={state.edition.title} operatorName={state.user?.name} canReprint={perms.reprint} onNext={() => setView('sell')} />
        )}
        {view === 'other' && catalog?.openPrice && <OpenAmount maxCents={catalog.openPrice.maxCents} onBack={() => setView('sell')} onAdd={addOpen} />}
        {view === 'pay' && <Payment totalCents={total} busy={busy} error={payError} allowComplimentary={perms.complimentary} onBack={() => setView('sell')} onConfirm={pay} />}
        {(view === 'sell' || view === 'cart') &&
          (!catalog ? (
            catalogError ? (
              <ErrorState message={catalogError} onRetry={reloadCatalog} />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-busy="true" aria-label="Caricamento dei prodotti">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            )
          ) : (
            <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="min-w-0">
                {view === 'cart' ? (
                  <div className="rounded-xl border border-border bg-surface p-4 lg:hidden">
                    <button type="button" onClick={() => setView('sell')} className="mb-1 min-h-11 text-body text-primary">
                      ← Aggiungi altri prodotti
                    </button>
                    <CartLines catalog={catalog} cart={cart} onChange={setQty} />
                  </div>
                ) : (
                  <ProductGrid products={catalog.products} inCart={inCart} onAdd={add} onOther={catalog.openPrice?.available ? () => setView('other') : undefined} />
                )}
              </div>
              <div className="hidden lg:block">
                <div className="sticky top-4">
                  <CartPanel catalog={catalog} cart={cart} totalCents={total} onChange={setQty} onClear={() => setCart([])} onPay={() => (setPayError(''), setView('pay'))} />
                </div>
              </div>
              <CartBar cart={cart} totalCents={total} onOpen={() => setView(view === 'cart' ? 'sell' : 'cart')} onPay={() => (setPayError(''), setView('pay'))} />
            </div>
          ))}
      </main>
    </div>
  );
}

type HeaderProps = { title: string; subtitle: string; live?: boolean; printer?: React.ReactNode; menu?: React.ReactNode; logout: (() => Promise<void>) | null };

function Header({ title, subtitle, live, printer, menu, logout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-4 py-2">
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 truncate text-section font-semibold">
          {title}
          {live !== undefined && <span className={cn('h-2 w-2 shrink-0 rounded-full', live ? 'bg-success' : 'bg-border-strong')} title={live ? 'Aggiornamenti in tempo reale attivi' : 'Aggiornamenti in pausa'} />}
        </h1>
        <p className="truncate text-label text-muted">{subtitle}</p>
      </div>
      {printer}
      {(menu || logout) && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-surface-sunken" aria-label="Altre azioni">
            <MoreVertical size={20} aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {menu}
            {menu && logout && <DropdownMenuSeparator />}
            {logout && (
              <DropdownMenuItem icon={LogOut} onSelect={() => logout()}>
                Esci (cambia persona)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
