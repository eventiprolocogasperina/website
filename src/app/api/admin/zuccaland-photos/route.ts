import { NextResponse } from 'next/server';
import { getAllPhotos } from '@/lib/data/zuccaland_photos';
import { requireAdmin } from '@/server/auth/session';

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const photos = await getAllPhotos();
    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error fetching admin photos:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
