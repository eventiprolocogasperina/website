import { NextResponse } from 'next/server';
import { csvResponse } from '@/lib/csv';
import { authorize } from '@/server/auth/context';
import { latestFinalReport } from '@/server/domain/editions/final-report';

export const dynamic = 'force-dynamic';

/** Rendiconto finale più recente: /admin/e/<edizione>/rendiconto/rendiconto.pdf oppure .csv. Solo numeri aggregati. */
export async function GET(_req: Request, { params }: { params: Promise<{ edition: string; file: string }> }) {
  const { edition, file } = await params;
  const { ctx, denied } = await authorize('reports.export', { edition });
  if (denied) return denied;
  const report = await latestFinalReport(ctx, edition);
  if (!report) return NextResponse.json({ error: 'Rendiconto non ancora generato.' }, { status: 404 });
  const name = `rendiconto-${edition}`;
  if (file === 'rendiconto.csv') return csvResponse(report.csv, `${name}.csv`);
  if (file !== 'rendiconto.pdf') return NextResponse.json({ error: 'File non trovato.' }, { status: 404 });
  return new Response(Buffer.from(report.pdfBase64, 'base64'), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${name}.pdf"`, 'Cache-Control': 'no-store' },
  });
}
