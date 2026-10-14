import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { ScannerGuideDocument } from '@/lib/manuals/ScannerGuidePdf';
import { CashierGuideDocument } from '@/lib/manuals/CashierGuidePdf';
import { createElement } from 'react';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;

    if (type === 'scanner' || type === 'scanner-biglietti') {
      const pdfBuffer = await renderToBuffer(createElement(ScannerGuideDocument) as any);
      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="guida-scanner-biglietti.pdf"',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    if (type === 'cassa' || type === 'cashier') {
      const pdfBuffer = await renderToBuffer(createElement(CashierGuideDocument) as any);
      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="guida-cassa.pdf"',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return NextResponse.json({ error: 'Manuale non trovato' }, { status: 404 });
  } catch (error: any) {
    console.error('Error generating PDF manual on-the-fly:', error);
    return NextResponse.json({ error: 'Errore durante la generazione del PDF' }, { status: 500 });
  }
}
