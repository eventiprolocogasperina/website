import { NextResponse } from 'next/server';
import { getAdminCtx } from '@/server/auth/context';
import { pdfHeaders, zReportPdf } from '@/server/domain/cash/pdf';
import { toErrorBody } from '@/server/domain/errors';

export const dynamic = 'force-dynamic';

/** PDF di una chiusura Z dall'admin (Cassa › Turni). Il permesso lo controlla il servizio (reports.export). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAdminCtx();
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  try {
    const { pdf, filename } = await zReportPdf(ctx, (await params).id);
    return new Response(new Uint8Array(pdf), { headers: pdfHeaders(filename) });
  } catch (error) {
    const { status, body } = toErrorBody(error);
    return NextResponse.json(body, { status });
  }
}
