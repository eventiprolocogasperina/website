import 'server-only';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import { CashReportDocument } from '@/lib/pdf/CashReportPdf';
import { CashZReportDocument, type ZReportData } from '@/lib/pdf/CashZReportPdf';
import type { Ctx } from '@/server/auth/context-shared';
import { DomainError } from '@/server/domain/errors';
import { cashReport, type ReportFilter } from './report';
import { sessionSummary } from './sessions';

const render = (el: ReactElement) => renderToBuffer(el as ReactElement<DocumentProps>);

/** PDF della chiusura Z di un turno chiuso: stessi dati congelati alla chiusura, sempre uguale. */
export async function zReportPdf(ctx: Ctx, sessionId: string): Promise<{ pdf: Buffer; filename: string }> {
  const s = await sessionSummary(ctx, sessionId);
  const { session } = s;
  if (!session.closedAt || session.zReportNumber === null) throw new DomainError('CONFLICT', { message: 'Il turno non è ancora chiuso: la chiusura Z non esiste.' });
  const z: ZReportData = {
    editionTitle: s.editionTitle,
    registerName: s.registerName,
    zReportNumber: session.zReportNumber,
    openedAt: session.openedAt.toISOString(),
    openedByName: s.openedByName,
    closedAt: session.closedAt.toISOString(),
    closedByName: s.closedByName,
    openingFloatCents: session.openingFloatCents,
    expectedCashCents: session.expectedCashCents ?? s.expectedCashCents,
    countedCashCents: session.countedCashCents ?? 0,
    differenceCents: session.differenceCents ?? 0,
    denominations: session.denominations ?? {},
    notes: session.notes,
    totals: s.totals,
  };
  const pdf = await render(createElement(CashZReportDocument, { z }));
  return { pdf, filename: `chiusura-z-${String(session.zReportNumber).padStart(3, '0')}-${s.editionSlug}.pdf` };
}

/** PDF del rendiconto della cassa dell'edizione. */
export async function reportPdf(ctx: Ctx, slug: string, filter: ReportFilter): Promise<{ pdf: Buffer; filename: string }> {
  const report = await cashReport(ctx, slug, filter);
  const pdf = await render(createElement(CashReportDocument, { report, generatedAt: new Date().toISOString() }));
  return { pdf, filename: `rendiconto-cassa-${slug}.pdf` };
}

export const pdfHeaders = (filename: string, download = false) => ({
  'Content-Type': 'application/pdf',
  'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
  'Cache-Control': 'private, no-store',
});
