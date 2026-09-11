import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getOrder } from '@/lib/data/tickets';
import { TicketPdfDocument, generateQrDataUri } from '@/lib/tickets/TicketPdfDocument';
import { createElement } from 'react';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status !== 'PAID') {
    return NextResponse.json({ error: 'Order not paid' }, { status: 403 });
  }

  // Generate QR code data URIs for each ticket
  const qrDataUris: Record<string, string> = {};
  for (const ticket of order.tickets) {
    qrDataUris[ticket.id] = await generateQrDataUri(ticket.qrCodeData);
  }

  const isZuccaland = order.tickets.some(t => t.eventId?.includes('zuccaland'));

  // Read logos
  const eventLogoPath = isZuccaland 
    ? path.join(process.cwd(), 'public/img/zuccaland/Logo.png')
    : path.join(process.cwd(), 'public/img/LOGO_ap_ga.png');
  const proLocoLogoPath = path.join(process.cwd(), 'public/img/logo_white_fg.png');
  const eventLogoBase64 = fs.existsSync(eventLogoPath) ? `data:image/png;base64,${fs.readFileSync(eventLogoPath).toString('base64')}` : undefined;
  const proLocoLogoBase64 = fs.existsSync(proLocoLogoPath) ? `data:image/png;base64,${fs.readFileSync(proLocoLogoPath).toString('base64')}` : undefined;

  const pdfBuffer = await renderToBuffer(
    createElement(TicketPdfDocument, { order, qrDataUris, eventLogoBase64, proLocoLogoBase64 }) as any
  );

  const orderRef = order.id.replace(/-/g, '').substring(0, 8).toUpperCase();
  const filename = `biglietti-${isZuccaland ? 'zuccaland' : 'assaggia-passeggia'}-${orderRef}.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
