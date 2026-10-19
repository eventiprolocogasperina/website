import { pdfHeaders, zReportPdf } from '@/server/domain/cash/pdf';
import { cassaAccess, errorResponse } from '../../../_lib';

export const dynamic = 'force-dynamic';

/** PDF della chiusura Z, da stampare dal telefono o dal tablet. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, denied } = await cassaAccess(request, 'pos.open_close_session');
  if (denied) return denied;
  try {
    const { pdf, filename } = await zReportPdf(ctx, (await params).id);
    return new Response(new Uint8Array(pdf), { headers: pdfHeaders(filename) });
  } catch (error) {
    return errorResponse(error);
  }
}
