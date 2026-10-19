import { NextResponse } from 'next/server';
import { authorize } from '@/server/auth/context';
import { pdfHeaders, reportPdf } from '@/server/domain/cash/pdf';
import { cashReport, reportCsv } from '@/server/domain/cash/report';
import { toErrorBody } from '@/server/domain/errors';

export const dynamic = 'force-dynamic';

/** Rendiconto della cassa: `?formato=pdf` oppure `csv`, con `dal` e `al` facoltativi (AAAA-MM-GG). */
export async function GET(request: Request, { params }: { params: Promise<{ edition: string }> }) {
  const slug = (await params).edition;
  const { ctx, denied } = await authorize('reports.export', { edition: slug });
  if (denied) return denied;
  const url = new URL(request.url);
  const filter = { from: url.searchParams.get('dal'), to: url.searchParams.get('al') };
  try {
    if (url.searchParams.get('formato') === 'csv') {
      const csv = reportCsv(await cashReport(ctx, slug, filter));
      return new Response(csv, {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="rendiconto-cassa-${slug}.csv"`, 'Cache-Control': 'private, no-store' },
      });
    }
    const { pdf, filename } = await reportPdf(ctx, slug, filter);
    return new Response(new Uint8Array(pdf), { headers: pdfHeaders(filename, true) });
  } catch (error) {
    const { status, body } = toErrorBody(error);
    return NextResponse.json(body, { status });
  }
}
