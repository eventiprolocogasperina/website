import 'server-only';
import { NextResponse } from 'next/server';
import { refundMethodLabel } from '@/lib/admin/order-labels';
import { csvMoney, csvResponse, toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/dates';
import { authorize } from '@/server/auth/context';
import { isDomainError } from '@/server/domain/errors';
import { exportApprovedRefunds } from '@/server/domain/refunds/admin';

/**
 * CSV dei bonifici da fare (rimborsi approvati con bonifico), da caricare a mano nell'home banking.
 * L'IBAN è intero solo con refunds.view_iban su tutte le edizioni esportate; l'esportazione resta nel
 * registro. Il formato SEPA XML (pain.001) è una domanda aperta: vedi docs/admin-ordini.md.
 */
export async function refundsCsv(edition: string | null): Promise<Response> {
  const { ctx, denied } = await authorize('reports.export', edition ? { edition } : {});
  if (denied) return denied;
  try {
    const { rows, fullIban } = await exportApprovedRefunds(ctx, edition);
    const body = toCsv(
      ['Ordine', 'Edizione', 'Richiesto', 'Intestatario', 'IBAN', 'Importo', 'Metodo', 'Causale', 'Email cliente'],
      rows.map((r) => [r.orderCode, r.editionTitle, formatDateTime(r.requestedAt), r.holderName, fullIban ? r.ibanFull : r.iban, csvMoney(r.amountCents), refundMethodLabel(r.method), `Rimborso ordine ${r.orderCode}`, r.customerEmail]),
    );
    return csvResponse(body, `bonifici_rimborsi_${edition ?? 'tutte'}_${new Date().toISOString().slice(0, 10)}.csv`);
  } catch (error) {
    if (isDomainError(error) && error.code === 'FORBIDDEN') return NextResponse.json({ error: 'Non hai i permessi per questa operazione' }, { status: 403 });
    throw error;
  }
}
