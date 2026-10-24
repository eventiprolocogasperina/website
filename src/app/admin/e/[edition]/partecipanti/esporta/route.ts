import { renderToBuffer } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import { createElement } from 'react';
import { STATUS_META } from '@/components/ui/StatusBadge';
import { csvResponse, toCsv } from '@/lib/csv';
import { formatDateTime } from '@/lib/dates';
import { ManifestPdfDocument } from '@/lib/pdf/manifest/ManifestPdf';
import { authorize } from '@/server/auth/context';
import { listAttendees, manifestFor } from '@/server/domain/orders/attendees';
import { log } from '@/server/log';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Registro presenze dell'edizione: `formato=pdf` (un foglio per giorno, in ordine di cognome, lo
 * stesso disegno di oggi) o `formato=csv` (un biglietto per riga con risposte e ingresso).
 */
export async function GET(req: Request, { params }: { params: Promise<{ edition: string }> }) {
  const { edition } = await params;
  const { ctx, denied } = await authorize('reports.export', { edition });
  if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const session = sp.get('sessione') && UUID.test(sp.get('sessione')!) ? sp.get('sessione')! : null;
  const day = new Date().toISOString().slice(0, 10);
  try {
    if (sp.get('formato') === 'pdf') {
      const m = await manifestFor(ctx, edition, session);
      const pdf = await renderToBuffer(
        createElement(ManifestPdfDocument, {
          groups: m.groups,
          title: m.edition.title,
          subtitle: `Generato il ${m.generatedAt}`,
          layout: m.layout,
          activityColumns: m.activityColumns,
          labLabel: m.labLabel,
        }) as Parameters<typeof renderToBuffer>[0],
      );
      return new NextResponse(new Uint8Array(pdf), {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="registro-presenze-${edition}-${day}.pdf"`, 'Cache-Control': 'no-store' },
      });
    }
    const { rows } = await listAttendees(ctx, edition, { q: '', session: session ?? '', checkin: '', page: 0 }, { all: true });
    const body = toCsv(
      ['Partecipante', 'Ordine', 'Stato ordine', 'Biglietto', 'Sessione', 'Email', 'Telefono', 'Risposte', 'Entrato alle', 'Varco'],
      rows.map((r) => [r.name, r.orderCode, (STATUS_META as Record<string, { label: string }>)[r.orderStatus]?.label ?? r.orderStatus, r.productName, r.sessionLabel, r.email, r.phone, r.answers, r.checkedInAt ? formatDateTime(r.checkedInAt) : '', r.checkinList]),
    );
    return csvResponse(body, `partecipanti_${edition}_${day}.csv`);
  } catch (error) {
    log.error('Esportazione partecipanti non riuscita', { error });
    return NextResponse.json({ error: 'Esportazione non riuscita. Riprova tra poco.' }, { status: 500 });
  }
}
