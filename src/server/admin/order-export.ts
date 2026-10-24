import 'server-only';
import { NextResponse } from 'next/server';
import { CHANNEL_LABELS, parseOrderFilters, type OrderChannelKey } from '@/lib/admin/order-filters';
import { csvMoney, csvResponse, toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/dates';
import { STATUS_META } from '@/components/ui/StatusBadge';
import { authorize } from '@/server/auth/context';
import { isDomainError } from '@/server/domain/errors';
import { exportOrders } from '@/server/domain/orders/admin-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statusLabel = (s: string) => (STATUS_META as Record<string, { label: string }>)[s]?.label ?? s;

/**
 * CSV degli ordini con gli stessi filtri dell'elenco (o solo gli ordini selezionati, `ids`).
 * Contiene dati personali: serve la sessione admin con reports.export (e orders.read nel servizio).
 */
export async function ordersCsv(req: Request, edition: string | null): Promise<Response> {
  const { ctx, denied } = await authorize('reports.export', edition ? { edition } : {});
  if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const ids = (sp.get('ids') ?? '').split(',').filter((id) => UUID.test(id)).slice(0, 500);
  try {
    const rows = await exportOrders(ctx, edition, parseOrderFilters(sp), ids);
    const body = toCsv(
      ['Codice', 'Creato', 'Pagato', 'Edizione', 'Sessione', 'Canale', 'Stato', 'Cliente', 'Email', 'Telefono', 'Prodotti', 'Subtotale', 'Sconto', 'Totale', 'Biglietti', 'Entrati', 'Blacklist'],
      rows.map((r) => [
        r.code,
        formatDateTime(r.createdAt),
        r.paidAt ? formatDateTime(r.paidAt) : '',
        r.edition,
        r.session,
        CHANNEL_LABELS[r.channel as OrderChannelKey] ?? r.channel,
        statusLabel(r.status),
        r.name,
        r.email,
        r.phone,
        r.lines,
        csvMoney(r.subtotalCents),
        csvMoney(r.discountCents),
        csvMoney(r.totalCents),
        r.tickets,
        r.checkedIn,
        r.blacklisted,
      ]),
    );
    return csvResponse(body, `ordini_${edition ?? 'tutte'}_${new Date().toISOString().slice(0, 10)}.csv`);
  } catch (error) {
    if (isDomainError(error) && error.code === 'FORBIDDEN') return NextResponse.json({ error: 'Non hai i permessi per questa operazione' }, { status: 403 });
    throw error;
  }
}
