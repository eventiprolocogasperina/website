'use client';

import { Ban, Banknote, CalendarClock, CheckCircle2, FileDown, Link2, MoreHorizontal, Send, Undo2, UserPen, XCircle } from 'lucide-react';
import { useState } from 'react';
import { resendTicketsAction } from '@/app/admin/(org)/ordini/actions';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, IconButton, toast } from '@/components/ui';
import type { OrderEditionContext } from '@/server/domain/orders/admin-context';
import type { OrderDetail } from '@/server/domain/orders/admin-detail';
import { NewOrderSheet } from '../NewOrderSheet';
import { ConfirmDraftDialog } from './ConfirmDraftDialog';
import { BlacklistDialog, CancelDialog, EditCustomerDialog, MarkPaidDialog, MoveSessionDialog, PaylinkDialog } from './OrderDialogs';
import { RefundDialog } from './RefundDialog';

// Azioni dell'ordine (§10.5): "Reinvia biglietti" in evidenza, il resto nel menu ⋯ con le azioni
// dei moduli (punto di estensione orderActions). Ogni voce compare solo con il permesso.

type Open = 'customer' | 'refund' | 'cancel' | 'blacklist' | 'paid' | 'move-session' | 'paylink' | 'confirm' | null;

/** Azioni di modulo con una finestra qui sotto: la chiave è quella dichiarata dal modulo in orderActions. */
const MODULE_ACTION_ICONS: Record<string, typeof Send> = { 'move-session': CalendarClock, paylink: Link2 };

export function OrderActions({ d, paylinkProducts, draftContext }: { d: OrderDetail; paylinkProducts: Array<{ id: string; name: string; priceCents: number }>; draftContext?: OrderEditionContext | null }) {
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState(false);
  const status = d.order.status;
  const isDraft = status === 'draft';
  const canResend = d.can.resend && (status === 'paid' || status === 'partially_refunded');
  const close = () => setOpen(null);

  async function resend() {
    setBusy(true);
    const res = await resendTicketsAction(d.order.id);
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(d.customer ? `Biglietti in invio a ${d.customer.email}` : 'Biglietti reinviati');
  }

  const core = [
    d.can.edit && { key: 'customer', label: 'Modifica cliente', icon: UserPen },
    d.can.markPaid && status === 'pending' && { key: 'paid', label: 'Segna come pagato', icon: Banknote },
    d.can.refund && d.summary.refundableCents > 0 && { key: 'refund', label: 'Rimborsa', icon: Undo2 },
    d.can.cancel && (isDraft || status === 'pending' || status === 'paid' || status === 'partially_refunded') && { key: 'cancel', label: isDraft ? 'Annulla bozza' : 'Annulla ordine', icon: XCircle, danger: true },
    d.can.edit && { key: 'blacklist', label: d.order.isBlacklisted ? 'Togli dalla blacklist' : 'Metti in blacklist', icon: Ban, danger: !d.order.isBlacklisted },
  ].filter(Boolean) as Array<{ key: Exclude<Open, null>; label: string; icon: typeof Send; danger?: boolean }>;
  // Le azioni dei moduli (pay-link, sposta data) valgono per ordini confermati, non per le bozze.
  const modules = isDraft ? [] : d.moduleActions.filter((a) => a.key in MODULE_ACTION_ICONS);

  return (
    <>
      {isDraft && d.can.edit && draftContext && (
        <NewOrderSheet
          context={draftContext}
          draft={{
            orderId: d.order.id,
            lines: d.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, sessionId: l.sessionId })),
            sessionId: d.order.sessionId,
            customer: d.customer ? { name: d.customer.name ?? '', email: d.customer.email, phone: d.customer.phone ?? '' } : null,
            discountCode: d.order.discountCode,
          }}
        />
      )}
      {isDraft && d.can.edit && (
        <Button icon={CheckCircle2} onClick={() => setOpen('confirm')}>
          Conferma ordine
        </Button>
      )}
      {canResend && (
        <Button variant="secondary" icon={Send} loading={busy} onClick={resend}>
          Reinvia biglietti
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton icon={MoreHorizontal} label="Altre azioni" variant="secondary" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {core.map((a) => (
            <DropdownMenuItem key={a.key} icon={a.icon} tone={a.danger ? 'danger' : 'default'} onSelect={() => setOpen(a.key)}>
              {a.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem icon={FileDown} disabled>
            Scarica PDF (con il checkout nuovo)
          </DropdownMenuItem>
          {modules.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Moduli</DropdownMenuLabel>
              {modules.map((a) => (
                <DropdownMenuItem key={a.key} icon={MODULE_ACTION_ICONS[a.key]} tone={a.destructive ? 'danger' : 'default'} onSelect={() => setOpen(a.key as Open)}>
                  {a.label}
                </DropdownMenuItem>
              ))}
            </>
          )}
          {core.length === 0 && modules.length === 0 && (
            <DropdownMenuLabel className="font-normal text-muted">{d.edition.readOnly ? 'Edizione archiviata: solo lettura' : 'Nessuna azione disponibile'}</DropdownMenuLabel>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {open === 'customer' && <EditCustomerDialog d={d} onClose={close} />}
      {open === 'refund' && <RefundDialog d={d} onClose={close} />}
      {open === 'cancel' && <CancelDialog d={d} onClose={close} />}
      {open === 'blacklist' && <BlacklistDialog d={d} onClose={close} />}
      {open === 'paid' && <MarkPaidDialog d={d} onClose={close} />}
      {open === 'move-session' && <MoveSessionDialog d={d} onClose={close} />}
      {open === 'confirm' && <ConfirmDraftDialog d={d} canCash={d.can.markPaid} onClose={close} />}
      {open === 'paylink' && <PaylinkDialog d={d} products={paylinkProducts} onClose={close} />}
    </>
  );
}
