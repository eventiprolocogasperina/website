import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { BookingManifestPdfDocument } from '@/lib/pdf/BookingManifestPdf';
import { type OrderWithTickets } from '@/lib/data/tickets';
import { requireAdmin } from '@/server/auth/session';

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await request.json();
    const orders = (body.orders || []) as OrderWithTickets[];
    const title = body.title || 'REGISTRO PRENOTAZIONI & PRESENZE';
    const subtitle = body.subtitle || '';

    const pdfBuffer = await renderToBuffer(
      createElement(BookingManifestPdfDocument, { orders, title, subtitle }) as any
    );

    const safeTitle = (subtitle || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const filename = `registro-presenze-${safeTitle || 'prenotazioni'}-${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Failed to generate Booking Manifest PDF:', err);
    return NextResponse.json({ error: err.message || 'Errore durante la generazione del PDF' }, { status: 500 });
  }
}
