import { NextResponse } from 'next/server';
import { getAllPhotos } from '@/lib/data/zuccaland_photos';
import { requirePermission } from '@/server/auth/context';

export async function GET() {
  const denied = await requirePermission('photos.moderate');
  if (denied) return denied;
  try {
    const photos = await getAllPhotos();
    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error fetching admin photos:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
