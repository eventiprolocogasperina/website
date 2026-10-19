import { NextResponse } from 'next/server';
import { verifyTicketByQR } from '@/lib/data/tickets';
import { requireCheckin } from '@/server/auth/context';

export async function POST(request: Request) {
  const denied = (await requireCheckin('checkin.scan')).denied;
  if (denied) return denied;
  try {
    const { qrCodeData } = await request.json();

    if (!qrCodeData) {
      return NextResponse.json({ success: false, message: 'QR Code mancante' }, { status: 400 });
    }

    const result = await verifyTicketByQR(qrCodeData);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Ticket verification error:', error);
    return NextResponse.json({ success: false, message: 'Errore interno del server' }, { status: 500 });
  }
}
