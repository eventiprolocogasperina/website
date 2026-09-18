import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get('data') || searchParams.get('code');

  if (!data) {
    return new NextResponse('Missing QR data', { status: 400 });
  }

  try {
    const dataUri = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 320,
      color: {
        dark: '#1a1a1a',
        light: '#ffffff',
      },
    });

    const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error generating QR PNG:', error);
    return new Response(String((error as any)?.stack || error), { status: 500 });
  }
}
