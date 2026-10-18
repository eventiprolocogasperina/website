import { NextResponse } from 'next/server';
import React from 'react';
import { render } from '@react-email/render';
import { ThankYouEmailDocument } from '@/lib/tickets/ThankYouEmailDocument';
import { requireAdmin } from '@/server/auth/session';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const html = await render(React.createElement(ThankYouEmailDocument, {
      buyerName: 'Mario Rossi',
      eventId: 'assaggia-passeggia'
    }));

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error('Preview error:', error);
    return new NextResponse('Errore rendering email', { status: 500 });
  }
}
