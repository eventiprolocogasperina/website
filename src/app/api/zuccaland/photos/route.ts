import { NextResponse } from 'next/server';
import { getPhotosByStatus } from '@/lib/data/zuccaland_photos';

/**
 * GET /api/zuccaland/photos
 * Returns only approved photos for the public gallery.
 */
export async function GET() {
  try {
    const photos = await getPhotosByStatus('approved');
    return NextResponse.json(photos);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

